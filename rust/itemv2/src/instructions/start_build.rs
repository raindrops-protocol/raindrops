use std::vec;

use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, BuildPermit, ItemClass, Recipe},
    errors::ErrorCode,
    BuildIngredientData, BuildOutput, BuildStatus, OutputSelectionArgs, OutputSelectionGroup,
    PaymentState,
};

#[derive(Accounts)]
#[instruction(args: StartBuildArgs)]
pub struct StartBuild<'info> {
    #[account(init,
        payer = builder,
        space = Build::INIT_SPACE,
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Recipe::PREFIX.as_bytes(), &args.recipe_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(mut, seeds = [ItemClass::PREFIX.as_bytes(), item_class.authority_mint.as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mut,
        has_one = recipe,
        has_one = builder,
        seeds = [BuildPermit::PREFIX.as_bytes(), builder.key().as_ref(), recipe.key().as_ref()], bump)]
    pub build_permit: Option<Account<'info, BuildPermit>>,

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

    // check build permit if recipe requires one
    let mut build_permit_in_use = false;
    if ctx.accounts.recipe.build_permit_required {
        match &mut ctx.accounts.build_permit {
            Some(build_permit) => {
                require!(
                    build_permit.remaining_builds > 0,
                    ErrorCode::NoBuildsRemaining
                );
                build_permit_in_use = true;
            }
            None => return Err(ErrorCode::BuildPermitRequired.into()),
        }
    };

    let payment: Option<PaymentState> =
        ctx.accounts
            .recipe
            .payment
            .as_ref()
            .map(|payment| PaymentState {
                paid: false,
                payment_details: payment.clone(),
            });

    // set build data
    ctx.accounts.build.set_inner(Build {
        recipe_index: args.recipe_index,
        builder: ctx.accounts.builder.key(),
        item_class: ctx.accounts.item_class.key(),
        output: BuildOutput::new(),
        status: BuildStatus::InProgress,
        payment,
        ingredients: vec![],
        build_permit_in_use,
    });

    // set initial build ingredient state
    let mut ingredients: Vec<BuildIngredientData> =
        Vec::with_capacity(ctx.accounts.recipe.ingredients.len());
    for required_ingredient in ctx.accounts.recipe.ingredients.clone() {
        ingredients.push(required_ingredient.into());
    }

    let build_account = &ctx.accounts.build.to_account_info();

    ctx.accounts.build.set_initial_ingredient_state(
        ingredients,
        build_account,
        ctx.accounts.builder.clone(),
        ctx.accounts.system_program.clone(),
    )?;

    // add selectable outputs to the build data
    let selected_outputs: Vec<SelectedOutput> = parse_selected_outputs(
        &args.recipe_output_selection,
        &ctx.accounts.recipe.selectable_outputs,
    )?;
    for selected_output in selected_outputs {
        ctx.accounts.build.add_output_item(
            selected_output.mint,
            selected_output.amount,
            build_account,
            ctx.accounts.builder.clone(),
            ctx.accounts.system_program.clone(),
        )?;
    }

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
struct SelectedOutput {
    mint: Pubkey,
    amount: u64,
}

fn parse_selected_outputs(
    args: &[OutputSelectionArgs],
    groups: &[OutputSelectionGroup],
) -> Result<Vec<SelectedOutput>> {
    let mut mints_and_amounts: Vec<SelectedOutput> = Vec::new();

    for arg in args {
        let group = groups.iter().find(|g| g.group_id == arg.group_id);

        match group {
            Some(group) => {
                let output = group.choices.iter().find(|o| o.output_id == arg.output_id);

                match output {
                    Some(output) => {
                        mints_and_amounts.push(SelectedOutput {
                            mint: output.mint,
                            amount: output.amount,
                        });
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
