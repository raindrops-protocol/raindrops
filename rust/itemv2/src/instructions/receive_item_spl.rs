use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Build, ItemClass},
    errors::ErrorCode,
    BuildStatus,
};

#[derive(Accounts)]
pub struct ReceiveItemSpl<'info> {
    pub item_mint: Account<'info, token::Mint>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = item_class)]
    pub item_source: Box<Account<'info, token::TokenAccount>>,

    #[account(init_if_needed, payer = payer, associated_token::mint = item_mint, associated_token::authority = builder)]
    pub item_destination: Box<Account<'info, token::TokenAccount>>,

    #[account(
        mut,
        has_one = builder,
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(
        seeds = [ItemClass::PREFIX.as_bytes(), item_class.authority_mint.as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    pub builder: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

pub fn handler(ctx: Context<ReceiveItemSpl>) -> Result<()> {
    // check that the build is complete
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::Complete),
        ErrorCode::InvalidBuildStatus
    );

    // get output details for item mint
    let amount = ctx
        .accounts
        .build
        .output
        .find_output_amount(&ctx.accounts.item_mint.key());

    // set build output to received
    ctx.accounts
        .build
        .output
        .set_output_as_received(&ctx.accounts.item_mint.key());

    // if all outputs have been dispensed, set build to final state
    if ctx.accounts.build.output.all_outputs_sent() {
        ctx.accounts.build.status = BuildStatus::ItemReceived;
    }

    // transfer item to builder
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.item_source.to_account_info(),
        to: ctx.accounts.item_destination.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
    };

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            &[&[
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.item_class.authority_mint.as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        amount,
    )?;

    // reload account data to check token account amount
    ctx.accounts.item_source.reload()?;

    // close token account if amount is 0
    if ctx.accounts.item_source.amount == 0 {
        // close item class ata
        let close_ata_accounts = token::CloseAccount {
            account: ctx.accounts.item_source.to_account_info(),
            destination: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.item_class.to_account_info(),
        };

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_ata_accounts,
            &[&[
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.item_class.authority_mint.as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ))?;
    }

    Ok(())
}
