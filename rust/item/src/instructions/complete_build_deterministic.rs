use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, DeterministicIngredient, ItemClassV1},
    errors::ErrorCode,
    BuildStatus, ItemClassV1IngredientMode,
};

#[derive(Accounts)]
pub struct CompleteBuildDeterministic<'info> {
    // TODO: make sure to check ingredient mint in ix
    #[account(seeds = [DeterministicIngredient::PREFIX.as_bytes(), item_class.key().as_ref(), deterministic_ingredient.ingredient_mint.key().as_ref()], bump)]
    pub deterministic_ingredient: Account<'info, DeterministicIngredient>,

    #[account(
        constraint = item_class.ingredient_mode.eq(&ItemClassV1IngredientMode::Deterministic),
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn handler(ctx: Context<CompleteBuildDeterministic>) -> Result<()> {
    // check the build is in progress before running completion steps
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // ingredient mint exists
    let mut deterministic_ingredient_escrowed = false;
    let mut build_amounts_met = false;
    for ingredient in ctx.accounts.build.ingredients.iter() {
        // check sufficient amounts of each ingredient has been met for the recipe
        build_amounts_met = ingredient.current_amount >= ingredient.required_amount;

        // check if the deterministic ingredient has been escrowed and matches the deterministic ingredient pda passed in
        if ingredient
            .item_class_ingredient_mode
            .eq(&ItemClassV1IngredientMode::Deterministic)
        {
            deterministic_ingredient_escrowed = ingredient.mints.iter().any(|ingredient_mint| {
                ingredient_mint
                    .mint
                    .eq(&ctx.accounts.deterministic_ingredient.ingredient_mint)
            });
        }
    }
    require!(build_amounts_met, ErrorCode::MissingIngredient);
    require!(
        deterministic_ingredient_escrowed,
        ErrorCode::MissingIngredient
    );

    // check payment has been made
    match &ctx.accounts.build.payment {
        Some(payment) => {
            require!(payment.paid, ErrorCode::BuildNotPaid);
        }
        None => {}
    }

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

    // set outputs
    build.output = ctx.accounts.deterministic_ingredient.into_build_output();

    Ok(())
}
