use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{state::{SchemaV1, ItemClassV1}};

#[derive(Accounts)]
#[instruction(component_count: usize)]
pub struct CreateSchema<'info> {
    #[account(init, payer = authority, space = SchemaV1::space(component_count), seeds = [SchemaV1::PREFIX.as_bytes(), item_class_mint.key().as_ref(), &item_class.schema_index.to_le_bytes()], bump)]
    pub schema: Account<'info, SchemaV1>,

    pub item_class_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_ata.amount > 0,
        associated_token::mint = item_class_mint, associated_token::authority = authority)]
    pub item_class_ata: Account<'info, token::TokenAccount>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}
