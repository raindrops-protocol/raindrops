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
pub mod item {
    use super::*;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Callback(pubkey, u64)

pub const MAX_BASIC_ITEM_EFFECTS: usize = 5;
pub const ITEM_USAGE_SIZE: usize =
    147 + ITEM_USAGE_TYPE_SIZE + 1 + MAX_BASIC_ITEM_EFFECTS * BASIC_ITEM_EFFECT_SIZE; // needs to include basic item effect max size
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsage {
    Wearable {
        body_part: Vec<String>,                          // limit 25 bytes
        class: Vec<String>,                              // limit 25 bytes
        limit_per_part: Option<u64>,                     // 9
        wearable_callback: Option<Callback>,               // 41
        basic_item_effect: Option<Vec<BasicItemEffect>>, // BASIC_ITEM_EFFECT_SIZE
        padding: [u8; 31],
        padding2: [u8; 19],
    },
    Consumable {
        class: Vec<String>,                              // limit 25 bytes
        uses: u64,                                       // 8
        total_uses: u64,                                 // 8
        item_usage_type: ItemUsageType,                  //  ITEM_USAGE_TYPE_SIZE
        consumption_callback: Option<Callback>,            // 41
        basic_item_effect: Option<Vec<BasicItemEffect>>, // BASIC_ITEM_EFFECT_SIZE
        padding: [u8; 32],
        padding2: [u8; 4],
    },
}

pub const ITEM_USAGE_TYPE_SIZE: usize = 32;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageType {
    Cooldown { duration: i64, padding: [u8; 24] },
    Exhaustion { padding: [u8; 32] },
    Destruction { padding: [u8; 32] },
    Infinite { padding: [u8; 32] },
}

pub const BASIC_ITEM_EFFECT_SIZE: usize = 8 + 9 + 9 + 25 + 32;
pub enum BasicItemEffect {
    Increment {
        amount: u64,
        stat: String,
        active_duration: Option<i64>,
        activated_at: Option<i64>,
        padding: [u8; 32],
    },
    Decrement {
        amount: u64,
        stat: String,
        active_duration: Option<i64>,
        activated_at: Option<i64>,
        padding: [u8; 32],
    },
    IncrementPercent {
        amount: u8,
        stat: String,
        active_duration: Option<i64>,
        activated_at: Option<i64>,
        padding: [u8; 32],
        padding: [u8; 7],
    },
    DecrementPercent {
        amount: u8,
        stat: String,
        active_duration: Option<i64>,
        activated_at: Option<i64>,
        padding: [u8; 32],
        padding: [u8; 7],
    },
    IncrementPercentFromBase {
        amount: u8,
        stat: String,
        active_duration: Option<i64>,
        activated_at: Option<i64>,
        padding: [u8; 32],
        padding: [u8; 7],
    },
    IncrementPercentFromBase {
        amount: u8,
        stat: String,
        active_duration: Option<i64>,
        activated_at: Option<i64>,
        padding: [u8; 32],
        padding: [u8; 7],
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ComponentCondition {
    Consumed,
    Presence,
    Absence,
}

pub const COMPONENT_SIZE: usize = 32 + // mint
8 + //amount
1 + // non cooldown required
1 + // condition
32; //padding
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Component {
    mint: Pubkey,
    amount: u64,
    non_cooldown_required: bool,
    condition: ComponentCondition,
    padding: [u8; 32],
}

pub const MAX_SCOPES:usize =5;
pub const MAX_COMPONENTS:usize =10;
pub const MAX_ITEM_USAGES:usize = 10;

pub const ITEM_SIZE = 8 + // key
32 + // authority
33 + // parent
MAX_SCOPES*32 +// scopes
32 + // mint
32 + // metadata
33 + // edition
25 + // default class
MAX_ITEM_USAGES*ITEM_USAGE_SIZE + // item usages
COMPONENT_SIZE*MAX_COMPONENTS +
200; //padding


#[account]
pub struct Item {
    authority: Pubkey,
    parent: Option<Pubkey>,
    scopes: Option<Vec<Pubkey>>,
    mint: Pubkey,
    metadata: Pubkey,
    edition: Option<Pubkey>,
    default_class: String,
    usages: Vec<ItemUsage>,
    components: Vec<Component>,
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
