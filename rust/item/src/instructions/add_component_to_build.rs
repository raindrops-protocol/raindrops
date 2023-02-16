use anchor_lang::prelude::*;
use anchor_spl::{token, associated_token};

use crate::state::{BuildEscrow, SchemaV1, ItemClassV1, ComponentV1};

#[derive(Accounts)]
#[instruction(schema_index: u64)]
pub struct AddComponentToBuild<'info> {
    pub component_mint: Account<'info, token::Mint>,

    #[account(associated_token::mint = component_mint, associated_token::authority = builder)]
    pub component_source: Account<'info, token::TokenAccount>,

    #[account(seeds = [ComponentV1::PREFIX.as_bytes(), item_class_mint.key().as_ref(), component_mint.key().as_ref()], bump)]
    pub component: Account<'info, ComponentV1>,

    #[account(seeds = [BuildEscrow::PREFIX.as_bytes(), item_class_mint.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build_escrow: Account<'info, BuildEscrow>,

    #[account(init_if_needed, payer = builder, associated_token::mint = component_mint, associated_token::authority = build_escrow)]
    pub component_escrow_destination: Account<'info, token::TokenAccount>,

    #[account(seeds = [SchemaV1::PREFIX.as_bytes(), item_class_mint.key().as_ref(), &schema_index.to_le_bytes()], bump)]
    pub schema: Account<'info, SchemaV1>,

    pub item_class_mint: Account<'info, token::Mint>,

    #[account(seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}
