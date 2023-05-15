use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Avatar, AvatarClass},
    errors::ErrorCode,
};

#[derive(Accounts)]
pub struct UpdateClassVariantAuthority<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.key().as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Box<Account<'info, Avatar>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateClassVariantAuthorityArgs {
    pub variant_id: String,
    pub new_variant_option_id: String,
}

pub fn handler(
    ctx: Context<UpdateClassVariantAuthority>,
    args: UpdateClassVariantAuthorityArgs,
) -> Result<()> {
    // get variant metadata from avatar class
    let variant_metadata = ctx.accounts.avatar_class.find_variant(&args.variant_id);

    // check avatar meets requirements to select the variant
    let new_variant_option = variant_metadata.find_option(&args.new_variant_option_id);
    let eligible = new_variant_option.is_eligible(&ctx.accounts.avatar.get_traits());
    require!(eligible, ErrorCode::InvalidVariant);

    // update variant selection on the avatar
    let avatar_account_info = ctx.accounts.avatar.to_account_info();
    ctx.accounts.avatar.update_variant_selection(
        new_variant_option,
        &avatar_account_info,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    );

    Ok(())
}
