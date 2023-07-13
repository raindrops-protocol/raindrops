use std::convert::TryInto;

use anchor_lang::prelude::*;

use super::{
    errors::ErrorCode, BuildIngredientData, BuildOutput, BuildOutputItem, BuildStatus,
    DeterministicIngredientOutput, ItemClassV1OutputMode, ItemState, Payment, PaymentState,
    RecipeIngredientData,
};

// seeds = ['item_class_v1', items.key().as_ref()]
#[account]
pub struct ItemClassV1 {
    // controls the item class
    pub authority: Pubkey,

    // merkle tree containing all item addresses belonging to this item class
    pub items: Pubkey,

    pub recipe_index: u64,

    // defines the behavior when the item class is the target of a build output
    pub output_mode: ItemClassV1OutputMode,
}

impl ItemClassV1 {
    pub const PREFIX: &'static str = "item_class_v1";
    pub const SPACE: usize = 8 + // anchor
    32 + // authority
    32 + // items 
    8 + // recipe_index
    ItemClassV1OutputMode::SPACE; // output mode
}

// seeds = ['item_v1', item_mint.key().as_ref()]

#[account]
pub struct ItemV1 {
    pub initialized: bool,

    // mint this item represents
    pub item_mint: Pubkey,

    // defines the current state of the item
    pub item_state: ItemState,
}

impl ItemV1 {
    pub const PREFIX: &'static str = "item_v1";
    pub const SPACE: usize = 8 + // anchor
    1 + // initialized 
    32 + // mint
    ItemState::SPACE; // state
}

// a recipe contains all ingredients and build information for an item class v1
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

    // if true, the builder must have a build permit to use this recipe
    pub build_permit_required: bool,

    // list of ingredients required to use this recipe to build the item class v1
    pub ingredients: Vec<RecipeIngredientData>,
}

impl Recipe {
    pub const PREFIX: &'static str = "recipe";
    pub const INITIAL_INDEX: u64 = 0;
    pub fn space(ingredient_count: usize) -> usize {
        8 + // anchor
        8 + // recipe index
        32 + // item_class
        1 + // enabled
        (1 + Payment::SPACE) + // payment
        1 + // build permit required
        4 + (RecipeIngredientData::SPACE * ingredient_count) // ingredients
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
    pub output: BuildOutput,

    // payment state
    pub payment: Option<PaymentState>,

    // current build ingredients
    pub ingredients: Vec<BuildIngredientData>,

    // current status of the build
    pub status: BuildStatus,

    // if true, a build permit is used for this build
    pub build_permit_in_use: bool,
}

impl Build {
    pub const PREFIX: &'static str = "build";
    pub fn space(recipe_ingredient_data: &Vec<RecipeIngredientData>) -> usize {
        8 + // anchor
        8 + // recipe_index
        32 + // builder
        32 + // item class
        BuildOutput::space(10) + // option build output
        (1 + 32) + // item mint
        (1 + 1) + // status
        (1 + PaymentState::SPACE) + // payment
        1 + // build permit in use
        4 + (Self::build_ingredient_data_space(recipe_ingredient_data)) // ingredients
    }

    fn build_ingredient_data_space(recipe_ingredient_data: &Vec<RecipeIngredientData>) -> usize {
        let mut total_build_ingredient_space: usize = 0;
        for ingredient_data in recipe_ingredient_data {
            total_build_ingredient_space +=
                BuildIngredientData::space(ingredient_data.required_amount.try_into().unwrap())
        }

        total_build_ingredient_space
    }

    pub fn build_effect_applied(&self, ingredient_mint: Pubkey) -> Result<()> {
        // find the ingredient mint in the build data
        for build_ingredient_data in &self.ingredients {
            for mint_data in &build_ingredient_data.mints {
                if mint_data.mint.eq(&ingredient_mint) {
                    if mint_data.build_effect_applied {
                        return Ok(());
                    } else {
                        return Err(ErrorCode::BuildEffectNotApplied.into());
                    }
                }
            }
        }
        Err(ErrorCode::IncorrectIngredient.into())
    }

