use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Avatar, AvatarClass, Trait, UpdateState},
    errors::ErrorCode,
};

#[derive(Accounts)]
pub struct RemoveTrait<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Box<Account<'info, Avatar>>,

    #[account(mut,
        has_one = avatar,
        seeds = [UpdateState::PREFIX.as_bytes(), avatar.key().as_ref(), update_state.target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(
        has_one = trait_mint,
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    pub trait_mint: Box<Account<'info, token::Mint>>,

    #[account(mut, address = update_state.target.get_remove_trait_destination(&trait_mint.key()).unwrap())]
    pub trait_destination: Account<'info, token::TokenAccount>,

    #[account(mut,
        associated_token::mint = trait_mint,
        associated_token::authority = avatar)]
    pub avatar_trait_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, token::Token>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RemoveTrait>) -> Result<()> {
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
        .is_required_by_trait_gate(ctx.accounts.trait_account.key());
    require!(!required, ErrorCode::TraitInUse);

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
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    );
    
    // verify update state
    match &ctx.accounts.trait_account.equip_payment_details {
        Some(payment_details) => {
            let update_state = &ctx.accounts.update_state;

            // check the payment has been paid
            payment_details.is_paid(&ctx.accounts.update_state).unwrap();

            // close state account
            update_state.close(ctx.accounts.payer.to_account_info())
        }
        None => ctx
            .accounts
            .update_state
            .close(ctx.accounts.payer.to_account_info()),
    }
}
