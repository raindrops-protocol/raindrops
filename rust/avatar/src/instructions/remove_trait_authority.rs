use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::accounts::{Avatar, AvatarClass, Trait};

#[derive(Accounts)]
pub struct RemoveTraitAuthority<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(
        has_one = trait_mint,
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    pub trait_mint: Box<Account<'info, token::Mint>>,

    #[account(init_if_needed, payer = authority,
        associated_token::mint = trait_mint,
        associated_token::authority = authority)]
    pub trait_destination: Account<'info, token::TokenAccount>,

    #[account(mut,
        associated_token::mint = trait_mint,
        associated_token::authority = avatar)]
    pub avatar_trait_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RemoveTraitAuthority>) -> Result<()> {
    // transfer trait to authority
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.avatar_trait_ata.to_account_info(),
        to: ctx.accounts.trait_destination.to_account_info(),
        authority: ctx.accounts.avatar.to_account_info(),
    };

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            &[&[
                Avatar::PREFIX.as_bytes(),
                ctx.accounts.avatar_class.key().as_ref(),
                ctx.accounts.avatar.mint.key().as_ref(),
                &[*ctx.bumps.get("avatar").unwrap()],
            ]],
        ),
        1,
    )?;

    // remove the trait_data
    let avatar_account_info = ctx.accounts.avatar.to_account_info();
    ctx.accounts.avatar.remove_trait(
        ctx.accounts.trait_account.key(),
        &avatar_account_info,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    );

    // reload account data to check token account amount
    ctx.accounts.avatar_trait_ata.reload()?;

    // close token account if amount is 0
    if ctx.accounts.avatar_trait_ata.amount == 0 {

        let close_ata_accounts = token::CloseAccount {
            account: ctx.accounts.avatar_trait_ata.to_account_info(),
            destination: ctx.accounts.authority.to_account_info(),
            authority: ctx.accounts.avatar.to_account_info(),
        };

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_ata_accounts,
            &[&[
                Avatar::PREFIX.as_bytes(),
                ctx.accounts.avatar_class.key().as_ref(),
                ctx.accounts.avatar.mint.key().as_ref(),
                &[*ctx.bumps.get("avatar").unwrap()],
            ]],
        ))?;
    }

    Ok(())
}
