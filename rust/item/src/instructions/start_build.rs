use anchor_lang::prelude::*;

use crate::state::{errors::ErrorCode, accounts::{Build, ItemClassV1, Schema}, Material};

#[derive(Accounts)]
pub struct StartBuild<'info> {
    #[account(init,
        payer = builder,
        space = Build::space(schema.materials.len()),
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<StartBuild>) -> Result<()> {
    require!(ctx.accounts.schema.build_enabled, ErrorCode::BuildDisabled);
    let build = &mut ctx.accounts.build;
    for required_material in &ctx.accounts.schema.materials {
        build.materials.push(Material {
            item_mint: None,
            item_class: required_material.item_class,
            amount: 0,
        });
    }
    msg!("{:?}", build.materials);
    Ok(())
}
