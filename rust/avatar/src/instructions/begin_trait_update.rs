use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::{
    state::{
        accounts::{Avatar, AvatarClass, Trait, UpdateState},
        data::{PaymentDetails, UpdateTarget},
        errors::ErrorCode,
    },
    utils::{is_raindrops_fee_vault, pay_raindrops_fee, validate_attribute_availability},
};

#[derive(Accounts)]
#[instruction(args: BeginTraitUpdateArgs)]
pub struct BeginTraitUpdate<'info> {
    #[account(init_if_needed,
        payer = authority,
        space = UpdateState::space(&args.update_target),
        seeds = [UpdateState::PREFIX.as_bytes(), avatar.key().as_ref(), args.update_target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Box<Account<'info, AvatarClass>>,

    #[account(
        has_one = avatar_class,
        has_one = trait_mint,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    #[account(
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    #[account(
        constraint = avatar_mint_ata.amount == 1,
        associated_token::mint = avatar.mint, associated_token::authority = authority)]
    pub avatar_mint_ata: Box<Account<'info, token::TokenAccount>>,

    pub trait_mint: Box<Account<'info, token::Mint>>,

    // we create this here because this ix must be signed by the user and the other steps are done by our API
    // we want to push the bill off to them
    #[account(init_if_needed,
        payer = authority,
        associated_token::mint = trait_mint,
        associated_token::authority = avatar)]
    pub avatar_trait_ata: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: checked by constraint
    #[account(mut, constraint = is_raindrops_fee_vault(raindrops_fee_vault.key()))]
    pub raindrops_fee_vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginTraitUpdateArgs {
    pub update_target: UpdateTarget,
}

pub fn handler(ctx: Context<BeginTraitUpdate>, args: BeginTraitUpdateArgs) -> Result<()> {
    // if the update state has already been initialized, do nothing
    // we have this check here to make this instruction idempotent incase someone is continuing their update
    // we dont want them to pay again or have their update state reset
    if ctx.accounts.update_state.initialized {
        msg!("update_state already initialized");
        return Ok(());
    }

    // get the payment details required for this update
    let required_payment_details = match &args.update_target {
        UpdateTarget::EquipTrait {
            trait_account: trait_account_target,
        } => {
            let trait_account = ctx.accounts.trait_account.clone();

            // assert trait account matches the trait specified in the update target
            require!(
                trait_account.key().eq(trait_account_target),
                ErrorCode::InvalidTrait
            );

            // verify trait is enabled
            let trait_enabled = trait_account.is_enabled();
            require!(trait_enabled, ErrorCode::TraitDisabled);

            // verify all attributes the trait_account requires are available
            let valid = validate_attribute_availability(
                &trait_account.attribute_ids,
                &ctx.accounts.avatar.traits,
                &ctx.accounts.avatar_class.attribute_metadata,
            );
            require!(valid, ErrorCode::InvalidAttributeId);

            trait_account.equip_payment_details.clone()
        }
        UpdateTarget::RemoveTrait {
            trait_account: trait_account_target,
            trait_destination_authority: _,
        } => {
            let trait_account = ctx.accounts.trait_account.clone();

            // assert trait account matches the trait specified in the update target
            require!(
                trait_account.key().eq(trait_account_target),
                ErrorCode::InvalidTrait
            );

            // check trait attributes are mutable
            let mutable = ctx
                .accounts
                .avatar_class
                .is_trait_mutable(trait_account.attribute_ids.clone());
            require!(mutable, ErrorCode::AttributeImmutable);

            // check that trait is not used in a trait gate
            let required = ctx
                .accounts
                .avatar
                .is_required_by_trait_gate(trait_account.key());
            require!(!required, ErrorCode::TraitInUse);

            trait_account.remove_payment_details.clone()
        }
        _ => return Err(ErrorCode::InvalidUpdateTarget.into()),
    };

    // create the starting state for the update_state account
    let current_payment_details =
        required_payment_details
            .as_ref()
            .map(|required_payment_details| PaymentDetails {
                payment_method: required_payment_details.payment_method,
                amount: 0,
            });

    // set the update state fields
    ctx.accounts.update_state.set_inner(UpdateState {
        initialized: true,
        avatar: ctx.accounts.avatar.key(),
        current_payment_details,
        required_payment_details,
        target: args.update_target,
    });

    // pay raindrops fee
    pay_raindrops_fee(
        &ctx.accounts.raindrops_fee_vault.to_account_info(),
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )
}
