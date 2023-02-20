use std::convert::TryInto;

use anchor_lang::{prelude::*, solana_program::keccak::hashv};
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::Modify, append},
    program::SplAccountCompression,
};

use crate::state::{ItemClassV1, NoopProgram};

#[derive(Accounts)]
pub struct AddItemToItemClass<'info> {
    pub item_mint: Account<'info, token::Mint>,

    #[account(
        has_one = authority,
        seeds = [ItemClassV1::PREFIX.as_bytes(), items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    /// CHECK: done by spl-account-compression
    #[account(mut)]
    pub items: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub noop: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

pub fn handler(ctx: Context<AddItemToItemClass>) -> Result<()> {
    let insert_or_append_accounts = Modify {
        merkle_tree: ctx.accounts.items.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
        noop: ctx.accounts.noop.to_account_info(),
    };

    //let node = hashv(&[ctx.accounts.item_mint.key().as_ref()]);

    append(
        CpiContext::new_with_signer(
            ctx.accounts.account_compression.to_account_info(),
            insert_or_append_accounts,
            &[&[
                ItemClassV1::PREFIX.as_bytes(),
                ctx.accounts.items.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        ctx.accounts.item_mint.key().as_ref().try_into().unwrap(),
    )?;

    Ok(())

    // TODO: emit event for the indexer
}
