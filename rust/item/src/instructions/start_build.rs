use std::vec;

use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, ItemClassV1, Recipe},
    errors::ErrorCode,
    BuildIngredientData, BuildStatus, OutputSelectionArgs, OutputSelectionGroup, PaymentState,
};

#[derive(Accounts)]
#[instruction(args: StartBuildArgs)]
pub struct StartBuild<'info> {
    #[account(init,
        payer = builder,
        space = Build::space(&recipe.ingredients),
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Recipe::PREFIX.as_bytes(), &args.recipe_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StartBuildArgs {
    pub recipe_index: u64,
    pub recipe_output_selection: Vec<OutputSelectionArgs>,
}

pub fn handler(ctx: Context<StartBuild>, args: StartBuildArgs) -> Result<()> {
    // check this recipe is enabled for building
    require!(ctx.accounts.recipe.build_enabled, ErrorCode::BuildDisabled);

    // set initial build ingredient state
    let mut ingredients: Vec<BuildIngredientData> =
        Vec::with_capacity(ctx.accounts.recipe.ingredients.len());
    for required_ingredient in ctx.accounts.recipe.ingredients.clone() {
        ingredients.push(required_ingredient.into());
    }

    let payment: Option<PaymentState> =
        ctx.accounts
            .recipe
            .payment
            .as_ref()
            .map(|payment| PaymentState {
                paid: false,
                payment_details: payment.clone(),
            });

    // set initial build data
    ctx.accounts.build.set_inner(Build {
        recipe_index: args.recipe_index,
        builder: ctx.accounts.builder.key(),
        item_class: ctx.accounts.item_class.key(),
        status: BuildStatus::InProgress,
        payment,
        ingredients,
        outputs: vec![],
    });

    // add selectable outputs to the build data
    let selected_outputs: Vec<(Pubkey, u64)> = parse_selected_outputs(
        &args.recipe_output_selection,
        &ctx.accounts.recipe.output_selection,
    )?;
    for selected_output in selected_outputs {
        ctx.accounts
            .build
            .add_build_output(selected_output.0, selected_output.1);
    }

    Ok(())
}

pub fn parse_selected_outputs(
    args: &[OutputSelectionArgs],
    groups: &[OutputSelectionGroup],
) -> Result<Vec<(Pubkey, u64)>> {
    let mut mints_and_amounts: Vec<(Pubkey, u64)> = Vec::new();

    for arg in args {
        let group = groups.iter().find(|g| g.group_id == arg.group_id);

        match group {
            Some(group) => {
                let output = group.choices.iter().find(|o| o.output_id == arg.output_id);

                match output {
                    Some(output) => {
                        mints_and_amounts.push((output.mint, output.amount));
                    }
                    None => {
                        return Err(ErrorCode::InvalidOutputSelection.into());
                    }
                }
            }
            None => {
                return Err(ErrorCode::InvalidOutputSelection.into());
            }
        }
    }

    Ok(mints_and_amounts)
}
