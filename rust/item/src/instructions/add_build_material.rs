use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{Build, ItemClassV1, Schema};

#[derive(Accounts)]
#[instruction(schema_index: u64)]
pub struct AddBuildMaterial<'info> {
    pub material_mint: Account<'info, token::Mint>,

    #[account(seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub material_item_class: Account<'info, ItemClassV1>,

    #[account(mut, associated_token::mint = material_mint, associated_token::authority = builder)]
    pub material_source: Account<'info, token::TokenAccount>,

    #[account(init_if_needed, payer = builder, associated_token::mint = material_mint, associated_token::authority = build)]
    pub material_destination: Account<'info, token::TokenAccount>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    /// CHECK: Done by account compression
    pub members: UncheckedAccount<'info>,

    #[account(
        has_one = members,
        seeds = [ItemClassV1::PREFIX.as_bytes(), members.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

pub fn handler(ctx: Context<AddBuildMaterial>) -> Result<()> {
    // check if material_mint exists in item_class.members tree
    // transfer material_mint to destination
    // update build pda
    Ok(())
}
