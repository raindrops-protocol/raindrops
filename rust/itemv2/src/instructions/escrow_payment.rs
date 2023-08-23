use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction::transfer},
};

use crate::state::{accounts::Build, errors::ErrorCode, BuildStatus, PaymentStatus};

#[derive(Accounts)]
pub struct EscrowPayment<'info> {
    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, seeds = [Build::PAYMENT_ESCROW_PREFIX.as_bytes(), build.key().as_ref()], bump)]
    pub build_payment_escrow: SystemAccount<'info>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EscrowPayment>) -> Result<()> {
    // check that the build is in progress
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    let transfer_ix = transfer(
        &ctx.accounts.builder.key(),
        &ctx.accounts.build_payment_escrow.key(),
        ctx.accounts
            .build
            .payment
            .as_ref()
            .unwrap()
            .payment_details
            .amount,
    );

    invoke(
        &transfer_ix,
        &[
            ctx.accounts.builder.to_account_info(),
            ctx.accounts.build_payment_escrow.to_account_info(),
        ],
    )?;

    // mark payment as escrowed
    // in addition, check that builder didn't previously pay
    match &mut ctx.accounts.build.payment {
        Some(payment) => match payment.status {
            PaymentStatus::NotPaid => {
                payment.status = PaymentStatus::Escrowed;
                Ok(())
            }
            _ => Err(ErrorCode::InvalidPaymentStatus.into()),
        },
        None => Ok(()),
    }
}
