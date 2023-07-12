use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};
use std::convert::TryInto;

use crate::state::{
    accounts::{Build, ItemClassV1},
    errors::ErrorCode,
    is_signer, BuildStatus, NoopProgram,
};

#[derive(Accounts)]
pub struct CompleteBuildItem<'info> {
    pub item_mint: Box<Account<'info, token::Mint>>,

    #[account(
        constraint = item_class.items.eq(&item_class_items.key()),
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    /// CHECK: checked by spl-account-compression
    pub item_class_items: UncheckedAccount<'info>,

    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, constraint = is_signer(&payer.key()))]
    pub payer: Signer<'info>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteBuildItemArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CompleteBuildItem<'info>>,
    args: CompleteBuildItemArgs,
) -> Result<()> {
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

    // set the item mint that will be received
    // TODO: we will want to change how this works in the future

    // verify mint exists in the items tree
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
        ctx.accounts.item_mint.key().as_ref().try_into().unwrap(),
        args.leaf_index,
    )?;

    // set the item mint in the build pda
    let build = &mut ctx.accounts.build;
    build.add_output_item(ctx.accounts.item_mint.key(), 1);

    Ok(())
}
