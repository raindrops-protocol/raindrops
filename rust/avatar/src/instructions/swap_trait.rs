use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{
    state::{
        accounts::{Avatar, AvatarClass, Trait, TraitConflicts, UpdateState},
        data::UpdateTarget,
        errors::ErrorCode,
    },
    utils::{validate_attribute_availability, validate_essential_attribute_updates},
};

#[derive(Accounts)]
pub struct SwapTrait<'info> {
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
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), equip_trait_account.trait_mint.key().as_ref()], bump)]
    pub equip_trait_account: Box<Account<'info, Trait>>,

    #[account(
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), remove_trait_account.trait_mint.key().as_ref()], bump)]
    pub remove_trait_account: Box<Account<'info, Trait>>,

    #[account(
        has_one = avatar_class,
        constraint = equip_trait_conflicts.trait_account.eq(&equip_trait_account.key()),
        seeds = [TraitConflicts::PREFIX.as_bytes(), avatar_class.key().as_ref(), equip_trait_account.key().as_ref()], bump
    )]
    pub equip_trait_conflicts: Account<'info, TraitConflicts>,

    #[account(mut, constraint = equip_trait_source.mint.eq(&equip_trait_account.trait_mint.key()))]
    pub equip_trait_source: Box<Account<'info, token::TokenAccount>>,

    #[account(mut, associated_token::mint = remove_trait_account.trait_mint, associated_token::authority = avatar_authority)]
    pub remove_trait_destination: Account<'info, token::TokenAccount>,

    #[account(mut, associated_token::mint = equip_trait_account.trait_mint, associated_token::authority = avatar)]
    pub avatar_equip_trait_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut, associated_token::mint = remove_trait_account.trait_mint, associated_token::authority = avatar)]
    pub avatar_remove_trait_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub avatar_authority: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, token::Token>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SwapTrait>) -> Result<()> {
    require!(
        ctx.accounts.avatar_mint_ata.delegate.is_none(),
        ErrorCode::TokenDelegateNotAllowed
    );

    // check that update target is swap
    match ctx.accounts.update_state.target {
        UpdateTarget::SwapTrait { .. } => (),
        _ => return Err(ErrorCode::InvalidUpdateTarget.into()),
    }

    // verify equip trait is enabled
    let equip_trait_enabled = ctx.accounts.equip_trait_account.is_enabled();
    require!(equip_trait_enabled, ErrorCode::TraitDisabled);

    // verify remove trait is enabled
    let remove_trait_enabled = ctx.accounts.remove_trait_account.is_enabled();
    require!(remove_trait_enabled, ErrorCode::TraitDisabled);

    // validate that each essential attribute which will be removed is replaced by an equip operation
    validate_essential_attribute_updates(
        &ctx.accounts.avatar_class.attribute_metadata,
        &ctx.accounts.equip_trait_account.attribute_ids,
        &ctx.accounts.remove_trait_account.attribute_ids,
    )?;

    // first we do the remove trait actions so we can properly check the properties of the trait being equipped later on

    // save the current data size before modifying the account to reallocate properly later
    let old_space = ctx.accounts.avatar.current_space();

    // remove trait data
    ctx.accounts
        .avatar
        .remove_trait_data(ctx.accounts.remove_trait_account.key());

    // transfer trait to authority
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.avatar_remove_trait_ata.to_account_info(),
        to: ctx.accounts.remove_trait_destination.to_account_info(),
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
    ctx.accounts.avatar_remove_trait_ata.reload()?;

    // close token account if amount is 0
    if ctx.accounts.avatar_remove_trait_ata.amount == 0 {
        let close_ata_accounts = token::CloseAccount {
            account: ctx.accounts.avatar_remove_trait_ata.to_account_info(),
            destination: ctx.accounts.avatar_authority.to_account_info(),
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
    };

    // now perform the equip operations

    // verify all attributes the equip_trait_account requires are available
    let valid = validate_attribute_availability(
        &ctx.accounts.equip_trait_account.attribute_ids,
        &ctx.accounts.avatar.traits,
        &ctx.accounts.avatar_class.attribute_metadata,
    );
    require!(valid, ErrorCode::InvalidAttributeId);

    // verify there are no trait or attribute conflicts
    let has_conflicts = ctx.accounts.equip_trait_conflicts.has_conflicts(
        &ctx.accounts.avatar.get_trait_ids(),
        &ctx.accounts.avatar.get_attribute_ids(),
    );
    require!(!has_conflicts, ErrorCode::TraitConflict);

    // create trait data for newly equipped trait
    ctx.accounts.avatar.add_trait_data(
        ctx.accounts.equip_trait_account.key(),
        ctx.accounts.equip_trait_account.id,
        ctx.accounts.equip_trait_account.attribute_ids.clone(),
        &ctx.accounts.equip_trait_account.variant_metadata,
        ctx.accounts.equip_trait_account.trait_gate.clone(),
    );

    // transfer trait token to avatar
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.equip_trait_source.to_account_info(),
        to: ctx.accounts.avatar_equip_trait_ata.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        ),
        1,
    )?;

    // now that avatar account data has been modified, reallocate the account data
    let avatar_account_info = ctx.accounts.avatar.to_account_info();
    ctx.accounts.avatar.reallocate(
        old_space as i64,
        &avatar_account_info,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    );

    // check trait gates still pass after changes
    let valid = ctx.accounts.avatar.validate_trait_gates();
    require!(valid, ErrorCode::TraitGateFailure);

    require!(
        ctx.accounts.update_state.target.is_paid(),
        ErrorCode::PaymentNotPaid
    );

    ctx.accounts
        .update_state
        .close(ctx.accounts.avatar_authority.to_account_info())
}
