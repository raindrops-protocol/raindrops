use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{BuildEscrow, ItemClassV1, SchemaV1};

#[derive(Accounts)]
#[instruction(schema_index: u64)]
pub struct EndBuild<'info> {
    pub new_item_mint: Account<'info, token::Mint>,

    #[account(init, payer = builder, space = ItemV1::SPACE, seeds = [ItemV1::PREFIX.as_bytes(), item_class_mint.key().as_ref(), new_item_mint.key().as_ref()], bump)]
    pub new_item: Account<'info, ItemV1>,

    #[account(mut, seeds = [BuildEscrow::PREFIX.as_bytes(), item_class_mint.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build_escrow: Account<'info, BuildEscrow>,

    #[account(seeds = [SchemaV1::PREFIX.as_bytes(), item_class_mint.key().as_ref(), &schema_index.to_le_bytes()], bump)]
    pub schema: Account<'info, SchemaV1>,

    pub item_class_mint: Account<'info, token::Mint>,

    #[account(seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}
