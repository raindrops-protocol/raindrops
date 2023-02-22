use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, ItemClassV1, Schema},
    errors::ErrorCode,
    BuildStatus, Material,
};

#[derive(Accounts)]
#[instruction(args: StartBuildArgs)]
pub struct StartBuild<'info> {
    #[account(init,
        payer = builder,
        space = Build::space(schema.materials.len()),
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), &args.schema_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StartBuildArgs {
    pub schema_index: u64,
}

pub fn handler(ctx: Context<StartBuild>) -> Result<()> {
    // check this schema is enabled for building
    require!(ctx.accounts.schema.build_enabled, ErrorCode::BuildDisabled);

    // set initial build material state
    let build = &mut ctx.accounts.build;
    for required_material in &ctx.accounts.schema.materials {
        build.materials.push(Material {
            item_mint: None,
            item_class: required_material.item_class,
            amount: 0,
        });
    }

    // set the build to in progress
    build.status = BuildStatus::InProgress;

    Ok(())
}
