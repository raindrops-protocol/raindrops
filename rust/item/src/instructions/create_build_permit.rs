use anchor_lang::prelude::*;

use crate::state::accounts::{BuildPermit, ItemClassV1};

#[derive(Accounts)]
#[instruction(args: CreateBuildPermitArgs)]
pub struct CreateBuildPermit<'info> {
    // init_if_needed here so you can overwrite an already created build permit with new data
    #[account(init_if_needed,
        payer = authority,
        space = BuildPermit::SPACE,
        seeds = [BuildPermit::PREFIX.as_bytes(), args.wallet.key().as_ref(), item_class.key().as_ref()], bump)]
    pub build_permit: Account<'info, BuildPermit>,

    #[account(mut,
        has_one = authority,
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateBuildPermitArgs {
    pub wallet: Pubkey,
    pub remaining_builds: u16,
}

pub fn handler(ctx: Context<CreateBuildPermit>, args: CreateBuildPermitArgs) -> Result<()> {
    ctx.accounts.build_permit.set_inner(BuildPermit {
        item_class: ctx.accounts.item_class.key(),
        wallet: args.wallet,
        remaining_builds: args.remaining_builds,
    });

    Ok(())
}
