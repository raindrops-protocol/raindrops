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

// [COMMON REMAINING ACCOUNTS]
// Most actions require certain remainingAccounts based on their permissioned setup
// if you see common remaining accounts label, use the following as your rubric:
// If update permissiveness is token holder can update:
// token_account [readable]
// token_holder [signer]
// If update permissiveness is class holder can update
// class token_account [readable]
// class token_holder [signer]
// class [readable]
// class mint [readable]
// If update permissiveness is namespace holder can update
// namespace token_account [readable]
// namespace token_holder [signer]
// namespace [readable]
// If update permissiveness is update authority can update
// metadata_update_authority [signer]
// metadata [readable]
// If update permissiveness is anybody can update, nothing further is required.

#[derive(Accounts)]
#[instruction( item_class_bump: u8, space: usize)]
pub struct CreateItemClass<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(init, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class_bump, space=space, payer=payer, constraint=space >= MIN_ITEM_CLASS_SIZE)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    metadata: UncheckedAccount<'info>,
    edition: UncheckedAccount<'info>,
    // is the parent item class (if there is one.)
    parent: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // If parent is unset, need to provide:
    // metadata_update_authority [signer]
    // If parent is set, and update permissiveness is token holder can update:
    // parent token_account [readable]
    // parent token_holder [signer]
    // parent mint [readable]
    // If parent is set, and update permissiveness is class holder can update
    // parent's class token_account [readable]
    // parent's class token_holder [signer]
    // parent's class [readable]
    // parent's class's mint [readable]
    // If parent is set, and update permissiveness is namespace holder can update
    // namespace token_account [readable]
    // namespace token_holder [signer]
    // namespace [readable]
    // If parent is set and update permissiveness is update authority can update
    // parent's metadata_update_authority [signer]
    // parent's metadata [readable]
    // parent's mint [readable]
    // If parent is set and update permissiveness is anybody can update, nothing further is required.
}

#[derive(Accounts)]
#[instruction(craft_bump: u8)]
pub struct CreateCraftItemEscrow<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    new_item_metadata: UncheckedAccount<'info>,
    new_item_edition: UncheckedAccount<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), payer.key().as_ref(), new_item_mint.key().as_ref()], bump=craft_bump, space=8+1+8+1, payer=payer)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.amount > 0)]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(token_bump: u8)]
pub struct AddToCraftItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    // payer is in seed so that draining funds can only be done by original payer
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.amount > 0)]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    // cant be stolen to a different craft item token account due to seed by token key
    #[account(init, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), new_item_mint.key().as_ref(),payer.key().as_ref(), ccraft_item_token_account.key().as_ref(),craft_item_token_account.mint.as_ref()], bump=token_bump,token::mint = craft_item_token_account.mint, token::authority = item_class.key(), payer=payer)]
    craft_item_token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    craft_item_token_account: Account<'info, TokenAccount>,
    craft_item_transfer_authority: Signer<'info>,
    payer: Signer<'info>,
    originator: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(token_bump: u8)]
pub struct RemoveCraftItemFromEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.amount > 0)]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    // cant be stolen to a different craft item token account due to seed by token key
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), new_item_mint.key().as_ref(),receiver.key().as_ref(), craft_item_token_account.key().as_ref(), craft_item_token_account.mint.as_ref()], bump=token_bump)]
    craft_item_token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    craft_item_token_account: Account<'info, TokenAccount>,
    // account funds will be drained here from craft_item_token_account_escrow
    receiver: Signer<'info>,
    originator: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DeactivateItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.amount > 0)]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    originator: Signer<'info>,
}

pub struct DrainItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    originator: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(new_item_bump: u8, space: usize)]
pub struct CompleteItemEscrow<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    #[account(init, seeds=[PREFIX.as_bytes(), new_item_mint.key().as_ref()], bump=new_item_bump, payer=payer, space=space, constraint= space >= MIN_ITEM_SIZE)]
    new_item: Account<'info, ItemClass>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.amount > 0)]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    originator: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateItemClass<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
pub struct DrainItemClass<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
pub struct DrainItem<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref()], bump=item.bump)]
    item: Account<'info, Item>,
    item_mint: Account<'info, Mint>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum UpdatePermissiveness {
    TokenHolderCanUpdate { inherited: InheritanceState },
    ClassHolderCanUpdate { inherited: InheritanceState },
    UpdateAuthorityCanUpdate { inherited: InheritanceState },
    AnybodyCanUpdate { inherited: InheritanceState },
    NamespaceOwnerCanUpdate { inherited: InheritanceState },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ChildUpdatePropagationPermissiveness {
    Class { overridable: bool },
    Usages { overridable: bool },
    Components { overridable: bool },
    UpdatePermissiveness { overridable: bool },
    ChildUpdatePropagationPermissiveness { overridable: bool },
    ChildrenMustBeEditionsPermissiveness { overridable: bool },
    BuilderMustBeHolderPermissiveness { overridable: bool },
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

pub const MIN_ITEM_CLASS_SIZE: usize = 8 + // key
1 + // mint
1 + // metadata
1 + // edition
4 + // number of namespaces
1 + // children must be editions
4 + // number of default update permissivenesses
2 + // minimum 1 default update
4+// number of child update propagations
1 + // parent
4 + // number of usages
4 +  // number of components
3 + // roots
1; //bump

#[account]
pub struct ItemClass {
    namespaces: ArtifactNamespaceSetting,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    parent: Option<Pubkey>,
    bump: u8,
    children_must_be_editions: bool,
    builder_must_be_holder: bool,
    default_category: DefaultItemCategory,
    default_update_permissiveness: Vec<UpdatePermissiveness>,
    child_update_propagation_permissiveness: Vec<ChildUpdatePropagationPermissiveness>,
    // The roots are merkle roots, used to keep things cheap on chain (optional)
    usage_root: Option<[u8; 32]>,
    // Used to seed the root for new items
    usage_state_root: Option<[u8; 32]>,
    component_root: Option<[u8; 32]>,
    // Note that both usages and components are mutually exclusive with usage_root and component_root - if those are set, these are considered
    // cached values, and root is source of truth. Up to you to keep them up to date.
    usages: Vec<ItemUsage>,
    components: Vec<Component>,
}

#[account]
pub struct ItemEscrow {
    namespaces: ArtifactNamespaceSetting,
    bump: u8,
    deactivated: bool,
    step: u64,
}

// can make this super cheap
pub const MIN_ITEM_SIZE: usize = 8 + // key
1 + // mint
1 + // metadata
1 + // parent
1 + //indexed
2 + // authority level
1 + // edition
4 + // number of item usages
4 + // number of namespaces
4 + // number of update permissivenesses;
1 + // root
1; //bump

/// seed ['item', item program, mint, namespace]
#[account]
pub struct Item {
    namespaces: ArtifactNamespaceSetting,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    parent: Option<Pubkey>,
    bump: u8,
    update_permissiveness: Option<Vec<UpdatePermissiveness>>,
    usage_state_root: Option<[u8; 32]>,
    // if state root is set, usage states is considered a cache, not source of truth
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
