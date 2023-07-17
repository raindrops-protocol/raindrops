use crate::state::accounts::{ItemClass, Pack};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(args: CreatePackArgs)]
pub struct CreatePack<'info> {
    #[account(init,
        payer = authority,
        space = Pack::SPACE,
        seeds = [Pack::PREFIX.as_bytes(), item_class.key().as_ref(), &item_class.output_mode.get_index().unwrap().to_le_bytes()], bump)]
    pub pack: Account<'info, Pack>,

    #[account(mut,
        has_one = authority,
        constraint = item_class.output_mode.is_pack(),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

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
        id: ctx.accounts.item_class.output_mode.get_index().unwrap(),
    });

    // increment pack index
    ctx.accounts.item_class.output_mode.increment_index()
}
