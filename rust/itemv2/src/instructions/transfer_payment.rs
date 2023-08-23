use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction::transfer},
};

use crate::state::{accounts::Build, errors::ErrorCode, BuildStatus, PaymentStatus};

#[derive(Accounts)]
pub struct TransferPayment<'info> {
    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, seeds = [Build::PAYMENT_ESCROW_PREFIX.as_bytes(), build.key().as_ref()], bump)]
    pub build_payment_escrow: SystemAccount<'info>,

    /// CHECK: checked in ix
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TransferPayment>) -> Result<()> {
    // action based on build status
    match ctx.accounts.build.status {
        BuildStatus::InProgress => {
            // if build is in progress, return the escrowed payment to the builder, this signals we are backing out
            // check that the destination is the builder wallet
            require!(
                ctx.accounts
                    .destination
                    .key()
                    .eq(&ctx.accounts.build.builder),
                ErrorCode::InvalidPaymentTreasury
            );

            // reset payment status for build
            ctx.accounts.build.payment.as_mut().unwrap().status = PaymentStatus::NotPaid;
        }
        BuildStatus::ItemReceived => {
            // if item has been received by the builder we can transfer the funds to the treasury
            // check the treasurer is the right key
            require!(
                ctx.accounts
                    .build
                    .payment
                    .as_ref()
                    .unwrap()
                    .payment_details
                    .treasury
                    .eq(&ctx.accounts.destination.key()),
                ErrorCode::InvalidPaymentTreasury
            );

            // update payment status for build
            ctx.accounts.build.payment.as_mut().unwrap().status = PaymentStatus::SentToTreasury;
        }
        _ => return Err(ErrorCode::InvalidBuildStatus.into()),
    }

    // transfer all lamports from escrow to destination
    let transfer_ix = transfer(
        &ctx.accounts.build_payment_escrow.key(),
        &ctx.accounts.destination.key(),
        ctx.accounts.build_payment_escrow.lamports(),
    );

    invoke_signed(
        &transfer_ix,
        &[
            ctx.accounts.build_payment_escrow.to_account_info(),
            ctx.accounts.destination.to_account_info(),
        ],
        &[&[
            Build::PAYMENT_ESCROW_PREFIX.as_bytes(),
            ctx.accounts.build.key().as_ref(),
            &[*ctx.bumps.get("build_payment_escrow").unwrap()],
        ]],
    )?;

    Ok(())
}
