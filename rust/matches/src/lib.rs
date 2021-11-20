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
anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");

#[program]
pub mod matches {
    use super::*;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum MatchState {
    Draft,
    Initialized,
    Started,
    Finalized,
    PaidOut,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Permissiveness {
    All,
    Whitelist,
    Blacklist,
    Namespace,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OracleCallback(pub Pubkey, pub u8);

#[account]
pub struct Match {
    indexed: bool,
    game: Pubkey,
    namespace: Pubkey,
    // Win oracle must always present some rewards struct
    // for redistributing items
    win_oracle: Pubkey,
    win_oracle_cooldown: i64,
    authority: Pubkey,
    state: MatchState,
    players: u64,
    /// Increased by 1 every time the next token transfer
    /// in the win oracle is completed.
    current_token_transfer_index: u64,
    entry_permissiveness: Permissiveness,
    // Can do fancy stuff here, and/or blow up (validation)
    entry_oracle_callback: Option<OracleCallback>,
}

#[account]
pub struct PlayerWinCallbackBitmap {
    match_key: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenDelta {
    from_player: Pubkey,
    /// if no to, token is burned
    to_player: Option<Pubkey>,
    /// can be the player itself - player becomes item
    /// in inventory
    token_account: Pubkey,
    mint: Pubkey,
    amount: u64,
}

// Oracles must match this serde
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WinOracle {
    token_transfers: Vec<TokenDelta>,
    /// If for each player you want to do a callback where some program
    /// edits the user in some way.
    player_callback: Option<OracleCallback>,
}

#[account]
pub struct NamespaceWhitelist {
    namespace: Pubkey,
}

#[account]
pub struct NamespaceBlacklist {
    namespace: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TokenType {
    /// No missions explicitly.
    Player,
    Item,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Filter {
    None {
        padding: [u8; 64],
    },
    Class {
        namespace: Pubkey,
        category: String,
        padding: [u8; 7],
    },
    Key {
        key: Pubkey,
        padding: [u8; 32],
    },
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
    filter: Filter,
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
