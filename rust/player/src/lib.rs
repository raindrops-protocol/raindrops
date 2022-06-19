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
    spl_token::instruction::{initialize_account2, mint_to},
};

anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");

pub const PREFIX: &str = "player";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddItemEffectArgs {
    pub item_index: u64,
    pub item_mint: Pubkey,
    pub amount: u64,
    pub usage_index: u16,
    // Use this if using roots
    pub usage_info: Option<UsageInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UsageInfo {
    // These required if using roots instead
    pub usage_proof: Vec<[u8; 32]>,
    pub usage: raindrops_item::ItemUsage,
    // These required if using roots instead
    pub usage_state_proof: Vec<[u8; 32]>,
    pub usage_state: raindrops_item::ItemUsageState,
}

#[program]
pub mod player {
    use super::*;
}

#[derive(Accounts)]
pub struct SubtractItemEffect<'info> {
    #[account(mut, constraint=player.key() == player_item_activation_marker.player)]
    player: Account<'info, Player>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Account<'info, PlayerClass>,
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            player_item_activation_marker.item.as_ref(),
            &(player_item_activation_marker.usage_index as u64).to_le_bytes(),
            raindrops_item::MARKER.as_bytes()
        ],
        bump=player_item_activation_marker.bump
    )]
    player_item_activation_marker: Account<'info, PlayerItemActivationMarker>,
    #[account(constraint=player_item_activation_marker.item == item.key())]
    item: Account<'info, raindrops_item::Item>,
    #[account(constraint=item.parent == item_class.key())]
    item_class: Account<'info, raindrops_item::ItemClass>,
    #[account(mut)]
    receiver: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: AddItemEffectArgs)]
pub struct AddItemEffect<'info> {
    #[account(mut, constraint=player.key() == player_item_activation_marker.player)]
    player: Account<'info, Player>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Account<'info, PlayerClass>,
    #[account(
        init,
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            &(args.usage_index as u64).to_le_bytes(),
            raindrops_item::MARKER.as_bytes()
        ],
        bump,
        payer=payer,
        space=PLAYER_ITEM_ACTIVATION_MARKER_SPACE
    )]
    player_item_activation_marker: Account<'info, PlayerItemActivationMarker>,
    #[account(
        mut,
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            args.item_mint.as_ref(),
            &args.item_index.to_le_bytes(),
            &(args.usage_index as u64).to_le_bytes(),
            &args.amount.to_le_bytes(),
            raindrops_item::MARKER.as_bytes()
        ],
        seeds::program=raindrops_item::id(),
        bump=item_activation_marker.bump
    )]
    item_activation_marker: Account<'info, raindrops_item::ItemActivationMarker>,
    #[account(
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            args.item_mint.as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        bump=item.bump
    )]
    item: Account<'info, raindrops_item::Item>,
    #[account(constraint=item.parent == item_class.key())]
    item_class: Account<'info, raindrops_item::ItemClass>,
    // Will use funds from item activation marker to seed player activation marker
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after
    // These will be used to close the item activation marker once its been read into this program
}

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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub struct Permissiveness {
    pub inherited: InheritanceState,
    pub permissiveness_type: PermissivenessType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum PermissivenessType {
    TokenHolder,
    ParentTokenHolder,
    UpdateAuthority,
    Anybody,
}

pub const MAX_NAMESPACES: usize = 10;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ChildUpdatePropagationPermissiveness {
    pub overridable: bool,
    pub inherited: InheritanceState,
    pub child_update_propagation_permissiveness_type: ChildUpdatePropagationPermissivenessType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum ChildUpdatePropagationPermissivenessType {
    Usages,
    Components,
    UpdatePermissiveness,
    BuildPermissiveness,
    ChildUpdatePropagationPermissiveness,
    ChildrenMustBeEditionsPermissiveness,
    BuilderMustBeHolderPermissiveness,
    StakingPermissiveness,
    Namespaces,
    FreeBuildPermissiveness,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum InheritanceState {
    NotInherited,
    Inherited,
    Overriden,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Boolean {
    pub inherited: InheritanceState,
    pub boolean: bool,
}

/// seed ['player', player program, mint, namespace]
#[account]
pub struct PlayerClass {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    pub parent: Option<Pubkey>,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    pub edition: Option<Pubkey>,
    pub starting_stats_uri: Option<StatsUri>,
    pub default_category: Option<PlayerCategory>,
    pub free_build: Option<Boolean>,
    pub children_must_be_editions: Option<Boolean>,
    pub builder_must_be_holder: Option<Boolean>,
    pub update_permissiveness: Vec<Permissiveness>,
    pub child_update_propagation_permissiveness: Vec<ChildUpdatePropagationPermissiveness>,
    pub basic_stats: Vec<BasicStatTemplate>,
    pub body_parts: Vec<BodyPart>,
}

/// seed ['player', player program, mint, namespace] also
#[account]
pub struct Player {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    // extra byte that is always 1 to simulate same structure as item class.
    pub padding: u8,
    pub parent: Pubkey,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    pub edition: Option<Pubkey>,
    pub stats_uri: Option<StatsUri>,
    pub bump: u8,
    pub tokens_staked: u64,
    pub category: Option<PlayerCategory>,
    pub update_permissiveness: Option<Vec<Permissiveness>>,
    pub equipped_items: Vec<EquippedItem>,
    pub basic_stats: Vec<BasicStat>,
    pub body_parts: Vec<BodyPart>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicStatTemplate {
    pub name: String,
    pub index: u16,
    pub stat_type: BasicStatType,
    pub inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicStat {
    pub index: u16,
    pub state: BasicStatState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Threshold(pub String, pub u64);

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicStatType {
    Enum {
        starting: u8,
        values: Vec<Threshold>,
    },
    Integer {
        min: Option<i64>,
        max: Option<i64>,
        starting: i64,
        staking_amount_scaler: Option<u64>,
        staking_duration_scaler: Option<u64>,
    },
    Bool {
        starting: bool,
        staking_flip: Option<u64>,
    },
    String {
        starting: String,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicStatState {
    Enum { initial: u8, current: u8 },
    Integer { initial: i64, current: i64 },
    Bool { initial: bool, current: bool },
    String { initial: String, current: String },
}

const PLAYER_ITEM_ACTIVATION_MARKER_SPACE: usize = 8 + // key
1 + //bump
32 + //player
32 + //item
2 + // usage index
8 + // amount
8; // activated_at

#[account]
pub struct PlayerItemActivationMarker {
    pub bump: u8,
    pub player: Pubkey,
    pub item: Pubkey,
    pub usage_index: u16,
    pub amount: u64,
    pub activated_at: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicItemEffectType {
    Increment,
    Decrement,
    IncrementPercent,
    DecrementPercent,
    IncrementPercentFromBase,
    DecrementPercentFromBase,
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
