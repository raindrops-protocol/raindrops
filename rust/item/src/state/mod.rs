use anchor_lang::prelude::*;

// seeds = ['item_class_v1', membership_tree.key().as_ref()]
#[account]
pub struct ItemClassV1 {
    // merkle tree containing all the mints which belong to this item class
    pub members: Pubkey,
}

impl ItemClassV1 {
    pub const PREFIX: &'static str = "item_class_v1";
    pub const SPACE: usize = 8 + // anchor
    32; // members
}

// a schema contains all materials and build information for an item class v1
// seeds = ['schema', item_class.key()]
#[account]
pub struct Schema {
    pub item_class: Pubkey,

    // if true, activate the item class within the build instruction
    pub auto_activate: bool,

    // list of materials required to use this schema to build the item class v1
    pub materials: Vec<Material>,
}

impl Schema {
    pub const PREFIX: &'static str = "schema";
    pub fn space(materials: Vec<Material>) -> usize {
        8 + // anchor
        32 + // item_class
        1 + // auto_activate
        4 + (Material::SPACE * materials.len()) // materials
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Material {
    pub item_class: Pubkey,
    pub amount: u64,
}

impl Material {
    pub const SPACE: usize = 32 + // item class
    8; // amount
}

// manages the lifecycle of the item class build process for a builder
// seeds = ['build', item_class.key(), builder.key().as_ref()]
#[account]
pub struct Build {
    pub builder: Pubkey,

    // current build materials
    pub materials: Vec<Material>,
}

impl Build {
    pub const PREFIX: &'static str = "build";
    pub fn space(material_count: usize) -> usize {
        8 + // anchor
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
