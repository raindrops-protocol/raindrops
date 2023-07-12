use std::convert::TryInto;

use anchor_lang::prelude::*;
use spl_account_compression::{
    cpi::{accounts::Modify, append},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{ItemClassV1, Pack},
    NoopProgram,
};

#[derive(Accounts)]
#[instruction(args: AddPackToItemClassArgs)]
pub struct AddPackToItemClass<'info> {
    #[account(init,
        payer = authority,
        space = Pack::SPACE,
        seeds = [Pack::PREFIX.as_bytes(), item_class.key().as_ref(), &item_class.output_mode.get_index().unwrap().to_le_bytes()], bump)]
    pub pack: Account<'info, Pack>,

    #[account(
        has_one = authority,
        has_one = items,
        constraint = item_class.output_mode.is_pack(),
        seeds = [ItemClassV1::PREFIX.as_bytes(), items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    /// CHECK: done by spl-account-compression
    #[account(mut)]
    pub items: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AddPackToItemClassArgs {
    pub contents_hash: [u8; 32],
}

pub fn handler(ctx: Context<AddPackToItemClass>, args: AddPackToItemClassArgs) -> Result<()> {
    // set pack contents and metadata
    ctx.accounts.pack.set_inner(Pack {
        contents_hash: args.contents_hash,
        item_class: ctx.accounts.item_class.key(),
        id: ctx.accounts.item_class.output_mode.get_index().unwrap(),
    });

    // increment pack index
    ctx.accounts
        .item_class
        .output_mode
        .increment_index()
        .unwrap();

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
                ItemClassV1::PREFIX.as_bytes(),
                ctx.accounts.items.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        ctx.accounts.pack.key().as_ref().try_into().unwrap(),
    )
}
