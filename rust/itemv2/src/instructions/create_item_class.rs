use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::Initialize, init_empty_merkle_tree},
    program::SplAccountCompression,
};

use crate::state::{accounts::ItemClass, ItemClassMode, ItemClassModeSelection, NoopProgram};

#[derive(Accounts)]
#[instruction(args: CreateItemClassArgs)]
pub struct CreateItemClass<'info> {
    /// CHECK: verified by the item class mode
    #[account(zero)]
    pub tree: Option<UncheckedAccount<'info>>,

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

    pub system_program: Program<'info, System>,

    pub account_compression: Option<Program<'info, SplAccountCompression>>,

    pub log_wrapper: Option<Program<'info, NoopProgram>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateItemClassArgs {
    pub item_class_name: String,
    pub mode: ItemClassModeSelection,
}

pub fn handler(ctx: Context<CreateItemClass>, args: CreateItemClassArgs) -> Result<()> {
    let mut mode = ItemClassMode::PresetOnly;

    match args.mode {
        ItemClassModeSelection::Collection { collection_mint } => {
            mode = ItemClassMode::Collection {
                collection_mint: collection_mint,
            }
        }
        ItemClassModeSelection::MerkleTree => {
            mode = ItemClassMode::MerkleTree {
                tree: ctx.accounts.tree.clone().unwrap().key(),
            };

            // initialize merkle tree
            let init_empty_merkle_tree_accounts = Initialize {
                merkle_tree: ctx.accounts.tree.clone().unwrap().to_account_info(),
                authority: ctx.accounts.item_class.to_account_info(),
                noop: ctx.accounts.log_wrapper.clone().unwrap().to_account_info(),
            };

            init_empty_merkle_tree(
                CpiContext::new_with_signer(
                    ctx.accounts
                        .account_compression
                        .clone()
                        .unwrap()
                        .to_account_info(),
                    init_empty_merkle_tree_accounts,
                    &[&[
                        ItemClass::PREFIX.as_bytes(),
                        ctx.accounts.item_class_authority_mint.key().as_ref(),
                        &[*ctx.bumps.get("item_class").unwrap()],
                    ]],
                ),
                16,
                64,
            )?;
        }
        ItemClassModeSelection::Pack => {
            mode = ItemClassMode::Pack { index: 0 };
        }
        _ => {}
    }

    // init item class
    ctx.accounts.item_class.set_inner(ItemClass {
        name: args.item_class_name,
        authority_mint: ctx.accounts.item_class_authority_mint.key(),
        recipe_index: None,
        mode: mode,
    });

    Ok(())
}
