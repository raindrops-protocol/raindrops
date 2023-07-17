use anchor_lang::prelude::*;

use crate::state::accounts::{BuildPermit, ItemClass, Recipe};

#[derive(Accounts)]
#[instruction(args: CreateBuildPermitArgs)]
pub struct CreateBuildPermit<'info> {
    // init_if_needed here so you can overwrite an already created build permit with new data
    #[account(init_if_needed,
        payer = authority,
        space = BuildPermit::SPACE,
        seeds = [BuildPermit::PREFIX.as_bytes(), args.builder.key().as_ref(), recipe.key().as_ref()], bump)]
    pub build_permit: Account<'info, BuildPermit>,

    #[account(
        has_one = item_class,
        seeds = [Recipe::PREFIX.as_bytes(), &recipe.recipe_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub recipe: Account<'info, Recipe>,

    #[account(
        has_one = authority,
        seeds = [ItemClass::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateBuildPermitArgs {
    pub builder: Pubkey,
    pub remaining_builds: u16,
}

pub fn handler(ctx: Context<CreateBuildPermit>, args: CreateBuildPermitArgs) -> Result<()> {
    ctx.accounts.build_permit.set_inner(BuildPermit {
        recipe: ctx.accounts.recipe.key(),
        builder: args.builder,
        remaining_builds: args.remaining_builds,
    });

    Ok(())
}
