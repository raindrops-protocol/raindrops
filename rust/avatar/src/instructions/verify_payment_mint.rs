use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{PaymentMethod, VerifiedPaymentMint},
    data::PaymentAssetClass,
    errors::ErrorCode,
};

#[derive(Accounts)]
pub struct VerifyPaymentMint<'info> {
    pub payment_mint: Account<'info, token::Mint>,

    #[account(init_if_needed, payer = payer, space = VerifiedPaymentMint::SPACE, seeds = [VerifiedPaymentMint::PREFIX.as_bytes(), payment_method.key().as_ref(), payment_mint.key().as_ref()], bump)]
    pub verified_payment_mint: Account<'info, VerifiedPaymentMint>,

    #[account(seeds = [PaymentMethod::PREFIX.as_bytes(), payment_method.avatar_class.as_ref(), &payment_method.index.to_le_bytes()], bump)]
    pub payment_method: Account<'info, PaymentMethod>,

    /// CHECK: done by spl-account-compression
    pub payment_mints: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyPaymentMintArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, VerifyPaymentMint<'info>>,
    args: VerifyPaymentMintArgs,
) -> Result<()> {
    // verify payment method mints account
    match ctx.accounts.payment_method.asset_class {
        PaymentAssetClass::NonFungible { mints } => require!(
            mints.eq(&ctx.accounts.payment_mints.key()),
            ErrorCode::InvalidPaymentMethod
        ),
        _ => return Err(ErrorCode::IncorrectAssetClass.into()),
    };

    ctx.accounts
        .verified_payment_mint
        .set_inner(VerifiedPaymentMint {
            payment_method: ctx.accounts.payment_method.key(),
            payment_mint: ctx.accounts.payment_mint.key(),
        });

    // verify payment mint exists in the payment mints tree
    let verify_payment_mint_accounts = VerifyLeaf {
        merkle_tree: ctx.accounts.payment_mints.to_account_info(),
    };

    verify_leaf(
        CpiContext::new(
            ctx.accounts.account_compression.to_account_info(),
            verify_payment_mint_accounts,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        args.root,
        ctx.accounts.payment_mint.key().as_ref().try_into().unwrap(),
        args.leaf_index,
    )?;

    Ok(())
}
