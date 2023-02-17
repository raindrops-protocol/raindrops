use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{Build, ItemClassV1, Schema};

#[derive(Accounts)]
#[instruction(schema_index: u64)]
pub struct CompleteBuild<'info> {
    #[account(mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref(), &schema_index.to_le_bytes()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.members.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CompleteBuild>) -> Result<()> {
    // check build meets schema requirements
    // transfer or burn build item classes back to builder
    // close build account
    // mint pNFT to user
    Ok(())
}
