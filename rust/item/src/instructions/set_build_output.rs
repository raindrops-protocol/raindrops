use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};

use crate::state::{errors::ErrorCode, Build, ItemClassV1, NoopProgram, Schema};

#[derive(Accounts)]
pub struct SetBuildOutput<'info> {
    pub item_mint: Box<Account<'info, token::Mint>>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_items.key().as_ref()], bump)]
    pub item_class: Box<Account<'info, ItemClassV1>>,

    /// CHECK: checked by spl-account-compression
    pub item_class_items: UncheckedAccount<'info>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SetBuildOutputArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SetBuildOutput<'info>>,
    args: SetBuildOutputArgs,
) -> Result<()> {
    // check that the build is complete
    // TODO: convert these bools into a build stages enum
    require!(
        ctx.accounts.build.complete && !ctx.accounts.build.item_distributed,
        ErrorCode::BuildIncomplete
    );

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

    // set the item mint as the output mint for the build
    let build = &mut ctx.accounts.build;
    build.output_mint = Some(ctx.accounts.item_mint.key());

    Ok(())
}
