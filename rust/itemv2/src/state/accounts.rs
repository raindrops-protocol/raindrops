use std::convert::TryInto;

use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};
use anchor_spl::metadata;

use crate::state::PaymentStatus;

use super::{
    errors::ErrorCode, BuildIngredientData, BuildOutput, BuildStatus,
    DeterministicIngredientOutput, IngredientMint, ItemClassMode, ItemState, OutputSelectionGroup,
    Payment, PaymentState, RecipeIngredientData,
};

// seeds = ['item_class', authority_mint.key().as_ref()]
#[account]
pub struct ItemClass {
    pub name: String,

    // token owners have authority over the item class
    pub authority_mint: Pubkey,

    // if none, there aren't any recipes associated with this item class
    pub recipe_index: Option<u64>,

    // item class membership mode
    pub mode: ItemClassMode,
}

impl ItemClass {
    pub const PREFIX: &'static str = "item_class";

    pub fn space(name: String) -> usize {
        8 + // anchor
        4 + name.len() + // name size
        32 + // authority mint
        (1 + 8) + // recipe_index
        ItemClassMode::SPACE // membership mode
    }

    pub fn get_next_recipe_index(&self) -> u64 {
        match self.recipe_index {
            Some(index) => index + 1,
            None => 0,
        }
    }
}

// seeds = ['item', item_mint.key().as_ref()]

#[account]
pub struct Item {
    pub initialized: bool,

    // mint this item represents
    pub item_mint: Pubkey,

    // defines the current state of the item
    pub item_state: ItemState,
}

impl Item {
    pub const PREFIX: &'static str = "item";
    pub const SPACE: usize = 8 + // anchor
    1 + // initialized 
    32 + // mint
    ItemState::SPACE; // state
}

// a recipe contains all ingredients and build information for an item class
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

    // the builder can select from these outputs when using this recipe
    pub selectable_outputs: Vec<OutputSelectionGroup>,

    // list of ingredients required to use this recipe to build the item class
    pub ingredients: Vec<RecipeIngredientData>,
}

impl Recipe {
    pub const PREFIX: &'static str = "recipe";
    pub const INITIAL_INDEX: u64 = 0;
    pub const INIT_SPACE: usize = 8 + // anchor
    8 + // recipe index
    32 + // item class
    1 + // build enabled
    (1 + Payment::SPACE) + // optional payment
    1 + // build permit required
    4 + // init selectable outputs vector
    4; // init ingredients vector

    fn current_space(&self) -> usize {
        let mut total_space = Recipe::INIT_SPACE;

        total_space += self.ingredients.len() * RecipeIngredientData::SPACE;

        for output_group in &self.selectable_outputs {
            total_space += output_group.current_space();
        }

        total_space
    }

    pub fn set_selectable_outputs<'info>(
        &mut self,
        selectable_outputs: Vec<OutputSelectionGroup>,
        recipe: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) -> Result<()> {
        let old_space = self.current_space();

        self.selectable_outputs = selectable_outputs;

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, recipe, payer, system_program)
    }

    pub fn set_ingredient_data<'info>(
        &mut self,
        ingredient_data: Vec<RecipeIngredientData>,
        recipe: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) -> Result<()> {
        let old_space = self.current_space();

        self.ingredients = ingredient_data;

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, recipe, payer, system_program)
    }
}

// manages the lifecycle of the item class build process for a builder
// seeds = ['build', item_class.key(), builder.key().as_ref()]
#[account]
#[derive(Debug)]
pub struct Build {
    // points to the recipe used for this build
    pub recipe: Pubkey,

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
    pub const PAYMENT_ESCROW_PREFIX: &'static str = "build_payment_escrow";
    pub const INIT_SPACE: usize = 8 + // anchor
        32 + // recipe
        32 + // builder
        32 + // item class
        BuildOutput::INIT_SPACE + // build output
        (1 + PaymentState::SPACE) + // payment
        BuildStatus::SPACE + // build status
        1 + // build permit in use
        4; // ingredients init

