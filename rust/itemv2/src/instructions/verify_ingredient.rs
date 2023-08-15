use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::{metadata, token};
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{is_collection_member, Build, DeterministicIngredient, Item, ItemClass},
    errors::ErrorCode,
    ItemClassMode, ItemState, NoopProgram,
};

#[derive(Accounts)]
pub struct VerifyIngredient<'info> {
    #[account(init_if_needed,
        payer = payer,
        space = Item::SPACE,
        seeds = [Item::PREFIX.as_bytes(), ingredient_mint.key().as_ref()], bump)]
    pub item: Account<'info, Item>,

    pub ingredient_mint: Box<Account<'info, token::Mint>>,

    #[account(mut,
        seeds = [b"metadata", mpl_token_metadata::ID.as_ref(), ingredient_mint.key().as_ref()],
        seeds::program = mpl_token_metadata::ID,
        bump
    )]
    pub ingredient_mint_metadata: Option<Account<'info, metadata::MetadataAccount>>,

    #[account(seeds = [ItemClass::PREFIX.as_bytes(), ingredient_item_class.authority_mint.as_ref()], bump)]
    pub ingredient_item_class: Box<Account<'info, ItemClass>>,

    /// CHECK: depends on item class mode
    #[account(constraint = ingredient_item_class.mode.is_verify_account(&ingredient_item_class_verify_account.key()) @ ErrorCode::InvalidVerifyAccount)]
    pub ingredient_item_class_verify_account: Option<UncheckedAccount<'info>>,

    #[account(
        has_one = ingredient_mint,
        seeds = [DeterministicIngredient::PREFIX.as_bytes(), build.recipe.as_ref(), ingredient_mint.key().as_ref()], bump
    )]
    pub deterministic_ingredient: Option<Account<'info, DeterministicIngredient>>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub log_wrapper: Option<Program<'info, NoopProgram>>,

    pub account_compression: Option<Program<'info, SplAccountCompression>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyIngredientArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, VerifyIngredient<'info>>,
    args: Option<VerifyIngredientArgs>,
) -> Result<()> {
    // set the initial data if item pda has not been initialized until this instruction
    if !ctx.accounts.item.initialized {
        ctx.accounts.item.set_inner(Item {
            initialized: true,
            item_mint: ctx.accounts.ingredient_mint.key(),
            item_state: ItemState::new(),
        })
    } else {
        // check that the item is not on cooldown
        if ctx.accounts.item.item_state.on_cooldown() {
            return Err(ErrorCode::ItemOnCooldown.into());
        }
    }

    // deterministic ingredients don't need verification because its checked by the PDA seeds
    if ctx.accounts.deterministic_ingredient.is_none() {
        // if ingredient is not deterministic then we need to verify its part of the item class
        match ctx.accounts.ingredient_item_class.mode {
            ItemClassMode::MerkleTree { .. } => {
                let verify_leaf_args = args.unwrap();

                // verify mint exists in the items tree
                let verify_item_accounts = VerifyLeaf {
                    merkle_tree: ctx
                        .accounts
                        .ingredient_item_class_verify_account
                        .clone()
                        .unwrap()
                        .to_account_info(),
                };

                verify_leaf(
                    CpiContext::new(
                        ctx.accounts
                            .account_compression
                            .clone()
                            .unwrap()
                            .to_account_info(),
                        verify_item_accounts,
                    )
                    .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
                    verify_leaf_args.root,
                    ctx.accounts
                        .ingredient_mint
                        .key()
                        .as_ref()
                        .try_into()
                        .unwrap(),
                    verify_leaf_args.leaf_index,
                )?;
            }
            ItemClassMode::Collection { collection_mint } => {
                is_collection_member(
                    ctx.accounts
                        .ingredient_mint_metadata
                        .clone()
                        .unwrap()
                        .into_inner(),
                    &collection_mint,
                )?;
            }
            // item class modes which are preset only and pack are not valid ingredients so we error
            _ => return Err(ErrorCode::IncorrectIngredient.into()),
        }
    };

    // set the verified mint in the build data
    let build_account = &ctx.accounts.build.to_account_info();
    ctx.accounts.build.add_ingredient(
        ctx.accounts.ingredient_mint.key(),
        &ctx.accounts.ingredient_item_class.key(),
        build_account,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    )
}
