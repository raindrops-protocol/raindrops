use std::convert::TryInto;

use anchor_lang::prelude::*;

use super::{BuildMaterialData, BuildStatus, ItemState, Payment, PaymentState, RecipeMaterialData};

// seeds = ['item_class_v1', items.key().as_ref()]
#[account]
pub struct ItemClassV1 {
    // controls the item class
    pub authority: Pubkey,

    // merkle tree containing all item addresses belonging to this item class
    pub items: Pubkey,

    pub recipe_index: u64,
}

impl ItemClassV1 {
    pub const PREFIX: &'static str = "item_class_v1";
    pub const SPACE: usize = 8 + // anchor
    32 + // authority
    32 + // items 
    8; // recipe_index
}

// seeds = ['item_v1', item_class.key().as_ref(), item_mint.key().as_ref()]

#[account]
pub struct ItemV1 {
    pub initialized: bool,

    // item class this item is a part of
    pub item_class: Pubkey,

    // mint this item represents
    pub item_mint: Pubkey,

    // defines the current state of the item
    pub item_state: ItemState,
}

impl ItemV1 {
    pub const PREFIX: &'static str = "item_v1";
    pub const SPACE: usize = 8 + // anchor
    1 + // initialized 
    32 + // item class
    32 + // mint
    ItemState::SPACE; // state
}

// a recipe contains all materials and build information for an item class v1
// seeds = ['recipe', recipe_index.to_le_bytes(), item_class.key()]
#[account]
pub struct Recipe {
    pub recipe_index: u64,

    // item class this recipe builds
    pub item_class: Pubkey,

    // if false building is disabled for this item class
    pub build_enabled: bool,

    // if Some, SOL is required
    pub payment: Option<Payment>,

    // list of materials required to use this recipe to build the item class v1
    pub materials: Vec<RecipeMaterialData>,
}

impl Recipe {
    pub const PREFIX: &'static str = "recipe";
    pub const INITIAL_INDEX: u64 = 0;
    pub fn space(material_count: usize) -> usize {
        8 + // anchor
        8 + // recipe index
        32 + // item_class
        1 + // enabled
        (1 + Payment::SPACE) + // payment
        4 + (RecipeMaterialData::SPACE * material_count) // materials
    }
}

// manages the lifecycle of the item class build process for a builder
// seeds = ['build', item_class.key(), builder.key().as_ref()]
#[account]
pub struct Build {
    // points to the recipe used for this build
    pub recipe_index: u64,

    pub builder: Pubkey,

    // item class of the item that will be built
    pub item_class: Pubkey,

    // mint of the token received at the end
    pub item_mint: Option<Pubkey>,

    // payment state
    pub payment: Option<PaymentState>,

    // current build materials
    pub materials: Vec<BuildMaterialData>,

    // current status of the build
    pub status: BuildStatus,
}

impl Build {
    pub const PREFIX: &'static str = "build";
    pub fn space(recipe_material_data: &Vec<RecipeMaterialData>) -> usize {
        8 + // anchor
        8 + // recipe_index
        32 + // builder
        32 + // item class
        (1 + 32) + // item mint
        (1 + 1) + // status
        (1 + PaymentState::SPACE) + // payment
        4 + (Self::build_material_data_space(recipe_material_data)) // materials
    }

    fn build_material_data_space(recipe_material_data: &Vec<RecipeMaterialData>) -> usize {
        let mut total_build_material_space: usize = 0;
        for material_data in recipe_material_data {
            total_build_material_space +=
                BuildMaterialData::space(material_data.required_amount.try_into().unwrap())
        }

        total_build_material_space
    }

    pub fn build_effect_applied(&self, material_item_class: Pubkey, material_mint: Pubkey) -> bool {
        for build_material_data in &self.materials {
            // get corresponding item class
            if build_material_data.item_class.eq(&material_item_class) {
                // find the specific mint within the item class and verify the build effect has been applied
                for mint_data in &build_material_data.mints {
                    if mint_data.mint.eq(&material_mint) {
                        return mint_data.build_effect_applied;
                    }
                }
            }
        }
        return false;
    }

    pub fn verify_build_mint(&self, material_item_class: Pubkey, material_mint: Pubkey) -> bool {
        // verify material_mint
        for build_material_data in &self.materials {
            // find the corresponding item class
            if material_item_class.eq(&build_material_data.item_class) {
                // check the material mint exists in the list of verified mints
                let verified = build_material_data
                    .mints
                    .iter()
                    .any(|mint_data| mint_data.mint.eq(&material_mint));
                return verified;
            }
        }
        false
    }

    pub fn increment_build_amount(&mut self, material_item_class: Pubkey, amount: u64) {
        for build_material_data in self.materials.iter_mut() {
            // find the corresponding item class
            if material_item_class.eq(&build_material_data.item_class) {
                build_material_data.current_amount += amount;
            }
        }
    }

    pub fn decrement_build_amount(&mut self, material_item_class: Pubkey, amount: u64) {
        for build_material_data in self.materials.iter_mut() {
            // find the corresponding item class
            if material_item_class.eq(&build_material_data.item_class) {
                build_material_data.current_amount -= amount;
            }
        }
    }
}
