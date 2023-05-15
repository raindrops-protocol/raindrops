use anchor_lang::prelude::*;
use anchor_spl::{associated_token::get_associated_token_address, token};

use crate::state::{
    accounts::{PaymentMethod, UpdateState},
    data::{PaymentAction, PaymentAssetClass},
    errors::ErrorCode,
};

#[derive(Accounts)]
pub struct TransferPayment<'info> {
    #[account(mut,
        seeds = [UpdateState::PREFIX.as_bytes(), update_state.avatar.key().as_ref(), update_state.target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(
        constraint = update_state.current_payment_details.as_ref().unwrap().payment_method.eq(&payment_method.key()),
        seeds = [PaymentMethod::PREFIX.as_bytes(), payment_method.avatar_class.key().as_ref(), &payment_method.index.to_le_bytes()], bump)]
    pub payment_method: Account<'info, PaymentMethod>,

    pub payment_mint: Box<Account<'info, token::Mint>>,

    #[account(mut, constraint = payment_mint.key().eq(&payment_source.mint.key()))]
    pub payment_source: Box<Account<'info, token::TokenAccount>>,

    #[account(mut, constraint = payment_mint.key().eq(&payment_destination.mint.key()))]
    pub payment_destination: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, token::Token>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TransferPaymentArgs {
    pub amount: u64,
}

pub fn handler(ctx: Context<TransferPayment>, args: TransferPaymentArgs) -> Result<()> {
    // increment current amount in the update state
    ctx.accounts
        .update_state
        .current_payment_details
        .as_mut()
        .unwrap()
        .amount += args.amount;

    match ctx.accounts.payment_method.asset_class {
        PaymentAssetClass::Fungible { mint } => match ctx.accounts.payment_method.action {
            PaymentAction::Transfer { treasury } => {
                // check mint expected is passed in as an account
                require!(
                    mint.eq(&ctx.accounts.payment_mint.key()),
                    ErrorCode::InvalidPaymentMint
                );

                // check the destination ata is defined in the payment details
                let destination_address = get_associated_token_address(&treasury, &mint);
                require!(
                    destination_address.eq(&ctx.accounts.payment_destination.key()),
                    ErrorCode::InvalidPaymentMint
                );

                let transfer_accounts = token::Transfer {
                    from: ctx.accounts.payment_source.to_account_info(),
                    to: ctx.accounts.payment_destination.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                };

                token::transfer(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        transfer_accounts,
                    ),
                    args.amount,
                )
            }
            _ => Err(ErrorCode::InvalidPaymentMethod.into()),
        },
        _ => Err(ErrorCode::InvalidPaymentMethod.into()),
    }
}
