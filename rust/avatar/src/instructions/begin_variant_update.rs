use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Avatar, AvatarClass, Trait, UpdateState},
    data::{PaymentState, UpdateTarget, UpdateTargetSelection},
    errors::ErrorCode,
};

#[derive(Accounts)]
#[instruction(args: BeginVariantUpdateArgs)]
pub struct BeginVariantUpdate<'info> {
    #[account(init_if_needed, payer = authority, space = UpdateState::space(&args.update_target), seeds = [UpdateState::PREFIX.as_bytes(), avatar.key().as_ref(), args.update_target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Box<Account<'info, AvatarClass>>,

    #[account(
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_account.trait_mint.key().as_ref()], bump)]
    pub trait_account: Option<Account<'info, Trait>>,

    #[account(
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    #[account(
        constraint = avatar_mint_ata.amount == 1,
        associated_token::mint = avatar.mint, associated_token::authority = authority)]
    pub avatar_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginVariantUpdateArgs {
    pub update_target: UpdateTargetSelection,
}

pub fn handler(ctx: Context<BeginVariantUpdate>, args: BeginVariantUpdateArgs) -> Result<()> {
    require!(
        ctx.accounts.avatar_mint_ata.delegate.is_none(),
        ErrorCode::TokenDelegateNotAllowed
    );

    // if the update state has already been initialized, do nothing
    // we have this check here to make this instruction idempotent incase someone is continuing their update
    // we dont want them to pay again or have their update state reset
    if ctx.accounts.update_state.initialized {
        msg!("update_state already initialized");
        return Ok(());
    }

    // get the payment details required for this update
    let update_target: UpdateTarget = match &args.update_target {
        UpdateTargetSelection::ClassVariant {
            variant_id,
            option_id,
        } => {
            // get variant metadata from avatar class
            let variant_metadata = ctx.accounts.avatar_class.find_variant(variant_id);
            let new_variant_option = variant_metadata.find_option(option_id);

            let payment_state: Option<PaymentState> =
                new_variant_option.payment_details.map(Into::into);

            UpdateTarget::ClassVariant {
                variant_id: variant_id.to_string(),
                option_id: option_id.to_string(),
                payment_state,
            }
        }
        UpdateTargetSelection::TraitVariant {
            variant_id,
            option_id,
            trait_account: trait_account_target,
        } => {
            let trait_account = ctx.accounts.trait_account.clone().unwrap();

            // assert trait account matches the trait specified in the update target
            require!(
                trait_account.key().eq(trait_account_target),
                ErrorCode::InvalidTrait
            );

            // get the variant metadata for the variant_id we want to change
            let variant_metadata = trait_account.find_variant(variant_id);
            let new_variant_option = variant_metadata.find_option(option_id);

            let payment_state: Option<PaymentState> =
                new_variant_option.payment_details.map(Into::into);

            UpdateTarget::TraitVariant {
                variant_id: variant_id.to_string(),
                option_id: option_id.to_string(),
                payment_state,
                trait_account: *trait_account_target,
            }
        }
        _ => return Err(ErrorCode::InvalidUpdateTarget.into()),
    };

    // set the update state fields
    ctx.accounts.update_state.set_inner(UpdateState {
        initialized: true,
        avatar: ctx.accounts.avatar.key(),
        target: update_target,
    });

    Ok(())
}