    pub fn current_space(&self) -> usize {
        let mut total_space = Build::INIT_SPACE;

        for ingredient in &self.ingredients {
            total_space += ingredient.current_space();
        }

        total_space += self.output.current_space();

        total_space
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

                // dont allow builders to put in more than the required amount
                require!(
                    build_ingredient_data.current_amount <= build_ingredient_data.required_amount,
                    ErrorCode::IncorrectIngredient
                );

                found = true;
                break;
            }
        }

        require!(found, ErrorCode::IncorrectIngredient);

        Ok(())
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

    pub fn set_initial_ingredient_state<'info>(
        &mut self,
        ingredient_data: Vec<BuildIngredientData>,
        build: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) -> Result<()> {
        let old_space = self.current_space();

        self.ingredients = ingredient_data;

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, build, payer, system_program)
    }

    pub fn add_output_item<'info>(
        &mut self,
        mint: Pubkey,
        amount: u64,
        build: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) -> Result<()> {
        let old_space = self.current_space();

        self.output.add_output(mint, amount);

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, build, payer, system_program)
    }

    pub fn add_ingredient<'info>(
        &mut self,
        ingredient_mint: Pubkey,
        ingredient_item_class: &Pubkey,
        build: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) -> Result<()> {
        let old_space = self.current_space();

        let mut verified = false;
        for build_ingredient_data in self.ingredients.iter_mut() {
            if build_ingredient_data.item_class.eq(ingredient_item_class) {
                // check this mint wasn't already verified
                let already_verified = build_ingredient_data
                    .mints
                    .iter()
                    .any(|mint_data| mint_data.mint.eq(&ingredient_mint));
                require!(!already_verified, ErrorCode::IncorrectIngredient);

                // add the mint to the list of build ingredients
                build_ingredient_data.mints.push(IngredientMint {
                    build_effect_applied: false,
                    mint: ingredient_mint,
                });

                verified = true;

                break;
            }
        }
        require!(verified, ErrorCode::IncorrectIngredient);

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, build, payer, system_program)
    }

    pub fn validate_build_criteria(&self) -> Result<()> {
        // check build is in progress
        require!(
            self.status.eq(&BuildStatus::InProgress),
            ErrorCode::InvalidBuildStatus
        );

        // check build requirements are met
        let build_requirements_met = self
            .ingredients
            .iter()
            .all(|ingredient| ingredient.current_amount >= ingredient.required_amount);
        require!(build_requirements_met, ErrorCode::MissingIngredient);

        // check payment has either been escrowed or sent to final destination
        self.payment.as_ref().map_or(Ok(()), |payment| {
            require!(
                payment.status.ne(&PaymentStatus::NotPaid),
                ErrorCode::BuildNotPaid
            );
            Ok(())
        })
    }
}

// seeds = ['pack', item_class.key().as_ref(), &id.to_le_bytes()]
#[account]
pub struct Pack {
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
    8 + // id
    32 + // item class
    32; // contents hash
}

// seeds = ['build_permit', builder, item_class]
// we rely on the fact that each wallet can only do 1 concurrent build because of the build pda seed setup
// if this changes we need to take into account multiple builds in parallel and make sure you can't game the build permit system
#[account]
pub struct BuildPermit {
    pub builder: Pubkey,
    pub item_class: Pubkey,
    pub remaining_builds: u16,
}

impl BuildPermit {
    pub const PREFIX: &'static str = "build_permit";

    pub const SPACE: usize = 8 + // anchor
    32 + // item class
    32 + // builder
    2; // remaining_builds
}

// seeds = ['deterministic_ingredient', item_class.key(), ingredient_mint.key().as_ref()]
#[account]
pub struct DeterministicIngredient {
    pub recipes: Vec<Pubkey>,

    pub ingredient_mint: Pubkey,

    pub outputs: Vec<DeterministicIngredientOutput>,
}

impl DeterministicIngredient {
    pub const PREFIX: &'static str = "deterministic_ingredient";

    pub fn space(recipe_count: usize, outputs_count: usize) -> usize {
        8 + // anchor
        4 + (recipe_count * 32) + // recipe vector pubkeys
        32 + // ingredient mint
        4 + (outputs_count * DeterministicIngredientOutput::SPACE)
    }
}

pub fn reallocate<'info>(
    size_diff: i64,
    account: &AccountInfo<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
) -> Result<()> {
    let new_size = (account.data_len() as i64 + size_diff) as usize;
    account.realloc(new_size, false)?;

    let rent = Rent::get()?;

    let lamports_required = rent.minimum_balance(new_size);

    let current_lamports = account.lamports();

    let transfer_amount: i64 = (lamports_required as i64) - (current_lamports as i64);

    // no need to transfer
    if transfer_amount == 0 {
        return Ok(());
    }

    if transfer_amount > 0 {
        // if transfer amount is more than 0 we need to transfer lamports to the account
        let transfer_accounts = Transfer {
            from: payer.to_account_info(),
            to: account.to_account_info(),
        };

        transfer(
            CpiContext::new(system_program.to_account_info(), transfer_accounts),
            transfer_amount.try_into().unwrap(),
        )
    } else {
        // if transfer amount is less than 0 this means we need to return lamports to the payer
        let transfer_to_payer_amount = transfer_amount.unsigned_abs();

        **account.try_borrow_mut_lamports()? -= transfer_to_payer_amount;
        **payer.try_borrow_mut_lamports()? += transfer_to_payer_amount;

        Ok(())
    }
}

pub fn is_collection_member(
    ingredient_mint_metadata: metadata::MetadataAccount,
    collection_mint: &Pubkey,
) -> Result<()> {
    let collection_data = ingredient_mint_metadata.collection.clone().unwrap();

    require!(collection_data.verified, ErrorCode::IncorrectIngredient);
    require!(
        collection_data.key.eq(collection_mint),
        ErrorCode::IncorrectIngredient
    );

    Ok(())
}
