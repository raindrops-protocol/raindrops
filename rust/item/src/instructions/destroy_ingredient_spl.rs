use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Build, ItemV1},
    errors::ErrorCode,
    BuildStatus,
};

#[derive(Accounts)]
pub struct DestroyIngredientSpl<'info> {
    #[account(mut,
        has_one = item_mint,
        seeds = [ItemV1::PREFIX.as_bytes(), item_mint.key().as_ref()], bump)]
    pub item: Account<'info, ItemV1>,

    #[account(mut)]
    pub item_mint: Account<'info, token::Mint>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = build)]
    pub item_source: Box<Account<'info, token::TokenAccount>>,

    #[account(mut,
        has_one = builder,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    /// CHECK: build pda checks this account
    #[account(mut)]
    pub builder: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, token::Token>,
}

pub fn handler(ctx: Context<DestroyIngredientSpl>) -> Result<()> {
    // check build status
    match ctx.accounts.build.status {
        BuildStatus::ItemReceived => {
            // check that the build effect is applied
            ctx.accounts
                .build
                .build_effect_applied(ctx.accounts.item_mint.key())
                .unwrap();

            // the durability must be 0 to be destroyed
            // its the responsibility of the schema to decrement the durability via apply_build_effect
            require!(
                ctx.accounts.item.item_state.broken(),
                ErrorCode::ItemIneligibleForDestruction
            );

            // decrement the amount in the build pda so we know its been burned
            ctx.accounts
                .build
                .decrement_build_amount(
                    ctx.accounts.item.item_mint.key(),
                    ctx.accounts.item_source.amount,
                )
                .unwrap();
        }
        _ => return Err(ErrorCode::ItemIneligibleForDestruction.into()),
    }

    // burn the tokens

    let burn_accounts = token::Burn {
        from: ctx.accounts.item_source.to_account_info(),
        mint: ctx.accounts.item_mint.to_account_info(),
        authority: ctx.accounts.build.to_account_info(),
    };

    token::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            burn_accounts,
            &[&[
                Build::PREFIX.as_bytes(),
                ctx.accounts.build.item_class.as_ref(),
                ctx.accounts.builder.key().as_ref(),
                &[*ctx.bumps.get("build").unwrap()],
            ]],
        ),
        ctx.accounts.item_source.amount,
    )?;

    // close the account after burning all the tokens

    let close_accounts = token::CloseAccount {
        account: ctx.accounts.item_source.to_account_info(),
        destination: ctx.accounts.payer.to_account_info(),
        authority: ctx.accounts.build.to_account_info(),
    };

    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        close_accounts,
        &[&[
            Build::PREFIX.as_bytes(),
            ctx.accounts.build.item_class.as_ref(),
            ctx.accounts.builder.key().as_ref(),
            &[*ctx.bumps.get("build").unwrap()],
        ]],
    ))?;

    // close item pda
    ctx.accounts.item.close(ctx.accounts.payer.to_account_info())
}
