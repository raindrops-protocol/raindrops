use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{DeterministicIngredient, ItemClassV1},
    DeterministicIngredientOutput,
};

#[derive(Accounts)]
#[instruction(args: CreateDeterministicIngredientArgs)]
pub struct CreateDeterministicIngredient<'info> {
    pub ingredient_mint: Account<'info, token::Mint>,

    #[account(init,
        payer = authority,
        space = DeterministicIngredient::space(args.output_mapping.len()),
        seeds = [DeterministicIngredient::PREFIX.as_bytes(), item_class.key().as_ref(), ingredient_mint.key().as_ref()], bump)]
    pub deterministic_ingredient: Account<'info, DeterministicIngredient>,

    #[account(mut,
        has_one = authority,
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateDeterministicIngredientArgs {
    pub output_mapping: Vec<DeterministicIngredientOutput>,
}

pub fn handler(
    ctx: Context<CreateDeterministicIngredient>,
    args: CreateDeterministicIngredientArgs,
) -> Result<()> {
    // init recipe
    ctx.accounts
        .deterministic_ingredient
        .set_inner(DeterministicIngredient {
            item_class: ctx.accounts.item_class.key(),
            ingredient_mint: ctx.accounts.ingredient_mint.key(),
            output_mapping: args.output_mapping,
        });

    Ok(())
}
