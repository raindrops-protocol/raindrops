use anchor_lang::prelude::*;

use super::{BuildStatus, Material};

// seeds = ['item_class_v1', membership_tree.key().as_ref()]
#[account]
pub struct ItemClassV1 {
    // controls the item class
    pub authority: Pubkey,

    // merkle tree containing all item addresses belonging to this item class
    pub items: Pubkey,

    pub schema_index: u64,
}

impl ItemClassV1 {
    pub const PREFIX: &'static str = "item_class_v1";
    pub const SPACE: usize = 8 + // anchor
    32 + // authority
    32 + // members
    8; // schema_index
}

// a schema contains all materials and build information for an item class v1
// seeds = ['schema', schema_index.to_le_bytes(), item_class.key()]
#[account]
pub struct Schema {
    pub schema_index: u64,

    // item class this schema builds
    pub item_class: Pubkey,

    // if false building is disabled for this item class
    pub build_enabled: bool,

    // list of materials required to use this schema to build the item class v1
    pub materials: Vec<Material>,
}

impl Schema {
    pub const PREFIX: &'static str = "schema";
    pub const INITIAL_INDEX: u64 = 0;
    pub fn space(material_count: usize) -> usize {
        8 + // anchor
        8 + // schema index
        32 + // item_class
        1 + // enabled
        4 + (Material::SPACE * material_count) // materials
    }
}

// manages the lifecycle of the item class build process for a builder
// seeds = ['build', item_class.key(), schema.key().as_ref(), builder.key().as_ref()]
#[account]
pub struct Build {
    pub builder: Pubkey,

    // mint of the token received at the end
    pub item_mint: Option<Pubkey>,

    // current build materials
    pub materials: Vec<Material>,

    pub status: BuildStatus,
}

impl Build {
    pub const PREFIX: &'static str = "build";
    pub fn space(material_count: usize) -> usize {
        8 + // anchor
        32 + // builder
        (1 + 32) + // output mint
        (1 + 1) + // status
        4 + (Material::SPACE * material_count) // materials
    }
}
