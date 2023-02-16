use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::ItemClassV1;

#[derive(Accounts)]
pub struct CreateItemClassV1<'info> {
    pub item_class_mint: Account<'info, token::Mint>,

    #[account(init, payer = authority, space = ItemClassV1::SPACE, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}
