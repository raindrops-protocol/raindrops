use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::Modify, append},
    program::SplAccountCompression,
};

use crate::state::{accounts::ItemClass, NoopProgram};

#[derive(Accounts)]
pub struct AddItemToItemClass<'info> {
    pub item_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class.items.unwrap().eq(&items.key()),
        constraint = item_class.authority_mint.eq(&item_class_authority_mint.key()),
        constraint = item_class.output_mode.is_item(),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class_authority_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mint::authority = item_class)]
    pub item_class_authority_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_authority_mint_ata.amount >= 1,
        associated_token::mint = item_class_authority_mint, associated_token::authority = authority)]
    pub item_class_authority_mint_ata: Account<'info, token::TokenAccount>,

    /// CHECK: done by spl-account-compression
    #[account(mut)]
    pub items: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

pub fn handler(ctx: Context<AddItemToItemClass>) -> Result<()> {
    let append_accounts = Modify {
        merkle_tree: ctx.accounts.items.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
        noop: ctx.accounts.log_wrapper.to_account_info(),
    };

    append(
        CpiContext::new_with_signer(
            ctx.accounts.account_compression.to_account_info(),
            append_accounts,
            &[&[
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.items.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        ctx.accounts.item_mint.key().as_ref().try_into().unwrap(),
    )
}
