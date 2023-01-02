use anchor_lang::prelude::*;
use raindrops_player::ID as PlayerProgramID;

#[account]
pub struct Avatar {
    pub player: Pubkey,
}

impl Avatar {
    pub const SPACE: usize = 8 + // anchor bytes
    32; // player
}

// TODO: implement these and export them in their own crates
#[derive(Clone)]
pub struct PlayerProgram;

impl anchor_lang::Id for PlayerProgram {
    fn id() -> Pubkey {
        PlayerProgramID
    }
}

// fulfill anchor Program interface
#[derive(Clone)]
pub struct MetadataProgram;

impl anchor_lang::Id for MetadataProgram {
    fn id() -> Pubkey {
        mpl_token_metadata::ID
    }
}
