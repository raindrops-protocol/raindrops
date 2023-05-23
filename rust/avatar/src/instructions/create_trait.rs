use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{
    state::{
        accounts::{AvatarClass, Trait, TraitConflicts},
        data::{AttributeMetadata, PaymentDetails, TraitStatus, VariantMetadata},
        errors::ErrorCode,
    },
    utils::{is_rain_vault, pay_rain_fee},
};

#[derive(Accounts)]
#[instruction(args: CreateTraitArgs)]
pub struct CreateTrait<'info> {
    #[account(mut, seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(init,
        payer = authority,
        space = Trait::space(args.component_uri.len(), args.attribute_ids.len(), args.variant_metadata),
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    pub trait_mint: Box<Account<'info, token::Mint>>,

    #[account(init,
        payer = authority,
        space = TraitConflicts::INIT_SPACE,
        seeds = [TraitConflicts::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_account.key().as_ref()], bump)]
    pub trait_conflicts: Account<'info, TraitConflicts>,

    #[account(mut, constraint = is_rain_vault(rain_vault.key()))]
    pub rain_vault: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority_rain_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateTraitArgs {
    pub component_uri: String,
    pub attribute_ids: Vec<u16>,
    pub variant_metadata: Vec<VariantMetadata>,
    pub trait_status: TraitStatus,
    pub equip_payment_details: Option<PaymentDetails>,
    pub remove_payment_details: Option<PaymentDetails>,
}

pub fn handler(ctx: Context<CreateTrait>, args: CreateTraitArgs) -> Result<()> {
    // pay $RAIN
    pay_rain_fee(
        ctx.accounts.authority_rain_ata.to_account_info(),
        ctx.accounts.rain_vault.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    )?;

    let valid = validate_attribute_ids(
        args.attribute_ids.clone(),
        ctx.accounts.avatar_class.attribute_metadata.clone(),
    );
    require!(valid, ErrorCode::InvalidAttributeId);

    ctx.accounts.trait_account.set_inner(Trait {
        id: ctx.accounts.avatar_class.trait_index,
        avatar_class: ctx.accounts.avatar_class.key(),
        trait_mint: ctx.accounts.trait_mint.key(),
        attribute_ids: args.attribute_ids,
        variant_metadata: args.variant_metadata,
        component_uri: args.component_uri,
        status: args.trait_status,
        equip_payment_details: args.equip_payment_details,
        remove_payment_details: args.remove_payment_details,
        trait_gate: None,
    });

    // increment trait index on the avatar class
    ctx.accounts.avatar_class.trait_index += 1;

    // init the trait conflicts accounts with 0 conflicts specified
    ctx.accounts.trait_conflicts.set_inner(TraitConflicts {
        avatar_class: ctx.accounts.avatar_class.key(),
        trait_account: ctx.accounts.trait_account.key(),
        attribute_conflicts: vec![],
        trait_conflicts: vec![],
    });

    Ok(())
}

// verify that attribute_ids exist in the metadata
fn validate_attribute_ids(
    attribute_ids: Vec<u16>,
    attribute_metadata: Vec<AttributeMetadata>,
) -> bool {
    for id in attribute_ids {
        if !attribute_metadata.iter().any(|am| am.id == id) {
            return false;
        }
    }

    true
}
