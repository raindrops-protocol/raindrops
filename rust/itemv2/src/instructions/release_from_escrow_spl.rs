use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::accounts::ItemClass;

#[derive(Accounts)]
pub struct ReleaseFromEscrowSpl<'info> {
    pub item_mint: Account<'info, token::Mint>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = item_class)]
    pub item_source: Box<Account<'info, token::TokenAccount>>,

    #[account(init_if_needed, payer = authority, associated_token::mint = item_mint, associated_token::authority = destination_authority)]
    pub item_destination: Box<Account<'info, token::TokenAccount>>,

    pub destination_authority: SystemAccount<'info>,

    #[account(
        constraint = item_class.authority_mint.eq(&item_class_authority_mint.key()),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class.authority_mint.as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mint::authority = item_class)]
    pub item_class_authority_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_authority_mint_ata.amount >= 1,
        associated_token::mint = item_class_authority_mint, associated_token::authority = authority)]
    pub item_class_authority_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ReleaseFromEscrowSplArgs {
    pub amount: u64,
}

pub fn handler(ctx: Context<ReleaseFromEscrowSpl>, args: ReleaseFromEscrowSplArgs) -> Result<()> {
    // transfer item to destination
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
                ctx.accounts.item_class_authority_mint.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        args.amount,
    )?;

    // reload account data to check token account amount
    ctx.accounts.item_source.reload()?;

    // close token account if amount is 0
    if ctx.accounts.item_source.amount == 0 {
        // close item class ata
        let close_ata_accounts = token::CloseAccount {
            account: ctx.accounts.item_source.to_account_info(),
            destination: ctx.accounts.authority.to_account_info(),
            authority: ctx.accounts.item_class.to_account_info(),
        };

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_ata_accounts,
            &[&[
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.item_class_authority_mint.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ))?;
    }

    Ok(())
}
