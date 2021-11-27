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
pub mod item {
    use super::*;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Callback(pub Pubkey, pub u64);

pub const MAX_BASIC_ITEM_EFFECTS: usize = 5;
pub const ITEM_USAGE_SIZE: usize =
    147 + ITEM_USAGE_TYPE_SIZE + 1 + MAX_BASIC_ITEM_EFFECTS * BASIC_ITEM_EFFECT_SIZE; // needs to include basic item effect max size
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsage {
    Wearable {
        body_part: Vec<String>,                           // limit 25 bytes
        category: Vec<String>,                            // limit 25 bytes
        limit_per_part: Option<u64>,                      // 9
        wearable_callback: Option<Callback>,              // 41
        basic_item_effects: Option<Vec<BasicItemEffect>>, // BASIC_ITEM_EFFECT_SIZE
        padding: [u8; 31],
        padding2: [u8; 19],
    },
    Consumable {
        category: Vec<String>,                            // limit 25 bytes
        uses: u64,                                        // 8
        item_usage_type: ItemUsageType,                   //  ITEM_USAGE_TYPE_SIZE
        consumption_callback: Option<Callback>,           // 41
        basic_item_effects: Option<Vec<BasicItemEffect>>, // BASIC_ITEM_EFFECT_SIZE
        padding: [u8; 32],
        padding2: [u8; 12],
    },
}

pub const ITEM_USAGE_STATE_SIZE: usize =
    1 + 8 + ITEM_USAGE_TYPE_STATE_SIZE + 1 + MAX_BASIC_ITEM_EFFECTS * BASIC_ITEM_EFFECT_STATE_SIZE; // needs to include basic item effect max size
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageState {
    Wearable {
        inherited: InheritanceState,
        item_usage_type: ItemUsageTypeState, //  ITEM_USAGE_TYPE_STATE_SIZE
        basic_item_effect_states: Option<Vec<BasicItemEffectState>>, // BASIC_ITEM_EFFECT_STATE_SIZE
        padding: [u8; 32],
        padding2: [u8; 12],
    },
    Consumable {
        inherited: InheritanceState,
        uses_remaining: u64,                                  // 8
        item_usage_type: ItemUsageTypeState,                  //  ITEM_USAGE_TYPE_SIZE
        basic_item_effect: Option<Vec<BasicItemEffectState>>, // BASIC_ITEM_EFFECT_SIZE
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

pub const ITEM_USAGE_TYPE_STATE_SIZE: usize = 32;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageTypeState {
    Cooldown {
        activated_at: i64,
        padding: [u8; 24],
    },
    Exhaustion {
        padding: [u8; 32],
    },
    Destruction {
        padding: [u8; 32],
    },
    Infinite {
        padding: [u8; 32],
    },
}

pub const BASIC_ITEM_EFFECT_STATE_SIZE: usize = 9 + 32;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicItemEffectState {
    activated_at: Option<i64>,
    specific_state: BasicItemEffectSpecificState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicItemEffectSpecificState {
    Increment,
    Decrement,
    IncrementPercent,
    DecrementPercent,
    IncrementPercentFromBase,
    DecrementPercentFromBase,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicItemEffectType {
    Increment { padding: [u8; 32] },
    Decrement { padding: [u8; 32] },
    IncrementPercent { padding: [u8; 32] },
    DecrementPercent { padding: [u8; 32] },
    IncrementPercentFromBase { padding: [u8; 32] },
    DecrementPercentFromBase { padding: [u8; 32] },
}

pub const BASIC_ITEM_EFFECT_SIZE: usize = 8 + 25 + 33 + 9 + 9 + 9 + 50;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicItemEffect {
    amount: u64,
    stat: String,
    item_effect_type: BasicItemEffectType,
    active_duration: Option<i64>,
    staking_amount_scaler: Option<u64>,
    staking_duration_scaler: Option<u64>,
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
1 + //inherited
32; //padding
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Component {
    mint: Pubkey,
    amount: u64,
    // if we cant count this component if its incooldown
    non_cooldown_required: bool,
    condition: ComponentCondition,
    inherited: InheritanceState,
    padding: [u8; 32],
}

pub const MAX_COMPONENTS: usize = 10;
pub const MAX_ITEM_USAGES: usize = 10;

pub const ITEM_CLASS_SIZE: usize = 8 + // key
32 + // mint
32 + // metadata
32 + // edition
1 + //indexed
26 + // default cat
3 + // update permissiveness
4 + 4 + // child propagation vec
33 + // parent
33 +// namespace
MAX_ITEM_USAGES*ITEM_USAGE_SIZE + // item usages
COMPONENT_SIZE*MAX_COMPONENTS +
200; //padding

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum UpdatePermissiveness {
    TokenHolderCanUpdate { inherited: InheritanceState },
    PlayerClassHolderCanUpdate { inherited: InheritanceState },
    AnybodyCanUpdate { inherited: InheritanceState },
    NamespaceOwnerCanUpdate { inherited: InheritanceState },
}

pub const MAX_NAMESPACES: usize = 10;
pub const ITEM_CLASS_INDEX_SIZE: usize = 8 + MAX_NAMESPACES * 32;
/// seed ['item', item program, mint]
#[account]
pub struct ItemClassIndex {
    namespaces: Vec<Pubkey>,
}

/// Seed ['item', item program, mint, namespace, 'whitelist']
#[account]
pub struct ItemClassNamespaceWhitelist {
    namespace: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ChildUpdatePropagationPermissiveness {
    Class { overridable: bool },
    Usages { overridable: bool },
    Components { overridable: bool },
    UpdatePermissiveness { overridable: bool },
    ChildUpdatePropagationPermissiveness { overridable: bool },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum InheritanceState {
    NotInherited,
    Inherited,
    Overriden,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DefaultItemCategory {
    category: String,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ArtifactNamespaceSetting {
    namespaces: Vec<NamespaceAndIndex>,
}

/// seed ['item', item program, mint, namespace]
#[account]
pub struct ItemClass {
    namespaces: ArtifactNamespaceSetting,
    mint: Pubkey,
    metadata: Pubkey,
    edition: Pubkey,
    default_category: DefaultItemCategory,
    default_update_permissiveness: Vec<UpdatePermissiveness>,
    child_update_propagation_permissiveness: Vec<ChildUpdatePropagationPermissiveness>,
    parent: Option<Pubkey>,
    usages: Vec<ItemUsage>,
    components: Vec<Component>,
}

pub const ITEM_SIZE: usize = 8 + // key
32 + // mint
32 + // metadata
32 + // parent
1 + //indexed
2 + // authority level
33 + // edition
MAX_ITEM_USAGES*ITEM_USAGE_STATE_SIZE + // item usages
200; // padding

/// seed ['item', item program, mint, namespace]
#[account]
pub struct Item {
    namespaces: ArtifactNamespaceSetting,
    mint: Pubkey,
    metadata: Pubkey,
    parent: Pubkey,
    update_permissiveness: Option<Vec<UpdatePermissiveness>>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    usage_states: Vec<ItemUsageState>,
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
