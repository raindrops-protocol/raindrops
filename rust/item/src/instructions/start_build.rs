use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{BuildEscrow, ItemClassV1, SchemaV1};

#[derive(Accounts)]
#[instruction(schema_index: u64)]
pub struct StartBuild<'info> {
    #[account(init, payer = builder, space = BuildEscrow::space(schema.components.len()), seeds = [BuildEscrow::PREFIX.as_bytes(), item_class_mint.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build_escrow: Account<'info, BuildEscrow>,

    #[account(seeds = [SchemaV1::PREFIX.as_bytes(), item_class_mint.key().as_ref(), &schema_index.to_le_bytes()], bump)]
    pub schema: Account<'info, SchemaV1>,

    pub item_class_mint: Account<'info, token::Mint>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}
