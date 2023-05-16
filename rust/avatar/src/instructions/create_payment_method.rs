use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{AvatarClass, NoopProgram, PaymentMethod},
    data::{PaymentAction, PaymentAssetClass},
    errors::ErrorCode,
};

use spl_account_compression::{
    cpi::{accounts::Initialize, init_empty_merkle_tree},
    program::SplAccountCompression,
};

#[derive(Accounts)]
pub struct CreatePaymentMethod<'info> {
    #[account(init, payer = authority, space = PaymentMethod::SPACE, seeds = [PaymentMethod::PREFIX.as_bytes(), avatar_class.key().as_ref(), &avatar_class.payment_index.to_le_bytes()], bump)]
    pub payment_method: Account<'info, PaymentMethod>,

    #[account(mut, seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Account<'info, token::TokenAccount>,

    #[account(zero)]
    pub payment_mints: Option<UncheckedAccount<'info>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub account_compression: Option<Program<'info, SplAccountCompression>>,

    pub log_wrapper: Option<Program<'info, NoopProgram>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreatePaymentMethodArgs {
    pub asset_class: PaymentAssetClass,
    pub action: PaymentAction,
}

pub fn handler(ctx: Context<CreatePaymentMethod>, args: CreatePaymentMethodArgs) -> Result<()> {
    ctx.accounts.payment_method.set_inner(PaymentMethod {
        uri: "".to_string(),
        index: ctx.accounts.avatar_class.payment_index,
        avatar_class: ctx.accounts.avatar_class.key(),
        asset_class: args.asset_class.clone(),
        action: args.action,
    });

    // increment payment index on the avatar class
    ctx.accounts.avatar_class.payment_index += 1;

    match args.asset_class {
        PaymentAssetClass::Fungible { mint: _ } => {
            // no need to create a merkle tree for fungible assets
        }
        PaymentAssetClass::NonFungible { mints } => {
            // if asset class is non fungible we need to create the merkle tree

            // make sure mints defined in the asset class matches the account passed in
            require!(
                mints.eq(&ctx.accounts.payment_mints.clone().unwrap().key()),
                ErrorCode::InvalidPaymentMint
            );
            // initialize merkle tree
            let init_empty_merkle_tree_accounts = Initialize {
                merkle_tree: ctx
                    .accounts
                    .payment_mints
                    .clone()
                    .unwrap()
                    .to_account_info(),
                authority: ctx.accounts.payment_method.to_account_info(),
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
                        PaymentMethod::PREFIX.as_bytes(),
                        ctx.accounts.avatar_class.key().as_ref(),
                        &ctx.accounts.payment_method.index.to_le_bytes(),
                        &[*ctx.bumps.get("payment_method").unwrap()],
                    ]],
                ),
                16,
                64,
            )?;
        }
    }

    Ok(())
}
