use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{AvatarClass, NoopProgram, PaymentMethod},
    data::PaymentAssetClass,
    errors::ErrorCode,
};

use spl_account_compression::{
    cpi::{accounts::Modify, append},
    program::SplAccountCompression,
};

#[derive(Accounts)]
pub struct AddPaymentMintToPaymentMethod<'info> {
    pub payment_mint: Account<'info, token::Mint>,

    #[account(
        seeds = [PaymentMethod::PREFIX.as_bytes(), payment_method.avatar_class.key().as_ref(), &payment_method.index.to_le_bytes()], bump)]
    pub payment_method: Account<'info, PaymentMethod>,

    /// CHECK: done in instruction
    #[account(mut)]
    pub payment_mints: UncheckedAccount<'info>,

    #[account(mut, seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

pub fn handler(ctx: Context<AddPaymentMintToPaymentMethod>) -> Result<()> {
    // verify payment method mints account
    match ctx.accounts.payment_method.asset_class {
        PaymentAssetClass::NonFungible { mints } => require!(
            mints.eq(&ctx.accounts.payment_mints.key()),
            ErrorCode::InvalidPaymentMethod
        ),
        _ => return Err(ErrorCode::InvalidPaymentMethod.into()),
    };

    let append_accounts = Modify {
        merkle_tree: ctx.accounts.payment_mints.to_account_info(),
        authority: ctx.accounts.payment_method.to_account_info(),
        noop: ctx.accounts.log_wrapper.to_account_info(),
    };

    append(
        CpiContext::new_with_signer(
            ctx.accounts.account_compression.to_account_info(),
            append_accounts,
            &[&[
                PaymentMethod::PREFIX.as_bytes(),
                ctx.accounts.avatar_class.key().as_ref(),
                &ctx.accounts.payment_method.index.to_le_bytes(),
                &[*ctx.bumps.get("payment_method").unwrap()],
            ]],
        ),
        ctx.accounts.payment_mint.key().as_ref().try_into().unwrap(),
    )?;

    Ok(())
}
