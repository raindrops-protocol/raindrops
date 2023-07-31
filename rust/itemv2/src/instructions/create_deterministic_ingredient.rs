use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{DeterministicIngredient, ItemClass, Recipe},
    DeterministicIngredientOutput,
};

#[derive(Accounts)]
pub struct CreateDeterministicIngredient<'info> {
    pub ingredient_mint: Account<'info, token::Mint>,

    // init_if_needed allows you to update the pda with new data if necessary
    #[account(init_if_needed,
        payer = authority,
        space = DeterministicIngredient::INIT_SPACE,
        seeds = [DeterministicIngredient::PREFIX.as_bytes(), recipe.key().as_ref(), ingredient_mint.key().as_ref()], bump)]
    pub deterministic_ingredient: Account<'info, DeterministicIngredient>,

    #[account(
        has_one = item_class,
        seeds = [Recipe::PREFIX.as_bytes(), &recipe.recipe_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(mut,
        constraint = item_class.authority_mint.eq(&item_class_authority_mint.key()),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class_authority_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mint::authority = item_class)]
    pub item_class_authority_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_authority_mint_ata.amount >= 1,
        associated_token::mint = item_class_authority_mint, associated_token::authority = authority)]
    pub item_class_authority_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateDeterministicIngredientArgs {
    pub outputs: Vec<DeterministicIngredientOutput>,
}

pub fn handler(
    ctx: Context<CreateDeterministicIngredient>,
    args: CreateDeterministicIngredientArgs,
) -> Result<()> {
    ctx.accounts
        .deterministic_ingredient
        .set_inner(DeterministicIngredient {
            recipe: ctx.accounts.recipe.key(),
            ingredient_mint: ctx.accounts.ingredient_mint.key(),
            outputs: vec![],
        });

    // set outputs
    let deterministic_ingredient_account = &ctx.accounts.deterministic_ingredient.to_account_info();
    ctx.accounts.deterministic_ingredient.set_outputs(
        args.outputs,
        deterministic_ingredient_account,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )
}
