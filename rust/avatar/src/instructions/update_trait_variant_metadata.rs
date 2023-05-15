use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{AvatarClass, Trait},
    data::VariantMetadata,
};

#[derive(Accounts)]
#[instruction(args: UpdateTraitVariantMetadataArgs)]
pub struct UpdateTraitVariantMetadata<'info> {
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
pub struct UpdateTraitVariantMetadataArgs {
    pub variant_metadata: VariantMetadata,
}

pub fn handler(
    ctx: Context<UpdateTraitVariantMetadata>,
    args: UpdateTraitVariantMetadataArgs,
) -> Result<()> {
    let trait_account = &ctx.accounts.trait_account.to_account_info();
    ctx.accounts.trait_account.update_variant_metadata(
        args.variant_metadata,
        trait_account,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    );
    Ok(())
}
