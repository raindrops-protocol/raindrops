use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::Initialize, init_empty_merkle_tree},
    program::SplAccountCompression,
};

use crate::state::{accounts::ItemClass, ItemClassOutputMode, NoopProgram};

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
    pub output_mode: ItemClassOutputMode,
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
        recipe_index: None,
        output_mode,
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
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.item_class_authority_mint.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        16,
        64,
    )
}
