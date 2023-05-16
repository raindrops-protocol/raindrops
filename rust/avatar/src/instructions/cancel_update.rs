use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Avatar, UpdateState},
    data::UpdateTarget,
};

#[derive(Accounts)]
#[instruction(args: CancelUpdateArgs)]
pub struct CancelUpdate<'info> {
    #[account(mut, seeds = [UpdateState::PREFIX.as_bytes(), avatar.key().as_ref(), args.update_target.hash().as_ref()], bump)]
    pub update_state: Account<'info, UpdateState>,

    #[account(seeds = [Avatar::PREFIX.as_bytes(), avatar.avatar_class.key().as_ref(), avatar.mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    #[account(
        constraint = avatar_mint_ata.amount == 1,
        associated_token::mint = avatar.mint, associated_token::authority = authority)]
    pub avatar_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CancelUpdateArgs {
    pub update_target: UpdateTarget,
}

pub fn handler(ctx: Context<CancelUpdate>, _args: CancelUpdateArgs) -> Result<()> {
    ctx.accounts
        .update_state
        .close(ctx.accounts.authority.to_account_info())
}
