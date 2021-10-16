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
pub mod player {
    use super::*;
}

pub const EQUIPPED_ITEM_SIZE: usize = 32 + //item 
32 + // item
25 + //body part
25 + // class of item
32; // padding

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EquippedItem {
    item: Pubkey,
    item_program: Pubkey,
    body_part: String,
    class: String,
    padding: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum UpdatePermissiveness {
    TokenHolderCanUpdate,
    PlayerClassHolderCanUpdate,
    AnybodyCanUpdate,
}

pub const MAX_NAMESPACES=10;
pub const PLAYER_CLASS_INDEX_SIZE:usize = 8 + MAX_NAMESPACES*32;


/// To create in a namespaced player you must have namespace signer and hold
/// the NFT OR have your namespace whitelisted in the index.
/// seed ['player', player program, mint]
#[account]
pub struct PlayerClassIndex {
    namespaces: Vec<Pubkey>,
}

/// Seed ['player', player program, mint, namespace, 'whitelist']
#[account]
pub struct PlayerClassNamespaceWhitelist {
    namespace: Pubkey
}

/// seed ['player', player program, mint, namespace]
#[account]
pub struct PlayerClass {
    mint: Pubkey,
    metadata: Pubkey,
    edition: Pubkey,
    starting_stats_uri: String,
    default_class: String,
    /// Inheritance is not enforced, this is just a pointer
    parent: Option<Pubkey>,
    namespace: Pubkey,
    default_update_permissiveness: UpdatePermissiveness,
}

/// seed ['player', player program, mint, namespace] also
#[account]
pub struct Player {
    mint: Pubkey,
    metadata: Pubkey,
    edition: Pubkey,
    parent: Pubkey,
    stats_uri: String,
    class: Option<String>,
    update_permissiveness: Option<UpdatePermissiveness>,
    equipped_items: Vec<EquippedItem>,
}

pub struct BasicStat {}

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
