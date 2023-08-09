use std::str::FromStr;

use anchor_lang::{prelude::*, solana_program::hash::hash};
use mpl_token_auth_rules::ID as AuthRulesID;
use mpl_token_metadata::ID as TokenMetadataPID;

pub mod accounts;
pub mod errors;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum ItemClassOutputMode {
    Item,
    Pack { index: u64 },
    PresetOnly,
}

impl ItemClassOutputMode {
    pub const SPACE: usize = 1 + 8;

    pub fn get_index(&self) -> Result<u64> {
        match self {
            ItemClassOutputMode::Pack { index } => Ok(*index),
            _ => Err(errors::ErrorCode::InvalidItemClassOutputMode.into()),
        }
    }

    pub fn increment_index(&mut self) -> Result<()> {
        if let ItemClassOutputMode::Pack { index } = self {
            *index += 1;
            Ok(())
        } else {
            Err(errors::ErrorCode::InvalidItemClassOutputMode.into())
        }
    }

    pub fn is_pack(&self) -> bool {
        matches!(self, ItemClassOutputMode::Pack { .. })
    }

    pub fn is_item(&self) -> bool {
        matches!(self, ItemClassOutputMode::Item)
    }

    pub fn is_preset_only(&self) -> bool {
        matches!(self, ItemClassOutputMode::PresetOnly)
    }
}

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

    // list of mints that make up this ingredient
    pub mints: Vec<IngredientMint>,

    // if true, this is a deterministic ingredient and we expect a deterministic pda created
    pub is_deterministic: bool,
}

impl BuildIngredientData {
    pub const INIT_SPACE: usize = 32 + // item class
    8 + // current amount
    8 + // required amount
    BuildEffect::SPACE + // build effect 
    4 + // initial empty mints vector
    1; // is determinisitic bool

    pub fn current_space(&self) -> usize {
        BuildIngredientData::INIT_SPACE + (self.mints.len() * IngredientMint::SPACE)
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

    // if true, we expect a deterministic ingredient pda created for this mint
    pub is_deterministic: bool,
}

impl RecipeIngredientData {
    pub const SPACE: usize = 32 + // item class
    8 + // required amount
    1 + // is deterministic
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
            is_deterministic: value.is_deterministic,
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
            ItemState::Fungible => (),
            ItemState::NonFungible {
                durability,
                cooldown: _,
            } => match self {
                Degradation::Off => (),
                Degradation::On { rate } => {
                    if rate >= durability {
                        *durability = 0;
                    } else {
                        *durability -= rate;
                    }
                }
            },
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
        match item_state {
            ItemState::Fungible => (),
            ItemState::NonFungible {
                durability: _,
                cooldown,
            } => match self {
                Cooldown::Off => (),
                Cooldown::On { seconds } => {
                    let current_unix_timestamp = Clock::get().unwrap().unix_timestamp;
                    *cooldown = Some(current_unix_timestamp + seconds);
                }
            },
        }
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
        match self {
            Self::Fungible => false,
            Self::NonFungible {
                durability,
                cooldown: _,
            } => *durability == 0,
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
            Self::NonFungible {
                durability,
                cooldown,
            } => {
                if *durability == Degradation::BRAND_NEW && cooldown.is_none() {
                    return true;
                }
                false
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PaymentStatus {
    NotPaid,
    Escrowed,
    SentToTreasury,
}

impl PaymentStatus {
    pub const SPACE: usize = 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PaymentState {
    pub status: PaymentStatus,
    pub payment_details: Payment,
}

impl From<Payment> for PaymentState {
    fn from(value: Payment) -> Self {
        PaymentState {
            status: PaymentStatus::NotPaid,
            payment_details: value,
        }
    }
}

impl PaymentState {
    pub const SPACE: usize = 1 + Payment::SPACE;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PackContents {
    pub entries: Vec<PackContentsEntry>,
    pub nonce: [u8; 16],
}

impl PackContents {
    pub fn space(entry_count: usize) -> usize {
        4 + (entry_count * PackContentsEntry::SPACE)
    }

    pub fn hash_pack_contents(&self) -> [u8; 32] {
        let mut bytes = self
            .entries
            .iter()
            .flat_map(|entry| {
                let mut b = Vec::new();
                b.extend_from_slice(entry.mint.as_ref());
                b.extend_from_slice(&entry.amount.to_le_bytes());
                b
            })
            .collect::<Vec<u8>>();
        bytes.extend_from_slice(&self.nonce);
        hash(&bytes).to_bytes()
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PackContentsEntry {
    pub mint: Pubkey,
    pub amount: u64,
}

impl PackContentsEntry {
    pub const SPACE: usize = 32 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BuildOutput {
    pub items: Vec<BuildOutputItem>,
}

impl BuildOutput {
    pub const INIT_SPACE: usize = 4;

    pub fn new() -> Self {
        BuildOutput { items: vec![] }
    }

    pub fn current_space(&self) -> usize {
        BuildOutput::INIT_SPACE + (self.items.len() * BuildOutputItem::SPACE)
    }

    pub fn add_output(&mut self, mint: Pubkey, amount: u64) {
        self.items.push(BuildOutputItem {
            mint,
            amount,
            received: false,
        })
    }

    pub fn find_output_amount(&self, mint: &Pubkey) -> u64 {
        self.items
            .iter()
            .find(|output| output.mint.eq(mint) && !output.received)
            .unwrap()
            .amount
    }

    pub fn set_output_as_received(&mut self, mint: &Pubkey) {
        for output in self.items.iter_mut() {
            if output.mint.eq(mint) {
                output.received = true;
            }
        }
    }

    pub fn all_outputs_sent(&self) -> bool {
        self.items.iter().all(|output| output.received)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BuildOutputItem {
    pub mint: Pubkey,
    pub amount: u64,
    pub received: bool,
}

impl BuildOutputItem {
    pub const SPACE: usize = 32 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DeterministicIngredientOutput {
    pub mint: Pubkey,
    pub amount: u64,
}

impl DeterministicIngredientOutput {
    pub const SPACE: usize = 32 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OutputSelectionArgs {
    pub group_id: u8,

    pub output_id: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OutputSelectionGroup {
    pub group_id: u8,

    pub choices: Vec<OutputSelection>,
}

impl OutputSelectionGroup {
    pub fn current_space(&self) -> usize {
        1 + // group id
        (OutputSelection::SPACE * self.choices.len()) // choices
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OutputSelection {
    pub output_id: u8,
    pub mint: Pubkey,
    pub amount: u64,
}

impl OutputSelection {
    pub const SPACE: usize = 1 + 32 + 8;
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

static API_SIGNER: &str = "dCv6DeSPdMPWR6ijqxa4yVWPAw93zx1V69JiBWC5iy4";
static TEST_SIGNER: &str = "JAR5vUajWveV7pLJCQKLX8qCyeWAGHVQMkMUCGU3vDde";

// return true if the signer is a match
pub fn is_signer(signer: &Pubkey) -> bool {
    let api = Pubkey::from_str(API_SIGNER).unwrap();
    let test = Pubkey::from_str(TEST_SIGNER).unwrap();

    signer.eq(&api) || signer.eq(&test)
}
