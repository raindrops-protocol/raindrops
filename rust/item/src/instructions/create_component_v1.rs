use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{ComponentV1, ItemClassV1};

#[derive(Accounts)]
pub struct CreateComponentV1<'info> {
    pub component_mint: Account<'info, token::Mint>,

    #[account(init, payer = authority, space = ComponentV1::SPACE, seeds = [ComponentV1::PREFIX.as_bytes(), item_class_mint.key().as_ref(), component_mint.key().as_ref()], bump)]
    pub component: Account<'info, ComponentV1>,

    pub item_class_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_ata.amount > 0,
        associated_token::mint = item_class_mint, associated_token::authority = authority)]
    pub item_class_ata: Account<'info, token::TokenAccount>,

    #[account(seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}
