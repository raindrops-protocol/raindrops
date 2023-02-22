use anchor_lang::prelude::*;

use crate::state::{errors::ErrorCode, accounts::{Build, ItemClassV1, Schema}, BuildStatus};

#[derive(Accounts)]
pub struct CompleteBuild<'info> {
    #[account(mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,
}

pub fn handler(ctx: Context<CompleteBuild>) -> Result<()> {
    // check build meets schema requirements
    for required_material in &ctx.accounts.schema.materials {
        let mut found = false;
        for escrowed_material in &ctx.accounts.build.materials {
            if required_material
                .item_class
                .eq(&escrowed_material.item_class)
                && required_material.amount == escrowed_material.amount
            {
                found = true;
                break;
            }
        }
        require!(found, ErrorCode::MissingBuildMaterial);
    }

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

    Ok(())
}
