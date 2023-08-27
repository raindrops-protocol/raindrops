use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Avatar, AvatarClass, Trait, UpdateState},
    data::UpdateTarget,
    errors::ErrorCode,
};

#[derive(Accounts)]
pub struct UpdateVariant<'info> {
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
        seeds = [Trait::PREFIX.as_bytes(), trait_account.avatar_class.key().as_ref(), trait_account.trait_mint.key().as_ref()], bump)]
    pub trait_account: Option<Account<'info, Trait>>,

    #[account(mut)]
    pub avatar_owner: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UpdateVariant>) -> Result<()> {
    require!(
        ctx.accounts.avatar_mint_ata.delegate.is_none(),
        ErrorCode::TokenDelegateNotAllowed
    );

    match &ctx.accounts.update_state.target {
        UpdateTarget::ClassVariant {
            variant_id,
            option_id,
            ..
        } => {
            // get variant metadata from avatar class
            let variant_metadata = ctx.accounts.avatar_class.find_variant(variant_id);

            // check variant is enabled
            let enabled = variant_metadata.is_enabled();
            require!(enabled, ErrorCode::VariantDisabled);

            // check avatar meets requirements to select the variant
            let new_variant_option = variant_metadata.find_option(option_id);
            let eligible = new_variant_option.is_eligible(&ctx.accounts.avatar.get_traits());
            require!(eligible, ErrorCode::InvalidVariant);

            // update variant selection on the avatar
            let avatar_account_info = ctx.accounts.avatar.to_account_info();
            ctx.accounts.avatar.update_variant_selection(
                new_variant_option.clone(),
                &avatar_account_info,
                ctx.accounts.payer.clone(),
                ctx.accounts.system_program.clone(),
            );
        }
        UpdateTarget::TraitVariant {
            variant_id,
            option_id,
            ..
        } => {
            let trait_account = ctx.accounts.trait_account.clone().unwrap();

            // get the variant metadata for the variant_id we want to change
            let variant_metadata = trait_account.find_variant(variant_id);

            // check variant is enabled
            let enabled = variant_metadata.is_enabled();
            require!(enabled, ErrorCode::VariantDisabled);

            // check avatar meets requirements to select the variant option
            let new_variant_option = variant_metadata.find_option(option_id);
            let eligible = new_variant_option.is_eligible(&ctx.accounts.avatar.get_traits());
            require!(eligible, ErrorCode::InvalidVariant);

            // update trait data with new variant selection
            let avatar_account_info = &ctx.accounts.avatar.to_account_info();
            let trait_data = &mut ctx
                .accounts
                .avatar
                .find_trait_mut(&ctx.accounts.trait_account.as_ref().unwrap().key());

            trait_data.update_variant_selection(
                new_variant_option.clone(),
                avatar_account_info,
                ctx.accounts.payer.clone(),
                ctx.accounts.system_program.clone(),
            );
        }
        _ => return Err(ErrorCode::InvalidUpdateTarget.into()),
    };

    // check payment requirements are met
    require!(
        ctx.accounts.update_state.target.is_paid(),
        ErrorCode::PaymentNotPaid
    );

    ctx.accounts
        .update_state
        .close(ctx.accounts.avatar_owner.to_account_info())
}
