use anchor_lang::prelude::*;
use mpl_token_auth_rules::ID as AuthRulesID;
use mpl_token_metadata::ID as TokenMetadataPID;

pub mod accounts;
pub mod errors;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct BuildMaterialData {
    // each item used for this build material must be a member of this item class
    pub item_class: Pubkey,

    // current amount of items escrowed
    pub current_amount: u64,

    // required amount of items to escrow
    pub required_amount: u64,

    // defines what happens to these items after being used in a build
    pub build_effect: BuildEffect,

    pub mints: Vec<BuildMaterialMint>,
}

impl BuildMaterialData {
    pub fn space(required_amount: usize) -> usize {
        (1 + 32) + // verified_item_mint
        32 + // item_class
        8 + // current amount
        8 + // required amount
        BuildEffect::SPACE + // build effect
        (4 + (required_amount * BuildMaterialMint::SPACE))
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct BuildMaterialMint {
    // a mint which has been escrowed to the build
    pub mint: Pubkey,

    // if true, the item build effect has been applied
    // this happens after a build is complete and the item is received by the user
    pub build_effect_applied: bool,
}

impl BuildMaterialMint {
    pub const SPACE: usize = 32 + // mint
    1; // build_effect_applied
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct SchemaMaterialData {
    // the item must be a member of this item class
    pub item_class: Pubkey,

    // amount of items required for the build
    pub required_amount: u64,

    // what happens to these items as a result of being used in this build
    pub build_effect: BuildEffect,
}

impl SchemaMaterialData {
    pub const SPACE: usize = 32 + // item class
    8 + // required amount
    BuildEffect::SPACE; // build effect
}

impl From<SchemaMaterialData> for BuildMaterialData {
    fn from(value: SchemaMaterialData) -> Self {
        BuildMaterialData {
            item_class: value.item_class,
            current_amount: 0,
            required_amount: value.required_amount,
            build_effect: value.build_effect,
            mints: vec![],
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum BuildStatus {
    InProgress,
    Complete,
    ItemReceived,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BuildEffect {
    pub degredation: Degredation,
    pub cooldown: Cooldown,
}

impl BuildEffect {
    pub const SPACE: usize = Degredation::SPACE + Cooldown::SPACE;
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum Degredation {
    Off,
    On { amount: u64 },
}

impl Degredation {
    pub const SPACE: usize = (1 + 8);

    pub fn apply(&self, item_state: &mut ItemState) {
        match self {
            Degredation::Off => return,
            Degredation::On { amount } => {
                item_state.durability -= amount;
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum Cooldown {
    Off,
    On { seconds: i64 },
}

impl Cooldown {
    pub const SPACE: usize = (1 + 8);

    pub fn apply(&self, item_state: &mut ItemState) {
        match self {
            Cooldown::Off => return,
            Cooldown::On { seconds } => {
                let current_unix_timestamp = Clock::get().unwrap().unix_timestamp;
                item_state.cooldown = Some(current_unix_timestamp + seconds);
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemState {
    pub durability: u64, // when durability reaches 0 this item is destroyed (token burn)
    pub cooldown: Option<i64>, // if Some, item is not usable until now >= cooldown unix timestamp
}

impl Default for ItemState {
    fn default() -> Self {
        ItemState {
            durability: 100000,
            cooldown: None,
        }
    }
}

impl ItemState {
    pub const SPACE: usize = 8 + // durability
    (1 + 8); // cooldown
}

// anchor wrapper for Noop Program required for spl-account-compression
#[derive(Clone)]
pub struct NoopProgram;

impl anchor_lang::Id for NoopProgram {
    fn id() -> Pubkey {
        spl_noop::ID
    }
}

// anchor wrapper for Token Metadata Program
#[derive(Clone)]
pub struct TokenMetadataProgram;

impl anchor_lang::Id for TokenMetadataProgram {
    fn id() -> Pubkey {
        TokenMetadataPID
    }
}

// anchor wrapper for Metaplex Auth Rules Program
#[derive(Clone)]
pub struct AuthRulesProgram;

impl anchor_lang::Id for AuthRulesProgram {
    fn id() -> Pubkey {
        AuthRulesID
    }
}
