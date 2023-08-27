use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{
    state::{
        accounts::{Avatar, AvatarClass, Trait, UpdateState},
        errors::ErrorCode,
    },
    utils::get_essential_attribute_ids,
};

#[derive(Accounts)]
pub struct RemoveTrait<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Box<Account<'info, Avatar>>,

    #[account(
        constraint = avatar_mint_ata.amount == 1,
        associated_token::mint = avatar.mint, associated_token::authority = avatar_owner)]
    pub avatar_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut,
        has_one = avatar,
        seeds = [UpdateState::PREFIX.as_bytes(), avatar.key().as_ref(), update_state.target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_account.trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    #[account(mut)]
    pub trait_destination: Account<'info, token::TokenAccount>,

    #[account(mut,
        associated_token::mint = trait_account.trait_mint,
        associated_token::authority = avatar)]
    pub avatar_trait_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub avatar_owner: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, token::Token>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RemoveTrait>) -> Result<()> {
    require!(
        ctx.accounts.avatar_mint_ata.delegate.is_none(),
        ErrorCode::TokenDelegateNotAllowed
    );

    // check trait attributes are mutable
    let mutable = ctx
        .accounts
        .avatar_class
        .is_trait_mutable(ctx.accounts.trait_account.attribute_ids.clone());
    require!(mutable, ErrorCode::AttributeImmutable);

    // check that trait is not used in a trait gate
    let required = ctx
        .accounts
        .avatar
        .is_required_by_trait_gate(&ctx.accounts.trait_account.key());
    require!(!required, ErrorCode::TraitInUse);

    // check that trait is not being removed from an essential slot
    let essential_ids = get_essential_attribute_ids(
        &ctx.accounts.avatar_class.attribute_metadata,
        &ctx.accounts.trait_account.attribute_ids,
    );
    require!(essential_ids.len() == 0, ErrorCode::InvalidAttributeId);

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

    // reload account data to check token account amount
    ctx.accounts.avatar_trait_ata.reload()?;

    // close token account if amount is 0
    if ctx.accounts.avatar_trait_ata.amount == 0 {
        let close_ata_accounts = token::CloseAccount {
            account: ctx.accounts.avatar_trait_ata.to_account_info(),
            destination: ctx.accounts.avatar_owner.to_account_info(),
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

    // remove the trait_data
    let avatar_account_info = ctx.accounts.avatar.to_account_info();
    ctx.accounts.avatar.remove_trait(
        ctx.accounts.trait_account.key(),
        &avatar_account_info,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    );

    require!(
        ctx.accounts.update_state.target.is_paid(),
        ErrorCode::PaymentNotPaid
    );

    ctx.accounts
        .update_state
        .close(ctx.accounts.avatar_owner.to_account_info())
}
