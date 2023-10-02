use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::{
    state::{
        accounts::{AvatarClass, Trait},
        data::{PaymentDetails, TraitGate, VariantMetadata, VariantOption},
    },
    utils::reallocate,
};

#[derive(Accounts)]
#[instruction(args: UpdateTraitArgs)]
pub struct UpdateTrait<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Trait::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_account.trait_mint.key().as_ref()], bump)]
    pub trait_account: Account<'info, Trait>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateTraitArgs {
    pub variant_metadata: Option<VariantMetadata>,
    pub variant_option: Option<VariantOption>,
    pub equip_payment_details: Option<PaymentDetails>,
    pub remove_payment_details: Option<PaymentDetails>,
    pub trait_gate: Option<TraitGate>,
}

pub fn handler(ctx: Context<UpdateTrait>, args: UpdateTraitArgs) -> Result<()> {
    let trait_account = &ctx.accounts.trait_account.to_account_info();

    let old_space: i64 = ctx.accounts.trait_account.current_space() as i64;

    if let Some(variant_metadata) = args.variant_metadata {
        ctx.accounts.trait_account.update_variant_metadata(
            variant_metadata,
            trait_account,
            ctx.accounts.authority.clone(),
            ctx.accounts.system_program.clone(),
        );
    };

    if let Some(variant_option) = args.variant_option {
        ctx.accounts.trait_account.update_variant_option(
            variant_option,
            trait_account,
            ctx.accounts.authority.clone(),
            ctx.accounts.system_program.clone(),
        );
    };

    if let Some(equip_payment_details) = args.equip_payment_details {
        ctx.accounts.trait_account.equip_payment_details = Some(equip_payment_details);
    }

    if let Some(remove_payment_details) = args.remove_payment_details {
        ctx.accounts.trait_account.remove_payment_details = Some(remove_payment_details);
    }

    if let Some(trait_gate) = args.trait_gate {
        ctx.accounts.trait_account.trait_gate = Some(trait_gate);
    }

    let new_space: i64 = ctx.accounts.trait_account.current_space() as i64;

    let diff: i64 = new_space - old_space;

    reallocate(
        diff,
        trait_account,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )
}
