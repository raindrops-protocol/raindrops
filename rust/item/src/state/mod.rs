use anchor_lang::prelude::*;
use mpl_token_auth_rules::ID as AuthRulesID;
use mpl_token_metadata::ID as TokenMetadataPID;

pub mod accounts;
pub mod errors;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct BuildIngredientData {
    // each item used for this build ingredient must be a member of this item class
    pub item_class: Pubkey,

    // current amount of items escrowed
    pub current_amount: u64,

    // required amount of items to escrow
    pub required_amount: u64,

    // defines what happens to these items after being used in a build
    pub build_effect: BuildEffect,

    pub mints: Vec<IngredientMint>,
}

impl BuildIngredientData {
    pub fn space(required_amount: usize) -> usize {
        (1 + 32) + // verified_item_mint
        32 + // item_class
        8 + // current amount
        8 + // required amount
        BuildEffect::SPACE + // build effect
        (4 + (required_amount * IngredientMint::SPACE))
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct IngredientMint {
    // a mint which has been escrowed to the build
    pub mint: Pubkey,

    // if true, the item build effect has been applied
    // this happens after a build is complete and the item is received by the user
    pub build_effect_applied: bool,
}

impl IngredientMint {
    pub const SPACE: usize = 32 + // mint
    1; // build_effect_applied
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct RecipeIngredientData {
    // the item must be a member of this item class
    pub item_class: Pubkey,

    // amount of items required for the build
    pub required_amount: u64,

    // what happens to these items as a result of being used in this build
    pub build_effect: BuildEffect,
}

impl RecipeIngredientData {
    pub const SPACE: usize = 32 + // item class
    8 + // required amount
    BuildEffect::SPACE; // build effect
}

impl From<RecipeIngredientData> for BuildIngredientData {
    fn from(value: RecipeIngredientData) -> Self {
        BuildIngredientData {
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
    pub degradation: Degradation,
    pub cooldown: Cooldown,
}

impl BuildEffect {
    pub const SPACE: usize = Degradation::SPACE + Cooldown::SPACE;
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum Degradation {
    Off,
    On { rate: u64 },
}

impl Degradation {
    pub const SPACE: usize = (1 + 8);
    pub const BRAND_NEW: u64 = 100000;

    pub fn apply(&self, item_state: &mut ItemState) {
        match item_state {
            ItemState::Fungible => return,
            ItemState::NonFungible {
                durability,
                cooldown: _,
            } => match self {
                Degradation::Off => return,
                Degradation::On { rate } => {
                    if rate >= durability {
                        *durability = 0;
                    } else {
                        *durability -= rate;
                    }
                }
            },
        };
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
        match item_state {
            ItemState::Fungible => return,
            ItemState::NonFungible {
                durability: _,
                cooldown,
            } => match self {
                Cooldown::Off => return,
                Cooldown::On { seconds } => {
                    let current_unix_timestamp = Clock::get().unwrap().unix_timestamp;
                    *cooldown = Some(current_unix_timestamp + seconds);
                }
            },
        };
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum ItemState {
    Fungible,
    NonFungible {
        durability: u64,
        cooldown: Option<i64>,
    },
}

impl ItemState {
    pub const SPACE: usize = 1 + (8 + (1 + 8));
    pub fn new() -> Self {
        ItemState::NonFungible {
            durability: Degradation::BRAND_NEW,
            cooldown: None,
        }
    }

    // returns true if item is on cooldown
    pub fn on_cooldown(&self) -> bool {
        match self {
            Self::Fungible => false,
            Self::NonFungible {
                durability: _,
                cooldown,
            } => match cooldown {
                Some(until) => {
                    let now = Clock::get().unwrap().unix_timestamp;

                    now <= *until
                }
                None => false,
            },
        }
    }

    // returns true if the item has no more durability left
    pub fn broken(&self) -> bool {
        msg!("{:?}", &self);
        match self {
            Self::Fungible => false,
            Self::NonFungible {
                durability,
                cooldown: _,
            } => *durability <= 0,
        }
    }

    // fungible tokens and broken items are not returnable
    pub fn returnable(&self) -> bool {
        match self {
            Self::Fungible => false,
            Self::NonFungible {
                durability: _,
                cooldown: _,
            } => !self.broken(),
        }
    }

    // returns true if the item state is brand new and without cooldown
    // we use this to destroy the ItemV1 PDA and return the rent after the build
    // there's no reason to have an ItemV1 PDA if there's no state to keep, this saves money
    pub fn no_state(&self) -> bool {
        match self {
            Self::Fungible => true,
            Self::NonFungible { durability, cooldown } => {
                if *durability == Degradation::BRAND_NEW && cooldown.is_none() {
                    return true
                }
                return false
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Payment {
    pub treasury: Pubkey,
    pub amount: u64,
}

impl Payment {
    pub const SPACE: usize = 32 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PaymentState {
    pub paid: bool,
    pub payment_details: Payment,
}

impl From<Payment> for PaymentState {
    fn from(value: Payment) -> Self {
        PaymentState {
            paid: false,
            payment_details: value,
        }
    }
}

impl PaymentState {
    pub const SPACE: usize = 1 + Payment::SPACE;
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
