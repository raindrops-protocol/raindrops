use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Build, ItemV1},
    errors::ErrorCode,
    BuildStatus,
};

#[derive(Accounts)]
pub struct ApplyBuildEffect<'info> {
    #[account(mut,
        has_one = item_mint,
        seeds = [ItemV1::PREFIX.as_bytes(), item_mint.key().as_ref()], bump)]
    pub item: Account<'info, ItemV1>,

    pub item_mint: Account<'info, token::Mint>,

    #[account(
        mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn handler(ctx: Context<ApplyBuildEffect>) -> Result<()> {
    // check that the build item has been retrieved by the builder
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::ItemReceived),
        ErrorCode::InvalidBuildStatus
    );

    // apply build effect defined in the build pda (derived from the schema)
    let mut applied = false;
    for build_ingredient_data in ctx.accounts.build.ingredients.iter_mut() {
        // find the specific item within the build ingredient that is referenced in this instruction
        for mint_data in build_ingredient_data.mints.iter_mut() {
            if mint_data.mint.ne(&ctx.accounts.item_mint.key()) {
                continue;
            }

            // check that we haven't already applied the build effect to this item
            require!(
                !mint_data.build_effect_applied,
                ErrorCode::BuildEffectAlreadyApplied
            );
            mint_data.build_effect_applied = true;

            // apply degredation
            build_ingredient_data
                .build_effect
                .degredation
                .apply(&mut ctx.accounts.item.item_state);

            // apply cooldown
            build_ingredient_data
                .build_effect
                .cooldown
                .apply(&mut ctx.accounts.item.item_state);

            applied = true;
        }
    }
    require!(applied, ErrorCode::IncorrectIngredient);

    Ok(())
}
