use std::vec;

use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, ItemClassV1, Recipe},
    errors::ErrorCode,
    BuildIngredientData, BuildStatus, PaymentState,
};

#[derive(Accounts)]
#[instruction(args: StartBuildArgs)]
pub struct StartBuild<'info> {
    #[account(init,
        payer = builder,
        space = Build::space(&recipe.ingredients),
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Recipe::PREFIX.as_bytes(), &args.recipe_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StartBuildArgs {
    pub recipe_index: u64,
}

pub fn handler(ctx: Context<StartBuild>, args: StartBuildArgs) -> Result<()> {
    // check this recipe is enabled for building
    require!(ctx.accounts.recipe.build_enabled, ErrorCode::BuildDisabled);

    // set initial build ingredient state
    let mut ingredients: Vec<BuildIngredientData> =
        Vec::with_capacity(ctx.accounts.recipe.ingredients.len());
    for required_ingredient in ctx.accounts.recipe.ingredients.clone() {
        ingredients.push(required_ingredient.into());
    }

    let payment: Option<PaymentState> = ctx.accounts.recipe.payment.as_ref().map(|payment| PaymentState {
            paid: false,
            payment_details: payment.clone(),
        });

    // set build data
    ctx.accounts.build.set_inner(Build {
        recipe_index: args.recipe_index,
        builder: ctx.accounts.builder.key(),
        item_class: ctx.accounts.item_class.key(),
        item_mint: None,
        status: BuildStatus::InProgress,
        payment,
        ingredients,
    });

    Ok(())
}
