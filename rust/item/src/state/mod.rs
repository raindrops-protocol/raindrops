use anchor_lang::prelude::*;
use mpl_token_metadata::ID as TokenMetadataPID;

pub mod errors;
pub mod accounts;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Material {
    pub item_mint: Option<Pubkey>,
    pub item_class: Pubkey,
    pub amount: u64,
}

impl Material {
    pub const SPACE: usize = 32 + // item class
    (1 + 32) + // item mint
    8; // amount
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum BuildStatus {
    InProgress,
    Complete,
    ItemReceived
}

// anchor wrapper for Noop Program required for spl-account-compression
#[derive(Clone)]
pub struct NoopProgram;

impl anchor_lang::Id for NoopProgram {
    fn id() -> Pubkey {
        spl_noop::ID
    }
}

// anchor wrapper for Token Metadata Program
#[derive(Clone)]
pub struct TokenMetadataProgram;

impl anchor_lang::Id for TokenMetadataProgram {
    fn id() -> Pubkey {
        TokenMetadataPID
    }
}
