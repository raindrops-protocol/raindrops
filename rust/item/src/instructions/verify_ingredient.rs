use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{Build, ItemClassV1},
    NoopProgram,
};

#[derive(Accounts)]
pub struct VerifyIngredient<'info> {
    pub ingredient_mint: Box<Account<'info, token::Mint>>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), ingredient_item_class_items.key().as_ref()], bump)]
    pub ingredient_item_class: Box<Account<'info, ItemClassV1>>,

    /// CHECK: checked by spl-account-compression
    pub ingredient_item_class_items: UncheckedAccount<'info>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyIngredientArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, VerifyIngredient<'info>>,
    args: VerifyIngredientArgs,
) -> Result<()> {
    // verify mint exists in the items tree
    let verify_item_accounts = VerifyLeaf {
        merkle_tree: ctx.accounts.ingredient_item_class_items.to_account_info(),
    };

    verify_leaf(
        CpiContext::new(
            ctx.accounts.account_compression.to_account_info(),
            verify_item_accounts,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        args.root,
        ctx.accounts
            .ingredient_mint
            .key()
            .as_ref()
            .try_into()
            .unwrap(),
        args.leaf_index,
    )?;

    // set the verified mint in the build data
    let build_account = &ctx.accounts.build.to_account_info();
    ctx.accounts.build.add_ingredient(
        ctx.accounts.ingredient_mint.key(),
        &ctx.accounts.ingredient_item_class.key(),
        build_account,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    )
}
