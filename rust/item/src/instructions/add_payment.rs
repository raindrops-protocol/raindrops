use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction::transfer},
};

use crate::state::{accounts::Build, errors::ErrorCode, BuildStatus};

#[derive(Accounts)]
pub struct AddPayment<'info> {
    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    /// CHECK: checked in ix
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddPayment>) -> Result<()> {
    // check that the build is in progress
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // check the treasurer is the right key
    require!(
        ctx.accounts
            .build
            .payment
            .as_ref()
            .unwrap()
            .payment_details
            .treasury
            .eq(&ctx.accounts.treasury.key()),
        ErrorCode::InvalidPaymentTreasury
    );

    let transfer_ix = transfer(
        &ctx.accounts.builder.key(),
        &ctx.accounts.treasury.key(),
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
            ctx.accounts.treasury.to_account_info(),
        ],
    )?;

    // mark payment as paid
    match &mut ctx.accounts.build.payment {
        Some(payment) => {
            payment.paid = true;
            Ok(())
        }
        None => Ok(()),
    }
}
