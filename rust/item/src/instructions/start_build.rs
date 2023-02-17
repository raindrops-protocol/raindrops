use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{Build, ItemClassV1, Schema};

#[derive(Accounts)]
pub struct StartBuild<'info> {
    #[account(init,
        payer = builder,
        space = Build::space(schema.materials.len()),
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.members.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<StartBuild>) -> Result<()> {
    Ok(())
}
