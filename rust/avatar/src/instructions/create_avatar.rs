use anchor_lang::prelude::*;

use crate::state::{Avatar, PlayerProgram};
use raindrops_player::Player;

pub fn handler(_ctx: Context<CreateAvatar>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct CreateAvatar<'info> {
    #[account(init,
        space = Avatar::SPACE,
        payer = player_authority,
        seeds = [b"player"], bump)]
    pub avatar: Account<'info, Avatar>,

    pub player: Account<'info, Player>,

    #[account(mut)]
    pub player_authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub player_program: Program<'info, PlayerProgram>,
}
