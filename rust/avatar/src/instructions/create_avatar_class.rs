use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::AvatarClass,
    data::{AttributeMetadata, VariantMetadata},
};

#[derive(Accounts)]
#[instruction(args: CreateAvatarClassArgs)]
pub struct CreateAvatarClass<'info> {
    #[account(init,
        payer = authority,
        space = AvatarClass::space(args.attribute_metadata, args.variant_metadata, args.global_rendering_config_uri.len()),
        seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class_mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    pub avatar_class_mint: Account<'info, token::Mint>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class_mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateAvatarClassArgs {
    pub attribute_metadata: Vec<AttributeMetadata>,
    pub variant_metadata: Vec<VariantMetadata>,
    pub global_rendering_config_uri: String,
}

pub fn handler(ctx: Context<CreateAvatarClass>, args: CreateAvatarClassArgs) -> Result<()> {
    ctx.accounts.avatar_class.set_inner(AvatarClass {
        mint: ctx.accounts.avatar_class_mint.key(),
        trait_index: 0,
        payment_index: 0,
        attribute_metadata: args.attribute_metadata,
        variant_metadata: args.variant_metadata,
        global_rendering_config_uri: args.global_rendering_config_uri,
    });

    Ok(())
}
