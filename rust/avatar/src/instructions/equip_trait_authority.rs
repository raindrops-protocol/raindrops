use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::accounts::{Avatar, AvatarClass, Trait};

#[derive(Accounts)]
pub struct EquipTraitAuthority<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    #[account(
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_account.trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    #[account(mut,
        associated_token::mint = trait_account.trait_mint,
        associated_token::authority = authority)]
    pub trait_source: Box<Account<'info, token::TokenAccount>>,

    #[account(mut,
        associated_token::mint = trait_account.trait_mint,
        associated_token::authority = avatar)]
    pub avatar_trait_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, token::Token>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EquipTraitAuthority>) -> Result<()> {
    // create trait data for newly equipped trait
    let avatar_account_info = ctx.accounts.avatar.to_account_info();
    ctx.accounts.avatar.add_trait(
        ctx.accounts.trait_account.key(),
        ctx.accounts.trait_account.id,
        ctx.accounts.trait_account.attribute_ids.clone(),
        &ctx.accounts.trait_account.variant_metadata,
        &avatar_account_info,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    );

    // transfer trait token to avatar
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.trait_source.to_account_info(),
        to: ctx.accounts.avatar_trait_ata.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        ),
        1,
    )
}
