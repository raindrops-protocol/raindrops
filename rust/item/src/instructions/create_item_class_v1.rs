use anchor_lang::prelude::*;
use spl_account_compression::{
    cpi::{accounts::Initialize, init_empty_merkle_tree},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{ItemClassV1, Recipe},
    NoopProgram, OutputSelectionGroup, Payment, RecipeIngredientData, ItemClassV1OutputMode,
};

#[derive(Accounts)]
#[instruction(args: CreateItemClassV1Args)]
pub struct CreateItemClassV1<'info> {
    /// CHECK: initialized by spl-account-compression program
    #[account(zero)]
    pub items: UncheckedAccount<'info>,

    #[account(init,
        payer = authority, space = ItemClassV1::SPACE,
        seeds = [ItemClassV1::PREFIX.as_bytes(), items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(init,
        payer = authority,
        space = Recipe::space(args.recipe_args.ingredients.len()),
        seeds = [Recipe::PREFIX.as_bytes(), &Recipe::INITIAL_INDEX.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub account_compression: Program<'info, SplAccountCompression>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateItemClassV1Args {
    pub recipe_args: RecipeArgs,
    pub output_mode: ItemClassV1OutputMode,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecipeArgs {
    pub build_enabled: bool,
    pub payment: Option<Payment>,
    pub ingredients: Vec<RecipeIngredientData>,
    pub output_selection: Vec<OutputSelectionGroup>,
}

pub fn handler(ctx: Context<CreateItemClassV1>, args: CreateItemClassV1Args) -> Result<()> {
    // init item class
    ctx.accounts.item_class.set_inner(ItemClassV1 {
        authority: ctx.accounts.authority.key(),
        items: ctx.accounts.items.key(),
        recipe_index: Recipe::INITIAL_INDEX,
        output_mode: args.output_mode,
    });

    // init recipe
    ctx.accounts.recipe.set_inner(Recipe {
        recipe_index: Recipe::INITIAL_INDEX,
        item_class: ctx.accounts.item_class.key(),
        build_enabled: args.recipe_args.build_enabled,
        ingredients: args.recipe_args.ingredients,
        payment: args.recipe_args.payment,
        output_selection: args.recipe_args.output_selection,
    });

    // initialize merkle tree
    let init_empty_merkle_tree_accounts = Initialize {
        merkle_tree: ctx.accounts.items.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
        noop: ctx.accounts.log_wrapper.to_account_info(),
    };

    init_empty_merkle_tree(
        CpiContext::new_with_signer(
            ctx.accounts.account_compression.to_account_info(),
            init_empty_merkle_tree_accounts,
            &[&[
                ItemClassV1::PREFIX.as_bytes(),
                ctx.accounts.items.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        16,
        64,
    )
}
