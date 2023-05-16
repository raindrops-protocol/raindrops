use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::accounts::{AvatarClass, TraitConflicts};

#[derive(Accounts)]
#[instruction(args: AddTraitConflictsArgs)]
pub struct AddTraitConflicts<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Account<'info, token::TokenAccount>,

    #[account(mut,
        has_one = avatar_class,
        seeds = [TraitConflicts::PREFIX.as_bytes(), avatar_class.key().as_ref(), trait_conflicts.trait_account.key().as_ref()], bump)]
    pub trait_conflicts: Account<'info, TraitConflicts>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddTraitConflictsArgs {
    pub trait_ids: Vec<u16>,
    pub attribute_ids: Vec<u16>,
}

pub fn handler(ctx: Context<AddTraitConflicts>, args: AddTraitConflictsArgs) -> Result<()> {
    let trait_conflicts = ctx.accounts.trait_conflicts.to_account_info();
    ctx.accounts.trait_conflicts.add_conflicts(
        &args.attribute_ids,
        &args.trait_ids,
        &trait_conflicts,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    );

    Ok(())
}
