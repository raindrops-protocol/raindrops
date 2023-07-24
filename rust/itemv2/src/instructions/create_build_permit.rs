use anchor_lang::prelude::*;
use anchor_spl::token;

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
        constraint = item_class.authority_mint.eq(&item_class_authority_mint.key()),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class_authority_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mint::authority = item_class)]
    pub item_class_authority_mint: Account<'info, token::Mint>,

    #[account(
        constraint = item_class_authority_mint_ata.amount >= 1,
        associated_token::mint = item_class_authority_mint, associated_token::authority = authority)]
    pub item_class_authority_mint_ata: Account<'info, token::TokenAccount>,

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
