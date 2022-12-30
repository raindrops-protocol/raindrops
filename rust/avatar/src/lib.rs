use anchor_lang::prelude::*;
use raindrops_player::{PlayerClass, ID as PlayerProgramID};

declare_id!("HPhmNTrxHWs8JzCYxx8c479Ya8wju2roKF61vTCEWQGW");

#[program]
pub mod avatar {
    use super::*;

    pub fn create_avatar(ctx: Context<CreateAvatar>) -> Result<()> {
        let avatar_data = &mut ctx.accounts.avatar;
        avatar_data.player_class = ctx.accounts.player_class.key();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateAvatar<'info> {
    #[account(init,
        space = Avatar::SPACE,
        payer = player_authority,
        seeds = [player_class.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    pub player_class: Account<'info, PlayerClass>,

    #[account(mut)]
    pub player_authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub player_program: Program<'info, PlayerProgram>,
}

#[account]
pub struct Avatar {
    pub player_class: Pubkey,
}

impl Avatar {
    pub const SPACE: usize = 8 + // anchor bytes
    32; // player_class
}

// TODO: implement these and export them in their own crates
#[derive(Clone)]
pub struct PlayerProgram;

impl anchor_lang::Id for PlayerProgram {
    fn id() -> Pubkey {
        PlayerProgramID
    }
}
