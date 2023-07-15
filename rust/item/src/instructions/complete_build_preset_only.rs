use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, BuildPermit, ItemClassV1, Recipe},
    errors::ErrorCode,
    is_signer, BuildStatus,
};

#[derive(Accounts)]
pub struct CompleteBuildPresetOnly<'info> {
    #[account(
        constraint = item_class.output_mode.is_preset_only(),
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(
        has_one = item_class,
        seeds = [Recipe::PREFIX.as_bytes(), &recipe.recipe_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(mut,
        has_one = recipe,
        constraint = build_permit.builder.eq(&build.builder.key()),
        seeds = [BuildPermit::PREFIX.as_bytes(), build.builder.key().as_ref(), recipe.key().as_ref()], bump)]
    pub build_permit: Option<Account<'info, BuildPermit>>,

    #[account(mut,
        constraint = recipe.recipe_index == build.recipe_index,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, constraint = is_signer(&payer.key()))]
    pub payer: Signer<'info>,
}

pub fn handler(ctx: Context<CompleteBuildPresetOnly>) -> Result<()> {
    // check build requirements are met
    ctx.accounts.build.validate_build_criteria()?;

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

    // if build permit is in use we must decrement the remaining builds
    if ctx.accounts.build.build_permit_in_use {
        match &mut ctx.accounts.build_permit {
            Some(build_permit) => {
                // decrement the remaining builds this build permit is allowed
                build_permit.remaining_builds -= 1;

                // if remaining builds are now 0, lets close the PDA
                if build_permit.remaining_builds == 0 {
                    ctx.accounts
                        .build_permit
                        .close(ctx.accounts.payer.to_account_info())?;
                }
            }
            None => return Err(ErrorCode::BuildPermitRequired.into()),
        }
    }

    Ok(())
}
