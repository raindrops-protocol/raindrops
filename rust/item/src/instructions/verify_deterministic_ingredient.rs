use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Build, DeterministicIngredient, ItemClassV1},
    errors::ErrorCode,
    IngredientMint, ItemClassV1IngredientMode,
};

#[derive(Accounts)]
pub struct VerifyDeterministicIngredient<'info> {
    pub ingredient_mint: Account<'info, token::Mint>,

    #[account(seeds = [DeterministicIngredient::PREFIX.as_bytes(), ingredient_item_class.key().as_ref(), ingredient_mint.key().as_ref()], bump)]
    pub deterministic_ingredient: Account<'info, DeterministicIngredient>,

    #[account(
        constraint = ingredient_item_class.ingredient_mode.eq(&ItemClassV1IngredientMode::Deterministic),
        seeds = [ItemClassV1::PREFIX.as_bytes(), ingredient_item_class.items.key().as_ref()], bump)]
    pub ingredient_item_class: Account<'info, ItemClassV1>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn handler(ctx: Context<VerifyDeterministicIngredient>) -> Result<()> {
    // ingredient_mint and pda is verified in the account ingestion step

    // set the verified mint in the build data
    let build = &mut ctx.accounts.build;
    let mut verified = false;
    for build_ingredient_data in build.ingredients.iter_mut() {
        if build_ingredient_data
            .item_class
            .eq(&ctx.accounts.ingredient_item_class.key())
        {
            // error if builder already escrowed enough of this ingredient
            require!(
                build_ingredient_data.current_amount < build_ingredient_data.required_amount,
                ErrorCode::IncorrectIngredient
            );

            let ingredient_mint = ctx.accounts.ingredient_mint.key();

            // check this mint wasn't already verified
            let already_verified = build_ingredient_data
                .mints
                .iter()
                .any(|mint_data| mint_data.mint.eq(&ingredient_mint));
            require!(!already_verified, ErrorCode::IncorrectIngredient);

            // add the mint to the list of build ingredients
            build_ingredient_data.mints.push(IngredientMint {
                build_effect_applied: false,
                mint: ctx.accounts.ingredient_mint.key(),
            });

            verified = true;

            break;
        }
    }
    require!(verified, ErrorCode::IncorrectIngredient);

    Ok(())
}
