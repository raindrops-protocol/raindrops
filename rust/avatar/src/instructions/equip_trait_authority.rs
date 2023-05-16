use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Avatar, AvatarClass, Trait},
    data::TraitData,
    errors::ErrorCode,
};

#[derive(Accounts)]
pub struct EquipTraitAuthority<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(
        has_one = trait_mint,
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    pub trait_mint: Box<Account<'info, token::Mint>>,

    #[account(mut,
        associated_token::mint = trait_mint,
        associated_token::authority = authority)]
    pub trait_source: Box<Account<'info, token::TokenAccount>>,

    #[account(init_if_needed,
        payer = authority,
        associated_token::mint = trait_mint,
        associated_token::authority = avatar)]
    pub avatar_trait_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EquipTraitAuthority>) -> Result<()> {
    // verify all attributes the trait_account requires are available
    let valid = validate_attribute_availability(
        &ctx.accounts.trait_account.attribute_ids,
        &ctx.accounts.avatar.traits,
    );
    require!(valid, ErrorCode::InvalidAttributeId);

    // create trait data for newly equipped trait
    let avatar_account_info = ctx.accounts.avatar.to_account_info();
    ctx.accounts.avatar.add_trait(
        ctx.accounts.trait_account.key(),
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

fn validate_attribute_availability(
    required_attribute_ids: &Vec<u16>,
    equipped_avatar_traits: &[TraitData],
) -> bool {
    for id in required_attribute_ids {
        // check that the required attribute ids are not occupied
        let occupied = equipped_avatar_traits
            .iter()
            .any(|equipped_avatar_trait| equipped_avatar_trait.attribute_ids.contains(id));
        if occupied {
            return false;
        }
    }

    true
}
