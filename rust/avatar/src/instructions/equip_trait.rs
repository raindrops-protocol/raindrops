use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{
    state::{
        accounts::{Avatar, AvatarClass, Trait, TraitConflicts, UpdateState},
        data::UpdateTarget,
        errors::ErrorCode,
    },
    utils::validate_attribute_availability,
};

#[derive(Accounts)]
pub struct EquipTrait<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Box<Account<'info, Avatar>>,

    #[account(
        constraint = avatar_mint_ata.amount == 1,
        associated_token::mint = avatar.mint, associated_token::authority = avatar_authority)]
    pub avatar_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut,
        has_one = avatar,
        seeds = [UpdateState::PREFIX.as_bytes(), avatar.key().as_ref(), update_state.target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_account.trait_mint.key().as_ref()], bump)]
    pub trait_account: Box<Account<'info, Trait>>,

    #[account(
        has_one = avatar_class,
        has_one = trait_account,
        seeds = [TraitConflicts::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_account.key().as_ref()], bump
    )]
    pub trait_conflicts: Account<'info, TraitConflicts>,

    #[account(mut, constraint = trait_source.mint.eq(&trait_account.trait_mint.key()))]
    pub trait_source: Box<Account<'info, token::TokenAccount>>,

    #[account(mut, associated_token::mint = trait_account.trait_mint, associated_token::authority = avatar)]
    pub avatar_trait_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub avatar_authority: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, token::Token>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EquipTrait>) -> Result<()> {
    require!(
        ctx.accounts.avatar_mint_ata.delegate.is_none(),
        ErrorCode::TokenDelegateNotAllowed
    );

    // check that update target is equip trait
    match ctx.accounts.update_state.target {
        UpdateTarget::EquipTrait { .. } => (),
        _ => return Err(ErrorCode::InvalidUpdateTarget.into()),
    }

    // verify trait is enabled
    let trait_enabled = ctx.accounts.trait_account.is_enabled();
    require!(trait_enabled, ErrorCode::TraitDisabled);

    // verify all attributes the trait_account requires are available
    let valid = validate_attribute_availability(
        &ctx.accounts.trait_account.attribute_ids,
        &ctx.accounts.avatar.traits,
        &ctx.accounts.avatar_class.attribute_metadata,
    );
    require!(valid, ErrorCode::InvalidAttributeId);

    // verify there are no trait or attribute conflicts
    let has_conflicts = ctx.accounts.trait_conflicts.has_conflicts(
        &ctx.accounts.avatar.get_trait_ids(),
        &ctx.accounts.avatar.get_attribute_ids(),
    );
    require!(!has_conflicts, ErrorCode::TraitConflict);

    // create trait data for newly equipped trait
    let avatar_account_info = ctx.accounts.avatar.to_account_info();
    ctx.accounts.avatar.add_trait(
        ctx.accounts.trait_account.key(),
        ctx.accounts.trait_account.id,
        ctx.accounts.trait_account.attribute_ids.clone(),
        &ctx.accounts.trait_account.variant_metadata,
        ctx.accounts.trait_account.trait_gate.clone(),
        &avatar_account_info,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    );

    // check trait gates still pass after changes
    let valid = ctx.accounts.avatar.validate_trait_gates();
    require!(valid, ErrorCode::TraitGateFailure);

    // transfer trait token to avatar
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.trait_source.to_account_info(),
        to: ctx.accounts.avatar_trait_ata.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        ),
        1,
    )?;

    require!(
        ctx.accounts.update_state.target.is_paid(),
        ErrorCode::PaymentNotPaid
    );

    ctx.accounts
        .update_state
        .close(ctx.accounts.avatar_authority.to_account_info())
}
