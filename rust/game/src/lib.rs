pub mod utils;

use {
    crate::utils::{
        assert_derivation, assert_initialized, assert_owned_by, create_or_allocate_account_raw,
        get_mask_and_index_for_seq, spl_token_burn, spl_token_mint_to, spl_token_transfer,
        TokenBurnParams, TokenTransferParams,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize,
    },
    anchor_spl::token::{Mint, TokenAccount},
    metaplex_token_metadata::instruction::{
        create_master_edition, create_metadata_accounts,
        mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
    },
    spl_token::{
        instruction::{initialize_account2, mint_to},
        state::Account,
    },
};

#[program]
pub mod game {
    use super::*;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Permissiveness {
    All,
    Whitelist,
    Blacklist,
    Namespace
}

pub const MAX_NAMESPACES=10;
pub const GAME_INDEX_SIZE:usize = 8 + MAX_NAMESPACES*32;
#[account]
pub struct GameIndex {
    namespaces: Vec<Pubkey>,
}

/// Seed ['game', game program, mint, namespace, 'whitelist']
#[account]
pub struct GameNamespaceWhitelist {
    namespace: Pubkey
}

/// seed ['game', game program, mint, namespace]
#[account]
pub struct Game {
    mint: Pubkey,
    metadata: Pubkey,
    edition: Pubkey,
    namespace: Pubkey,
    namespace_permissiveness: Permissiveness,
    item_permissiveness: Permissiveness,
    player_permissiveness: Permissiveness,
    mission_permissiveness: Permissiveness
    match_permissiveness: Permissiveness
}

#[account]
pub struct NamespaceWhitelist {
    namespace: Pubkey
}

#[account]
pub struct NamespaceBlacklist {
    namespace: Pubkey
}

pub enum TokenType {
    Player,
    Item,
    Mission
}

pub enum Filter {
    None { padding: [u8; 64] },
    Class { namespace: Pubkey, class: String, padding: [u8; 7] },
    Key { key: Pubkey, padding: [u8; 32] }
}

#[account]
pub struct TokenWhitelist {
    filter: Filter,
    token_type: TokenType,
    mint: Pubkey,
    metadata: Pubkey,
    edition: Pubkey,
}

#[account]
pub struct TokenBlacklist {
    key: Pubkey,
    token_type: TokenType,
    mint: Pubkey,
    metadata: Pubkey,
    edition: Pubkey,
}


#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Numerical overflow error")]
    NumericalOverflowError,
    #[msg("Token mint to failed")]
    TokenMintToFailed,
    #[msg("TokenBurnFailed")]
    TokenBurnFailed,
    #[msg("Derived key is invalid")]
    DerivedKeyInvalid,
}
