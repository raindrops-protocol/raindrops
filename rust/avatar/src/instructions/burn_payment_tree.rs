use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{PaymentMethod, UpdateState, VerifiedPaymentMint},
    data::{PaymentAction, PaymentAssetClass},
    errors::ErrorCode,
};

#[derive(Accounts)]
pub struct BurnPaymentTree<'info> {
    #[account(mut,
        seeds = [UpdateState::PREFIX.as_bytes(), update_state.avatar.key().as_ref(), update_state.target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(
        constraint = update_state.current_payment_details.as_ref().unwrap().payment_method.eq(&payment_method.key()),
        seeds = [PaymentMethod::PREFIX.as_bytes(), payment_method.avatar_class.key().as_ref(), &payment_method.index.to_le_bytes()], bump)]
    pub payment_method: Account<'info, PaymentMethod>,

    #[account(mut)]
    pub payment_mint: Box<Account<'info, token::Mint>>,

    #[account(mut,
        has_one = payment_mint,
        has_one = payment_method,
        close = authority, seeds = [VerifiedPaymentMint::PREFIX.as_bytes(), payment_method.key().as_ref(), payment_mint.key().as_ref()], bump)]
    pub verified_payment_mint: Account<'info, VerifiedPaymentMint>,

    #[account(mut, constraint = payment_mint.key().eq(&payment_source.mint.key()))]
    pub payment_source: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, token::Token>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BurnPaymentTreeArgs {
    pub amount: u64,
}

pub fn handler(ctx: Context<BurnPaymentTree>, args: BurnPaymentTreeArgs) -> Result<()> {
    // increment current amount in the payment state
    ctx.accounts
        .update_state
        .current_payment_details
        .as_mut()
        .unwrap()
        .amount += args.amount;

    match ctx.accounts.payment_method.asset_class {
        PaymentAssetClass::NonFungible { mints: _ } => match ctx.accounts.payment_method.action {
            PaymentAction::Burn => {
                let burn_accounts = token::Burn {
                    mint: ctx.accounts.payment_mint.to_account_info(),
                    from: ctx.accounts.payment_source.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                };

                token::burn(
                    CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_accounts),
                    args.amount,
                )
            }
            _ => Err(ErrorCode::InvalidPaymentMethod.into()),
        },
        _ => Err(ErrorCode::InvalidPaymentMethod.into()),
    }
}
