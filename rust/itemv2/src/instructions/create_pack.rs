use crate::state::{
    accounts::{ItemClass, Pack},
    errors::ErrorCode,
};
use anchor_lang::prelude::*;
use anchor_spl::token;

#[derive(Accounts)]
#[instruction(args: CreatePackArgs)]
pub struct CreatePack<'info> {
    #[account(init,
        payer = authority,
        space = Pack::SPACE,
        seeds = [Pack::PREFIX.as_bytes(), item_class.key().as_ref(), &item_class.mode.get_index().unwrap().to_le_bytes()], bump)]
    pub pack: Account<'info, Pack>,

    #[account(mut,
        constraint = item_class.authority_mint.eq(&item_class_authority_mint.key()),
        constraint = item_class.mode.is_pack() @ ErrorCode::InvalidItemClassMode,
        seeds = [ItemClass::PREFIX.as_bytes(), item_class_authority_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mint::authority = item_class)]
    pub item_class_authority_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_authority_mint_ata.amount >= 1,
        associated_token::mint = item_class_authority_mint, associated_token::authority = authority)]
    pub item_class_authority_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreatePackArgs {
    pub contents_hash: [u8; 32],
}

pub fn handler(ctx: Context<CreatePack>, args: CreatePackArgs) -> Result<()> {
    // set pack contents and metadata
    ctx.accounts.pack.set_inner(Pack {
        contents_hash: args.contents_hash,
        item_class: ctx.accounts.item_class.key(),
        id: ctx.accounts.item_class.mode.get_index().unwrap(),
    });

    // increment pack index
    ctx.accounts.item_class.mode.increment_index()
}
