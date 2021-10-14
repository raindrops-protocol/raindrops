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

pub const ITEM_USAGE_SIZE: usize = 91;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsage {
    Wearable {
        // 25 + 25 + 9 + 32
        body_part: String, // limit 25
        class: String,     // limit 25
        limit_per_part: Option<u64>,
        padding: [u8; 32],
    },
    Consumable {
        // 25 + 8 + 9 + 49
        class: String, // limit 25
        uses: u64,
        item_usage_type: ItemUsageType, // 9
        // borsh doesnt have presets for 49 so we build it.
        padding: [u8; 32],
        padding2: [u8; 10],
        padding3: [u8; 7],
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageType {
    Cooldown { duration: i64 },
    Exhaustion { padding: [u8; 8] },
    Destruction { padding: [u8; 8] },
    Infinite { padding: [u8; 8] },
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

#[account]
pub struct Item {
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
