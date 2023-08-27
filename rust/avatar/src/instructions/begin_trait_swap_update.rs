use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Avatar, AvatarClass, Trait, UpdateState},
    data::{PaymentState, UpdateTarget, UpdateTargetSelection},
    errors::ErrorCode,
};
use crate::utils::validate_essential_attribute_updates;

#[derive(Accounts)]
#[instruction(args: BeginTraitSwapUpdateArgs)]
pub struct BeginTraitSwapUpdate<'info> {
    #[account(init_if_needed,
        payer = authority,
        space = UpdateState::space(&args.update_target),
        seeds = [UpdateState::PREFIX.as_bytes(), avatar.key().as_ref(), args.update_target.hash().as_ref()], bump)]
    pub update_state: Box<Account<'info, UpdateState>>,

    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Box<Account<'info, AvatarClass>>,

    #[account(
        has_one = avatar_class,
        has_one = trait_mint,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_mint.key().as_ref()], bump)]
    pub equip_trait_account: Account<'info, Trait>,

    #[account(
        has_one = avatar_class,
        has_one = trait_mint,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_mint.key().as_ref()], bump)]
    pub remove_trait_account: Account<'info, Trait>,

    #[account(
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    #[account(
        constraint = avatar_mint_ata.amount == 1,
        associated_token::mint = avatar.mint, associated_token::authority = authority)]
    pub avatar_mint_ata: Box<Account<'info, token::TokenAccount>>,

    pub trait_mint: Box<Account<'info, token::Mint>>,

    // we create this here so the updater pays the rent
    #[account(init_if_needed,
        payer = authority,
        associated_token::mint = trait_mint,
        associated_token::authority = avatar)]
    pub avatar_trait_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginTraitSwapUpdateArgs {
    pub update_target: UpdateTargetSelection,
}

pub fn handler(ctx: Context<BeginTraitSwapUpdate>, args: BeginTraitSwapUpdateArgs) -> Result<()> {
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
        UpdateTargetSelection::SwapTrait {
            equip_trait_account: equip_trait_account_address,
            remove_trait_account: remove_trait_account_address,
        } => {
            let equip_trait_account = ctx.accounts.equip_trait_account.clone();
            let remove_trait_account = ctx.accounts.remove_trait_account.clone();

            // assert trait account matches the trait specified in the update target
            require!(
                equip_trait_account.key().eq(equip_trait_account_address),
                ErrorCode::InvalidTrait
            );

            require!(
                remove_trait_account.key().eq(remove_trait_account_address),
                ErrorCode::InvalidTrait
            );

            // check trait attributes are mutable
            let mutable = ctx
                .accounts
                .avatar_class
                .is_trait_mutable(equip_trait_account.attribute_ids.clone());
            require!(mutable, ErrorCode::AttributeImmutable);

            let mutable = ctx
                .accounts
                .avatar_class
                .is_trait_mutable(remove_trait_account.attribute_ids.clone());
            require!(mutable, ErrorCode::AttributeImmutable);

            // check that the removed trait is not used in a trait gate
            let required = ctx
                .accounts
                .avatar
                .is_required_by_trait_gate(remove_trait_account_address);
            require!(!required, ErrorCode::TraitInUse);

            // if the trait being removed occupies an essential slot check that the trait being equipped will occupy those slots
            // this is because essential slots must always be occupied
            validate_essential_attribute_updates(
                &ctx.accounts.avatar_class.attribute_metadata,
                &equip_trait_account.attribute_ids,
                &remove_trait_account.attribute_ids,
            )?;

            // set both payment states
            let equip_payment_state: Option<PaymentState> = equip_trait_account
                .equip_payment_details
                .clone()
                .map(Into::into);
            let remove_payment_state: Option<PaymentState> = remove_trait_account
                .remove_payment_details
                .clone()
                .map(Into::into);

            UpdateTarget::SwapTrait {
                equip_trait_account: equip_trait_account.key(),
                remove_trait_account: remove_trait_account.key(),
                equip_payment_state,
                remove_payment_state,
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
