use anchor_lang::prelude::*;

// seeds = ['item_class_v1', item_class_mint.key().as_ref()]
#[account]
pub struct ItemClassV1 {
    // schema index
    pub schema_index: u64,
}

impl ItemClassV1 {
    pub const PREFIX: &'static str = "item_class_v1";
    pub const SPACE: usize = 8 + // anchor
    8; // schema_index 
}

// seeds = ['item_v1', item_class_mint.key(), item_mint.key()]
#[account]
pub struct ItemV1 {}

impl ItemV1 {
    pub const PREFIX: &'static str = "item_v1";
    pub const SPACE: usize = 8 + // anchor
    8; // schema_index 
}

// a component in a schema
// seeds = ['component_v1', item_class_mint.key().as_ref(), component_mint.key().as_ref()]
#[account]
pub struct ComponentV1 {}

impl ComponentV1 {
    pub const PREFIX: &'static str = "component_v1";
    pub const SPACE: usize = 8; // anchor bytes
}

// each schema links to a list of components which can be used to build the ItemClassV1
// seeds = ['schema', item_class_mint.key(), schema_index]
#[account]
pub struct SchemaV1 {
    // if true, schema is allowed to be used to build the item class v1
    pub enabled: bool,

    // if true, activate the item within the build instruction
    pub auto_activate_item: bool,

    // the list of component mints required by the schema to build the item class
    pub components: Vec<Pubkey>,
}

impl SchemaV1 {
    pub const PREFIX: &'static str = "schema";
    pub fn space(component_count: usize) -> usize {
        8 + // anchor
        4 + (32 * component_count) // components
    }
}

// manages the escrowing of components during the build process
// seeds = ['build_escrow', item_class_mint.key(), schema.key().as_ref(), builder.key().as_ref()]
#[account]
pub struct BuildEscrow {
    // list of mints escrowed
    pub escrowed_components: Pubkey,
}

impl BuildEscrow {
    pub const PREFIX: &'static str = "build_escrow";
    pub fn space(component_count: usize) -> usize {
        8 + // anchor
        4 + (32 * component_count) // components
    }
} 