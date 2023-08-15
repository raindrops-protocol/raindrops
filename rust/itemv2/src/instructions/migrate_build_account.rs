use anchor_lang::prelude::*;

use crate::state::{
    accounts::{reallocate, Build, Recipe},
    errors::ErrorCode,
    BuildIngredientData, BuildOutput, BuildStatus, PaymentState,
};

#[derive(Accounts)]
pub struct MigrateBuildAccount<'info> {
    /// CHECK: old build account data
    #[account(mut)]
    pub build: UncheckedAccount<'info>,

    pub recipe: Account<'info, Recipe>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigrateBuildAccount>) -> Result<()> {
    msg!("migrating build account: {}", &ctx.accounts.build.key());
    let build_account_info = &ctx.accounts.build.to_account_info();

    // get current space of account
    let old_space = build_account_info.data_len();
    msg!("old_build_account_space: {}", old_space);

    // Extract old data within a local scope to ensure the mutable borrow is released afterwards
    let (
        old_builder,
        old_item_class,
        old_output,
        old_payment,
        old_ingredients,
        old_status,
        old_build_permit_in_use,
    ) = {
        let b = &build_account_info.try_borrow_mut_data().unwrap();
        let build_account: OldBuild = AnchorDeserialize::deserialize(&mut &b[8..]).unwrap();

        (
            build_account.builder,
            build_account.item_class,
            build_account.output.clone(),
            build_account.payment.clone(),
            build_account.ingredients.clone(),
            build_account.status.clone(),
            build_account.build_permit_in_use,
        )
    };

    // Create new build data using fetched old data
    let new_build_data: Build = Build {
        recipe: ctx.accounts.recipe.key(),
        builder: old_builder,
        item_class: old_item_class,
        output: old_output,
        payment: old_payment,
        ingredients: old_ingredients,
        status: old_status,
        build_permit_in_use: old_build_permit_in_use,
    };
    msg!("new_build_data: {:?}", new_build_data);

    // Serialize the new_build_data
    let new_build_data_vec = new_build_data.try_to_vec().unwrap();

    // Ensure the size fits
    assert!(8 + new_build_data_vec.len() <= ctx.accounts.build.data_len());

    // Borrow the build account mutably and overwrite its data (excluding the first 8 bytes)
    {
        let mut build_account_data = ctx.accounts.build.try_borrow_mut_data()?;
        build_account_data[8..8 + new_build_data_vec.len()].copy_from_slice(&new_build_data_vec);
    }

    // get the new space of the account
    let new_space = new_build_data.current_space();
    msg!("new_build_account_space: {}", new_space);

    // calculate the diff in space from old and new
    let space_diff = new_space as i64 - old_space as i64;
    msg!("space_diff: {}", space_diff);

    // reallocate the account data based on the diff
    reallocate(
        space_diff,
        build_account_info,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    )?;

    // deserialize new account
    let new_account_data: Account<'_, Build> =
        Account::try_from(&ctx.accounts.build.to_account_info()).unwrap();
    msg!("new_build_account: {:?}", new_account_data);

    // simple check to make sure the new account data is correct
    require!(
        new_account_data.builder.eq(&old_builder),
        ErrorCode::MigrationError
    );

    Ok(())
}

#[account]
pub struct OldBuild {
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
