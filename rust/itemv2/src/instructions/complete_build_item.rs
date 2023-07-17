use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};
use std::convert::TryInto;

use crate::state::{
    accounts::{Build, BuildPermit, ItemClass, Recipe},
    errors::ErrorCode,
    is_signer, BuildStatus, NoopProgram,
};

#[derive(Accounts)]
pub struct CompleteBuildItem<'info> {
    pub item_mint: Box<Account<'info, token::Mint>>,

    #[account(
        constraint = item_class.items.eq(&item_class_items.key()),
        constraint = item_class.output_mode.is_item(),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class_items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    /// CHECK: checked by spl-account-compression
    pub item_class_items: UncheckedAccount<'info>,

    #[account(
        has_one = item_class,
        seeds = [Recipe::PREFIX.as_bytes(), &recipe.recipe_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(mut,
        has_one = recipe,
        constraint = build_permit.builder.eq(&build.builder.key()),
        seeds = [BuildPermit::PREFIX.as_bytes(), build.builder.key().as_ref(), recipe.key().as_ref()], bump)]
    pub build_permit: Option<Account<'info, BuildPermit>>,

    #[account(mut,
        constraint = recipe.recipe_index == build.recipe_index,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, constraint = is_signer(&payer.key()))]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,

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
    // check build requirements are met
    ctx.accounts.build.validate_build_criteria()?;

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

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

    // add output item to build pda
    let build_account = &ctx.accounts.build.to_account_info();
    ctx.accounts.build.add_output_item(
        ctx.accounts.item_mint.key(),
        1,
        build_account,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    )?;

    // if build permit is in use we must decrement the remaining builds
    if ctx.accounts.build.build_permit_in_use {
        match &mut ctx.accounts.build_permit {
            Some(build_permit) => {
                // decrement the remaining builds this build permit is allowed
                build_permit.remaining_builds -= 1;

                // if remaining builds are now 0, lets close the PDA
                if build_permit.remaining_builds == 0 {
                    ctx.accounts
                        .build_permit
                        .close(ctx.accounts.payer.to_account_info())?;
                }
            }
            None => return Err(ErrorCode::BuildPermitRequired.into()),
        }
    }

    Ok(())
}