    pub fn find_build_ingredient(
        &self,
        ingredient_item_class: Pubkey,
        ingredient_mint: Pubkey,
    ) -> Result<&BuildIngredientData> {
        // verify ingredient_mint
        for build_ingredient_data in &self.ingredients {
            // find the corresponding item class
            if ingredient_item_class.eq(&build_ingredient_data.item_class) {
                // check the ingredient mint exists in the list of verified mints
                let verified = build_ingredient_data
                    .mints
                    .iter()
                    .any(|mint_data| mint_data.mint.eq(&ingredient_mint));
                if verified {
                    return Ok(build_ingredient_data);
                }
            }
        }
        Err(ErrorCode::IncorrectIngredient.into())
    }

    pub fn increment_build_amount(&mut self, ingredient_mint: Pubkey, amount: u64) -> Result<()> {
        let mut found = false;
        for build_ingredient_data in self.ingredients.iter_mut() {
            if build_ingredient_data
                .mints
                .iter()
                .any(|mint_data| mint_data.mint.eq(&ingredient_mint))
            {
                build_ingredient_data.current_amount += amount;
                found = true;
                break;
            }
        }
        if found {
            Ok(())
        } else {
            Err(ErrorCode::IncorrectIngredient.into())
        }
    }

    pub fn decrement_build_amount(&mut self, ingredient_mint: Pubkey, amount: u64) -> Result<()> {
        let mut found = false;
        for build_ingredient_data in self.ingredients.iter_mut() {
            if build_ingredient_data
                .mints
                .iter()
                .any(|mint_data| mint_data.mint.eq(&ingredient_mint))
            {
                build_ingredient_data.current_amount -= amount;
                found = true;
                break;
            }
        }
        if found {
            Ok(())
        } else {
            Err(ErrorCode::IncorrectIngredient.into())
        }
    }

    pub fn add_output_item(&mut self, mint: Pubkey, amount: u64) {
        self.output.items.push(BuildOutputItem {
            mint,
            amount,
            received: false,
        });
    }
}

// seeds = ['pack', item_class.key().as_ref(), &id.to_le_bytes()]
#[account]
pub struct Pack {
    // if true, this pack has already been opened
    pub opened: bool,

    // unique id
    pub id: u64,

    // item class which this pack belongs to
    pub item_class: Pubkey,

    // a hash of the contents stored by this pack
    pub contents_hash: [u8; 32],
}

impl Pack {
    pub const PREFIX: &'static str = "pack";

    pub const SPACE: usize = 8 + // anchor
    1 + // opened
    8 + // id
    32 + // item class
    32; // contents hash
}

// seeds = ['build_permit', wallet, item_class]
// we rely on the fact that each wallet can only do 1 concurrent build because of the build pda seed setup
// if this changes we need to take into account multiple builds in parallel and make sure you can't game the build permit system
#[account]
pub struct BuildPermit {
    pub item_class: Pubkey,
    pub wallet: Pubkey,
    pub remaining_builds: u16,
}

impl BuildPermit {
    pub const PREFIX: &'static str = "build_permit";

    pub const SPACE: usize = 8 + // anchor
    32 + // item class
    32 + // wallet
    2; // remaining_builds
}

// seeds = ['deterministic_ingredient', item_class.key(), ingredient_mint.key().as_ref()]
#[account]
pub struct DeterministicIngredient {
    pub item_class: Pubkey,

    pub ingredient_mint: Pubkey,

    pub outputs: Vec<DeterministicIngredientOutput>,
}

impl DeterministicIngredient {
    pub const PREFIX: &'static str = "deterministic_ingredient";

    pub fn space(output_count: usize) -> usize {
        8 + // anchor
        32 + // item class
        32 + // ingredient mint
        4 + (output_count * DeterministicIngredientOutput::SPACE)
    }
}
