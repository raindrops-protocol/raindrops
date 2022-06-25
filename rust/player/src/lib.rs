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
    anchor_spl::token::{Mint, Token, TokenAccount},
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
pub struct SubtractItemEffectArgs {
    // Use this if using roots
    pub usage_info: Option<UsageInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddItemArgs {
    pub item_index: u64,
    pub amount: u64,
    pub add_item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RemoveItemArgs {
    pub item_index: u64,
    pub amount: u64,
    pub remove_item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ToggleEquipItemArgs {
    pub item_index: u64,
    pub item_mint: Pubkey,
    pub amount: u64,
    pub equipping: bool,
    pub equip_item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UnequipItemArgs {
    pub item_index: u64,
    pub item_mint: Pubkey,
    pub amount: u64,
    pub unequip_item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainPlayerArgs {
    pub index: u64,
    pub class_index: u64,
    pub player_mint: Pubkey,
    pub player_class_mint: Pubkey,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePlayerClassArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
    pub player_class_data: Option<PlayerClassData>,
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


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreatePlayerClassArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub parent_of_parent_class_index: Option<u64>,
    pub space: u64,
    pub desired_namespace_array_size: u16,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
    pub store_mint: bool,
    pub store_metadata_fields: bool,
    pub item_class_data: PlayerClassData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainPlayerClassArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
    pub player_class_mint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BuildPlayerArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub new_player_index: u64,
    pub space: u64,
    pub player_class_mint: Pubkey,
    pub build_permissiveness_to_use: Option<PermissivenessType>,
    pub store_mint: bool,
    pub store_metadata_fields: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePlayerArgs {
    pub class_index: u64,
    pub index: u64,
    pub player_mint: Pubkey,
    pub player_class_mint: Pubkey,
    pub new_data: Option<PlayerData>
}

#[program]
pub mod player {
    use super::*;
}

#[derive(Accounts)]
#[instruction(args: CreatePlayerClassArgs)]
pub struct CreatePlayerClass<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(
        init,
        seeds=[PREFIX.as_bytes(), player_mint.key().as_ref(), &args.class_index.to_le_bytes()],
        bump,
        space=args.space as usize,
        payer=payer,
        constraint=args.space as usize >= MIN_PLAYER_CLASS_SIZE
    )]
    player_class: Account<'info, PlayerClass>,
    player_mint: Account<'info, Mint>,
    metadata: UncheckedAccount<'info>,
    edition: UncheckedAccount<'info>,
    // is the parent item class (if there is one.) Otherwise use same player class.
    ///CHECK: TODO
    #[account(mut)]
    parent: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // See create_item_class in item lib.rs for additional accounts required here. They follow same pattern.
}

#[derive(Accounts)]
#[instruction(args: UpdatePlayerClassArgs)]
pub struct UpdatePlayerClass<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            player_mint.key().as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Account<'info, PlayerClass>,
    player_mint: Account<'info, Mint>,
    // Pass up system if you dont have a parent
    parent: UncheckedAccount<'info>,
    // These below only needed if trying to do something other than permissionelss inheritance propagation
    // See the [COMMON REMAINING ACCOUNTS] in item's lib.rs for this
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

#[derive(Accounts)]
#[instruction(args: raindrops_item::BeginItemActivationArgs)]
pub struct UseItem<'info> {
    player: Account<'info, Player>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Account<'info, PlayerClass>,
    #[account(mut)]
    item: UncheckedAccount<'info>,
    item_class: UncheckedAccount<'info>,
    item_mint: UncheckedAccount<'info>,
    #[account(mut)]
    item_account: UncheckedAccount<'info>,
    // Size needs to be >= 20 and <= 66
    #[account(mut)]
    item_activation_marker: UncheckedAccount<'info>,
    // payer required here as extra key to guarantee some paying entity for anchor
    // however this signer should match one of the signers in COMMON REMAINING ACCOUNTS
    #[account(mut)]
    payer: Signer<'info>,
    player_program: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, anchor_spl::token::Token>,
    clock: Sysvar<'info, Clock>,
    rent: Sysvar<'info, Rent>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after
}

#[derive(Accounts)]
#[instruction(args: AddItemArgs)]
pub struct AddItem<'info> {
    player: Account<'info, Player>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Account<'info, PlayerClass>,
    #[account(
        mut, 
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            item_mint.key().as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        constraint=item.parent == item_class.key(),
        bump=item.bump
    )]
    item: Account<'info, raindrops_item::Item>,
    #[account(constraint=item.parent == item_class.key())]
    item_class: Account<'info, raindrops_item::ItemClass>,
    item_mint: Account<'info, Mint>,
    #[account(mut, constraint=item_account.mint == item_mint.key())]
    item_account: Account<'info, TokenAccount>,
    item_transfer_authority: Signer<'info>,
    #[account(
        init_if_needed,
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump,
        token::mint = item_mint,
        token::authority = player,
        payer=payer
    )]
    player_item_account: Account<'info, TokenAccount>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after for add item permissiveness
}


