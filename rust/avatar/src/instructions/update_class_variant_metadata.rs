use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{accounts::AvatarClass, data::VariantMetadata};

#[derive(Accounts)]
#[instruction(args: UpdateClassVariantMetadataArgs)]
pub struct UpdateClassVariantMetadata<'info> {
    #[account(mut, seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateClassVariantMetadataArgs {
    pub variant_metadata: VariantMetadata,
}

pub fn handler(
    ctx: Context<UpdateClassVariantMetadata>,
    args: UpdateClassVariantMetadataArgs,
) -> Result<()> {
    let avatar_class = &ctx.accounts.avatar_class.to_account_info();
    ctx.accounts.avatar_class.update_variant_metadata(
        args.variant_metadata,
        avatar_class,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    );
    Ok(())
}
