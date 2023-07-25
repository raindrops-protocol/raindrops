use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::accounts::{BuildPermit, ItemClass};

#[derive(Accounts)]
#[instruction(args: CreateBuildPermitArgs)]
pub struct CreateBuildPermit<'info> {
    // init_if_needed here so you can overwrite an already created build permit with new data
    #[account(init_if_needed,
        payer = authority,
        space = BuildPermit::SPACE,
        seeds = [BuildPermit::PREFIX.as_bytes(), builder.key().as_ref(), item_class.key().as_ref()], bump)]
    pub build_permit: Account<'info, BuildPermit>,

    pub builder: SystemAccount<'info>,

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
    pub remaining_builds: u16,
}

pub fn handler(ctx: Context<CreateBuildPermit>, args: CreateBuildPermitArgs) -> Result<()> {
    ctx.accounts.build_permit.set_inner(BuildPermit {
        item_class: ctx.accounts.item_class.key(),
        builder: ctx.accounts.builder.key(),
        remaining_builds: args.remaining_builds,
    });

    Ok(())
}
