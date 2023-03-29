use anchor_lang::prelude::*;

use crate::state::{accounts::Build, errors::ErrorCode};

#[derive(Accounts)]
pub struct CloseBuild<'info> {
    #[account(mut,
        has_one = builder,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    /// CHECK: by build account constraint
    #[account(mut)]
    pub builder: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseBuild>) -> Result<()> {
    // check build is empty
    for build_ingredient_data in &ctx.accounts.build.ingredients {
        require!(
            build_ingredient_data.current_amount == 0,
            ErrorCode::BuildNotEmpty
        );
    }

    // close the account
    ctx.accounts
        .build
        .close(ctx.accounts.builder.to_account_info())
}
