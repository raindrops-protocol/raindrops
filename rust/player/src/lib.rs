pub mod utils;

use anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize};

use raindrops_namespace_cpi::{InheritanceState, NamespaceAndIndex};

anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");

pub const PREFIX: &str = "player";
#[program]
pub mod player {}

pub const EQUIPPED_ITEM_SIZE: usize = 32 + //item 
32 + // item
25 + //body part
25 + // class of item
32; // padding

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Root {
    inherited: InheritanceState,
    root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EquippedItem {
    item: Pubkey,
    item_class: Pubkey,
    body_part: String,
    category: String,
    padding: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Permissiveness {
    TokenHolder { inherited: InheritanceState },
    PlayerParentTokenHolder { inherited: InheritanceState },
    UpdateAuthority { inherited: InheritanceState },
    Anybody { inherited: InheritanceState },
}

pub const MAX_NAMESPACES: usize = 10;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ChildUpdatePropagationPermissiveness {
    Usages,
    Components,
    UpdatePermissiveness,
    BuildPermissiveness,
    ChildUpdatePropagationPermissiveness,
    ChildrenMustBeEditionsPermissiveness,
    BuilderMustBeHolderPermissiveness,
    StakingPermissiveness,
    Namespaces,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerCategory {
    category: String,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StatsUri {
    stats_uri: String,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BodyPart {
    body_part: String,
    inherited: InheritanceState,
}

/// seed ['player', player program, mint, namespace]
#[account]
pub struct PlayerClass {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    parent: Option<Pubkey>,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    edition: Option<Pubkey>,
    starting_stats_uri: Option<StatsUri>,
    default_category: Option<PlayerCategory>,
    children_must_be_editions: bool,
    builder_must_be_holder: bool,
    update_permissiveness: Vec<Permissiveness>,
    child_update_propagation_permissiveness: Vec<ChildUpdatePropagationPermissiveness>,
    body_parts: Vec<BodyPart>,
}

/// seed ['player', player program, mint, namespace] also
#[account]
pub struct Player {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    // extra byte that is always 1 to simulate same structure as item class.
    padding: u8,
    parent: Pubkey,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    edition: Option<Pubkey>,
    stats_uri: Option<StatsUri>,
    category: Option<PlayerCategory>,
    update_permissiveness: Option<Vec<Permissiveness>>,
    equipped_items: Vec<EquippedItem>,
    activated_items: Vec<Pubkey>,
    basic_stats: Vec<BasicStat>,
    body_parts: Vec<BodyPart>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicStat {
    name: String,
    stat_type: BasicStatType,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Threshold(pub String, pub u64);

pub const BASIC_STAT_TYPE_SIZE: usize = 82;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicStatType {
    Enum {
        initial: u8,
        values: Vec<Threshold>,
    },
    Integer {
        min: Option<i64>,
        max: Option<i64>,
        initial: i64,
        staking_amount_scaler: Option<u64>,
        staking_duration_scaler: Option<u64>,
        padding: [u8; 32],
        padding2: [u8; 8],
    },
    Bool {
        initial: bool,
        staking_flip: Option<u64>,
        padding: [u8; 32],
        padding2: [u8; 32],
        padding3: [u8; 8],
    },
    String {
        initial: String,
    },
}

#[error_code]
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