#[derive(Accounts)]
#[instruction(args: RemoveItemArgs)]
pub struct RemoveItem<'info> {
    player: Account<'info, Player>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Account<'info, PlayerClass>,
    #[account(
        mut, 
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            item_mint.key().as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        constraint=item.parent == item_class.key(),
        bump=item.bump
    )]
    item: Account<'info, raindrops_item::Item>,
    #[account(constraint=item.parent == item_class.key())]
    item_class: Account<'info, raindrops_item::ItemClass>,
    item_mint: Account<'info, Mint>,
    #[account(mut, constraint=item_account.mint == item_mint.key())]
    item_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    player_item_account: Account<'info, TokenAccount>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after for add item permissiveness
}


#[derive(Accounts)]
#[instruction(args: ToggleEquipItemArgs)]
pub struct ToggleEquipItem<'info> {
    #[account(mut)]
    player: Account<'info, Player>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Account<'info, PlayerClass>,
    #[account(
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            args.item_mint.as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        constraint=item.parent == item_class.key(),
        bump=item.bump
    )]
    item: Account<'info, raindrops_item::Item>,
    #[account(constraint=item.parent == item_class.key())]
    item_class: Account<'info, raindrops_item::ItemClass>,
    #[account(
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    player_item_account: Account<'info, TokenAccount>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after for add item permissiveness
}

#[derive(Accounts)]
#[instruction(args: DrainPlayerClassArgs)]
pub struct DrainPlayerClass<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.key().as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Account<'info, PlayerClass>,
    #[account(
        mut,
        constraint=player_class.parent.unwrap() == parent_class.key()
    )]
    parent_class: UncheckedAccount<'info>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for this
}


#[derive(Accounts)]
#[instruction(args: DrainPlayerArgs)]
pub struct DrainPlayer<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.key().as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Account<'info, Player>,
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.key().as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump,
        constraint=player.parent == player_class.key()
    )]
    player_class: Account<'info, PlayerClass>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: BuildPlayerArgs)]
pub struct BuildPlayer<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        init_if_needed,
        seeds=[
            PREFIX.as_bytes(),
            new_player_mint.key().as_ref(),
            &args.new_player_index.to_le_bytes()
        ],
        bump,
        payer=payer,
        space=args.space as usize,
        constraint=args.space as usize >= MIN_PLAYER_SIZE
    )]
    new_player: Box<Account<'info, Player>>,
    new_player_mint: Box<Account<'info, Mint>>,
    new_player_metadata: UncheckedAccount<'info>,
    new_player_edition: UncheckedAccount<'info>,
    #[account(
        constraint=new_player_token.mint == new_player_mint.key() && new_player_token.owner == new_player_token_holder.key(),
    )]
    new_player_token: Box<Account<'info, TokenAccount>>,
    // may be required signer if builder must be holder in item class is true
    new_player_token_holder: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}
