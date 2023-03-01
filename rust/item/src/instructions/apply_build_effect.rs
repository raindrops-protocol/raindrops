use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Build, ItemClassV1, ItemV1},
    errors::ErrorCode,
    BuildStatus,
};

#[derive(Accounts)]
pub struct ApplyBuildEffect<'info> {
    #[account(mut,
        has_one = item_mint,
        seeds = [ItemV1::PREFIX.as_bytes(), material_item_class.key().as_ref(), item_mint.key().as_ref()], bump)]
    pub item: Account<'info, ItemV1>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), material_item_class.items.key().as_ref()], bump)]
    pub material_item_class: Account<'info, ItemClassV1>,

    pub item_mint: Account<'info, token::Mint>,

    #[account(
        has_one = builder,
        mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    /// CHECK: build pda checks this account
    pub builder: UncheckedAccount<'info>,

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
    for build_material_data in ctx.accounts.build.materials.iter_mut() {
        // find the specific item within the build material that is referenced in this instruction
        for mint_data in build_material_data.mints.iter_mut() {
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
            build_material_data
                .build_effect
                .degredation
                .apply(&mut ctx.accounts.item.item_state);

            // apply cooldown
            build_material_data
                .build_effect
                .cooldown
                .apply(&mut ctx.accounts.item.item_state);

            applied = true;
        }
    }
    require!(applied, ErrorCode::IncorrectMaterial);

    Ok(())
}
