use anchor_lang::prelude::*;

use crate::state::{
    accounts::{ItemClassV1, Recipe},
    OutputSelectionGroup, Payment, RecipeIngredientData,
};

#[derive(Accounts)]
#[instruction(args: CreateRecipeArgs)]
pub struct CreateRecipe<'info> {
    #[account(init,
        payer = authority,
        space = Recipe::INIT_SPACE,
        seeds = [Recipe::PREFIX.as_bytes(), &(item_class.recipe_index + 1).to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

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
pub struct CreateRecipeArgs {
    pub build_enabled: bool,
    pub payment: Option<Payment>,
    pub ingredients: Vec<RecipeIngredientData>,
    pub build_permit_required: bool,
    pub selectable_outputs: Vec<OutputSelectionGroup>,
}

pub fn handler(ctx: Context<CreateRecipe>, args: CreateRecipeArgs) -> Result<()> {
    // increment recipe index on item class
    let item_class = &mut ctx.accounts.item_class;
    item_class.recipe_index += 1;

    // init recipe
    ctx.accounts.recipe.set_inner(Recipe {
        recipe_index: ctx.accounts.item_class.recipe_index,
        item_class: ctx.accounts.item_class.key(),
        build_enabled: args.build_enabled,
        ingredients: vec![],
        payment: args.payment,
        build_permit_required: args.build_permit_required,
        selectable_outputs: vec![],
    });

    // set vectors here
    let recipe_account = &ctx.accounts.recipe.to_account_info();
    ctx.accounts.recipe.set_selectable_outputs(
        args.selectable_outputs,
        recipe_account,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )?;
    ctx.accounts.recipe.set_ingredient_data(
        args.ingredients,
        recipe_account,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )?;

    Ok(())
}
