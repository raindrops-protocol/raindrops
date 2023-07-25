use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::accounts::ItemClass;

#[derive(Accounts)]
pub struct MintAuthorityTokens<'info> {
    pub item_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class.authority_mint.eq(&item_class_authority_mint.key()),
        constraint = item_class.output_mode.is_item(),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class_authority_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mint::authority = item_class)]
    pub item_class_authority_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_authority_mint_ata.amount >= 1,
        associated_token::mint = item_class_authority_mint, associated_token::authority = authority)]
    pub item_class_authority_mint_ata: Account<'info, token::TokenAccount>,

    #[account(init_if_needed, payer = authority, associated_token::mint = item_class_authority_mint, associated_token::authority = destination_authority)]
    pub destination: Account<'info, token::TokenAccount>,

    pub destination_authority: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MintAuthorityTokensArgs {
    pub amount: u64,
}

pub fn handler(ctx: Context<MintAuthorityTokens>, args: MintAuthorityTokensArgs) -> Result<()> {
    // mint tokens to destination
    let mint_to_accounts = token::MintTo {
        mint: ctx.accounts.item_class_authority_mint.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
    };

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_to_accounts,
            &[&[
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.item_class.authority_mint.as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        args.amount,
    )
}