#[derive(Accounts)]
#[instruction(args: UpdatePlayerArgs)]
pub struct UpdatePlayer<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Account<'info, PlayerClass>,
    #[account(
        mut,
        constraint=player.parent == player_class.key(),
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Account<'info, Player>,
    // These below only needed if trying to do something other than permissionelss inheritance propagation
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Root {
    inherited: InheritanceState,
    root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EquippedItem {
    item: Pubkey,
    amount: u64,
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
    InstanceUpdatePermissiveness,
    BuildPermissiveness,
    ChildUpdatePropagationPermissiveness,
    ChildrenMustBeEditionsPermissiveness,
    BuilderMustBeHolderPermissiveness,
    StakingPermissiveness,
    Namespaces,
    FreeBuildPermissiveness,
    EquippingItemsPermissiveness,
    AddingItemsPermissiveness,
    UnequippingItemsPermissiveness,
    RemovingItemsPermissiveness,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Callback {
    pub key: Pubkey,
    pub code: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerClassData {
    pub settings: PlayerClassSettings,
    pub config: PlayerClassConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerClassSettings {
    pub default_category: Option<PlayerCategory>,
    pub free_build: Option<Boolean>,
    pub children_must_be_editions: Option<Boolean>,
    pub builder_must_be_holder: Option<Boolean>,
    pub update_permissiveness: Vec<Permissiveness>,
    pub instance_update_permissiveness: Option<Vec<Permissiveness>>,
    pub build_permissiveness: Option<Vec<Permissiveness>>,
    pub equip_item_permissiveness: Option<Vec<Permissiveness>>,
    pub add_item_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use equip permissiveness
    pub unequip_item_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use remove item permissiveness
    pub remove_item_permissiveness: Option<Vec<Permissiveness>>,
    pub staking_warm_up_duration: Option<u64>,
    pub staking_cooldown_duration: Option<u64>,
    pub staking_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use staking permissiveness
    pub unstaking_permissiveness: Option<Vec<Permissiveness>>,
    pub child_update_propagation_permissiveness: Vec<ChildUpdatePropagationPermissiveness>,
}

pub const MIN_PLAYER_CLASS_SIZE: usize = 8 + // key
1 + // namespaces
1 + // parent
1 + // mint
1 + // metadata
1 + // edition
1 + // default category
1 + // free_build
1 + // children must be editions
1 + // builder must be holder
4 + // update permissiveness
1 + // instance update permissiveness
1 + // build permissiveness
1 + // equip item perm
1 + // add item
1 + // unequip
1 + // remove
1 + //staking warm up
1 + // staking cooldoiwn
1 + // staking perms
1 + // staking unperms
1 + // child update prop
1 + // starting stats
4 + // basic stats
4 + // body parts
1 + // equip callback
1 + // add to pack callback
8 + // existing children
1; //bump

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerClassConfig {
    pub starting_stats_uri: Option<StatsUri>,
    pub basic_stats: Vec<BasicStatTemplate>,
    pub body_parts: Vec<BodyPart>,
    pub equip_validation: Option<Callback>,
    pub add_to_pack_validation: Option<Callback>,
}

/// seed ['player', player program, mint, namespace]
#[account]
pub struct PlayerClass {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    pub parent: Option<Pubkey>,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    pub edition: Option<Pubkey>,
    pub data: PlayerClassData,
    pub existing_children: u64,
    pub bump: u8
}

pub const MIN_PLAYER_SIZE: usize = 8 + // key
1 + // namespaces
1 + // padding(?)
32 + // parent
8 + // class index,
1 + // mint,
1 + // metadata
1 + // edition
1 + // stats uri
1 + //bump
8 + // tokens staked
1 + // category
4 + // equipped items
4; // basic stats

/// seed ['player', player program, mint, namespace] also
#[account]
pub struct Player {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    // extra byte that is always 1 to simulate same structure as item class.
    pub padding: u8,
    pub parent: Pubkey,
    pub class_index: u64,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    pub edition: Option<Pubkey>,
    pub bump: u8,
    pub tokens_staked: u64,
    pub data: PlayerData,
    pub equipped_items: Vec<EquippedItem>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerData {
    pub stats_uri: Option<StatsUri>,
    pub category: Option<PlayerCategory>,
    pub basic_stats: Vec<BasicStat>,
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
