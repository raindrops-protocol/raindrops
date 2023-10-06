use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{accounts::AvatarClass, data::AttributeMetadata};

#[derive(Accounts)]
#[instruction(args: UpdateAttributeMetadataArgs)]
pub struct UpdateAttributeMetadata<'info> {
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
pub struct UpdateAttributeMetadataArgs {
    pub attribute_metadata: AttributeMetadata,
}

pub fn handler(
    ctx: Context<UpdateAttributeMetadata>,
    args: UpdateAttributeMetadataArgs,
) -> Result<()> {
    let avatar_class = &ctx.accounts.avatar_class.to_account_info();
    ctx.accounts.avatar_class.update_attribute_metadata(
        args.attribute_metadata,
        avatar_class,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    );
    Ok(())
}
