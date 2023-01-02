use anchor_lang::prelude::*;

declare_id!("HPhmNTrxHWs8JzCYxx8c479Ya8wju2roKF61vTCEWQGW");

pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod avatar {
    use super::*;

    pub fn create_avatar(ctx: Context<CreateAvatar>) -> Result<()> {
        instructions::create_avatar::handler(ctx)
    }

    pub fn create_player_class<'info>(ctx: Context<'_, '_, '_, 'info, CreatePlayerClass<'info>>) -> Result<()> {
        instructions::create_player_class::handler(ctx)
    }
}
