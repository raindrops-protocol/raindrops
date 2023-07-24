use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::Initialize, init_empty_merkle_tree},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{ItemClass, Recipe},
    ItemClassOutputMode, NoopProgram, OutputSelectionGroup, Payment, RecipeIngredientData,
};

#[derive(Accounts)]
#[instruction(args: CreateItemClassArgs)]
pub struct CreateItemClass<'info> {
    /// CHECK: initialized by spl-account-compression program
    #[account(zero)]
    pub items: UncheckedAccount<'info>,

    #[account(init,
        payer = authority, space = ItemClass::space(args.item_class_name),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class_authority_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mint::authority = item_class, mint::decimals = 0)]
    pub item_class_authority_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_authority_mint_ata.amount >= 1,
        associated_token::mint = item_class_authority_mint, associated_token::authority = authority)]
    pub item_class_authority_mint_ata: Account<'info, token::TokenAccount>,

    #[account(init,
        payer = authority,
        space = Recipe::INIT_SPACE,
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
pub struct CreateItemClassArgs {
    pub item_class_name: String,
    pub recipe_args: RecipeArgs,
    pub output_mode: ItemClassOutputMode,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecipeArgs {
    pub build_enabled: bool,
    pub payment: Option<Payment>,
    pub ingredients: Vec<RecipeIngredientData>,
    pub build_permit_required: bool,
    pub selectable_outputs: Vec<OutputSelectionGroup>,
}

pub fn handler(ctx: Context<CreateItemClass>, args: CreateItemClassArgs) -> Result<()> {
    let output_mode = match args.output_mode {
        ItemClassOutputMode::Item => ItemClassOutputMode::Item,
        ItemClassOutputMode::Pack { .. } => ItemClassOutputMode::Pack { index: 0 },
        ItemClassOutputMode::PresetOnly => ItemClassOutputMode::PresetOnly,
    };

    // init item class
    ctx.accounts.item_class.set_inner(ItemClass {
        name: args.item_class_name,
        authority_mint: ctx.accounts.item_class_authority_mint.key(),
        items: Some(ctx.accounts.items.key()),
        recipe_index: Recipe::INITIAL_INDEX,
        output_mode,
    });

    // init recipe
    ctx.accounts.recipe.set_inner(Recipe {
        recipe_index: Recipe::INITIAL_INDEX,
        item_class: ctx.accounts.item_class.key(),
        build_enabled: args.recipe_args.build_enabled,
        ingredients: vec![],
        payment: args.recipe_args.payment,
        build_permit_required: args.recipe_args.build_permit_required,
        selectable_outputs: vec![],
    });

    // set vectors here
    let recipe_account = &ctx.accounts.recipe.to_account_info();
    ctx.accounts.recipe.set_selectable_outputs(
        args.recipe_args.selectable_outputs,
        recipe_account,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )?;
    ctx.accounts.recipe.set_ingredient_data(
        args.recipe_args.ingredients,
        recipe_account,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )?;

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
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.items.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        16,
        64,
    )
}
