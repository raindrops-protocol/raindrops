use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Avatar, AvatarClass, Trait, UpdateState},
    data::{PaymentState, UpdateTarget, UpdateTargetSelection},
    errors::ErrorCode,
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
pub struct BeginTraitUpdateArgs {
    pub update_target: UpdateTargetSelection,
}

pub fn handler(ctx: Context<BeginTraitUpdate>, args: BeginTraitUpdateArgs) -> Result<()> {
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
        UpdateTargetSelection::EquipTrait {
            trait_account: trait_account_address,
        } => {
            let trait_account = ctx.accounts.trait_account.clone();

            // verify trait account passed into accounts array matches the UpdateTarget
            require!(
                trait_account_address.eq(&trait_account.key()),
                ErrorCode::InvalidTrait
            );

            let payment_state: Option<PaymentState> =
                trait_account.equip_payment_details.clone().map(Into::into);

            UpdateTarget::EquipTrait {
                trait_account: trait_account.key(),
                payment_state: payment_state,
            }
        }
        UpdateTargetSelection::RemoveTrait {
            trait_account: trait_account_address,
        } => {
            let trait_account = ctx.accounts.trait_account.clone();

            // verify trait account passed into accounts array matches the UpdateTarget
            require!(
                trait_account_address.eq(&trait_account.key()),
                ErrorCode::InvalidTrait
            );

            let payment_state: Option<PaymentState> =
                trait_account.equip_payment_details.clone().map(Into::into);

            UpdateTarget::RemoveTrait {
                trait_account: trait_account.key(),
                payment_state: payment_state,
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
