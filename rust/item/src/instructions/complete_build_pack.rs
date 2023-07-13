use anchor_lang::prelude::*;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};
use std::convert::TryInto;

use crate::state::{
    accounts::{Build, BuildPermit, ItemClassV1, Pack},
    errors::ErrorCode,
    is_signer, BuildStatus, NoopProgram, PackContents,
};

#[derive(Accounts)]
pub struct CompleteBuildPack<'info> {
    #[account(mut,
        has_one = item_class,
        seeds = [Pack::PREFIX.as_bytes(), item_class.key().as_ref(), &pack.id.to_le_bytes()], bump
    )]
    pub pack: Box<Account<'info, Pack>>,

    #[account(
        constraint = item_class.items.eq(&item_class_items.key()),
        constraint = item_class.output_mode.is_pack(),
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    /// CHECK: checked by spl-account-compression
    pub item_class_items: UncheckedAccount<'info>,

    #[account(mut,
        has_one = item_class,
        constraint = build_permit.wallet.eq(&build.builder.key()),
        seeds = [BuildPermit::PREFIX.as_bytes(), build.builder.key().as_ref(), item_class.key().as_ref()], bump)]
    pub build_permit: Option<Account<'info, BuildPermit>>,

    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, constraint = is_signer(&payer.key()))]
    pub payer: Signer<'info>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteBuildPackArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
    pub pack_contents: PackContents,
    pub pack_contents_hash_nonce: [u8; 16],
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CompleteBuildPack<'info>>,
    args: CompleteBuildPackArgs,
) -> Result<()> {
    // check pack is unopened and set it to opened
    require!(!ctx.accounts.pack.opened, ErrorCode::PackAlreadyOpened);
    ctx.accounts.pack.opened = true;

    // check the build is in progress before running completion steps
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // check build requirements are met
    let build_requirements_met = ctx
        .accounts
        .build
        .ingredients
        .iter()
        .all(|ingredient| ingredient.current_amount >= ingredient.required_amount);
    require!(build_requirements_met, ErrorCode::MissingIngredient);

    // check payment has been made
    match &ctx.accounts.build.payment {
        Some(payment) => {
            require!(payment.paid, ErrorCode::BuildNotPaid);
        }
        None => {}
    }

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

    // verify pack exists in the items tree
    let verify_item_accounts = VerifyLeaf {
        merkle_tree: ctx.accounts.item_class_items.to_account_info(),
    };

    verify_leaf(
        CpiContext::new(
            ctx.accounts.account_compression.to_account_info(),
            verify_item_accounts,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        args.root,
        ctx.accounts.pack.key().as_ref().try_into().unwrap(),
        args.leaf_index,
    )?;

    // check that the pack_contents hash matches the one stored in the pack pda
    let args_hash = args
        .pack_contents
        .hash_pack_contents(&args.pack_contents_hash_nonce);
    let pda_hash = &ctx.accounts.pack.contents_hash;
    require!(args_hash.eq(pda_hash), ErrorCode::InvalidPackContents);

    // set the output data for this build based on the chosen pack
    let build = &mut ctx.accounts.build;
    for entry in &args.pack_contents.entries {
        build.add_output_item(entry.mint, entry.amount);
    }

    // if build permit is in use we must decrement the remaining builds
    if build.build_permit_in_use {
        match &mut ctx.accounts.build_permit {
            Some(build_permit) => {
                // decrement the remaining builds this build permit is allowed
                build_permit.remaining_builds -= 1;
            }
            None => return Err(ErrorCode::BuildPermitRequired.into()),
        }
    }

    Ok(())
}
