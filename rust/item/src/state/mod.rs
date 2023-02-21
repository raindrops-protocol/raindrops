use anchor_lang::prelude::*;
use mpl_token_metadata::ID as TokenMetadataPID;

pub mod errors;

// seeds = ['item_class_v1', membership_tree.key().as_ref()]
#[account]
pub struct ItemClassV1 {
    // controls the item class
    pub authority: Pubkey,

    // merkle tree containing all item addresses belonging to this item class
    pub items: Pubkey,
}

impl ItemClassV1 {
    pub const PREFIX: &'static str = "item_class_v1";
    pub const SPACE: usize = 8 + // anchor
    32 + // authority
    32; // members
}

// a schema contains all materials and build information for an item class v1
// seeds = ['schema', item_class.key()]
#[account]
pub struct Schema {
    pub item_class: Pubkey,

    // if false building is disabled for this item class
    pub build_enabled: bool,

    // if true, activate the item class within the build instruction
    pub auto_activate: bool,

    // list of materials required to use this schema to build the item class v1
    pub materials: Vec<Material>,
}

impl Schema {
    pub const PREFIX: &'static str = "schema";
    pub fn space(material_count: usize) -> usize {
        8 + // anchor
        32 + // item_class
        1 + // enabled
        1 + // auto_activate
        4 + (Material::SPACE * material_count) // materials
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Material {
    pub item_mint: Option<Pubkey>,
    pub item_class: Pubkey,
    pub amount: u64,
}

impl Material {
    pub const SPACE: usize = 32 + // item class
    (1 + 32) + // item mint
    8; // amount
}

// manages the lifecycle of the item class build process for a builder
// seeds = ['build', item_class.key(), schema.key().as_ref(), builder.key().as_ref()]
#[account]
pub struct Build {
    pub builder: Pubkey,

    // this is set in set_build_output, its the mint that gets transferred to the builder
    pub output_mint: Option<Pubkey>,

    // current build materials
    pub materials: Vec<Material>,

    // if true, building is complete
    pub complete: bool,

    // if true, item has been distributed to the builder
    pub item_distributed: bool,
}

impl Build {
    pub const PREFIX: &'static str = "build";
    pub fn space(material_count: usize) -> usize {
        8 + // anchor
        32 + // builder
        (1 + 32) + // output mint
        1 + // complete
        1 + // item_distributed
        4 + (Material::SPACE * material_count) // materials
    }
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
