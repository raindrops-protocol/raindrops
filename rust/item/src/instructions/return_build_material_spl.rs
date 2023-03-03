use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Build, ItemClassV1, ItemV1},
    errors::ErrorCode,
    BuildStatus,
};

#[derive(Accounts)]
pub struct ReturnBuildMaterialSpl<'info> {
    #[account(mut,
        has_one = item_mint,
        seeds = [ItemV1::PREFIX.as_bytes(), item.item_class.key().as_ref(), item_mint.key().as_ref()], bump)]
    pub item: Account<'info, ItemV1>,

    pub item_mint: Box<Account<'info, token::Mint>>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = build)]
    pub item_source: Box<Account<'info, token::TokenAccount>>,

    #[account(init_if_needed, payer = payer, associated_token::mint = item_mint, associated_token::authority = builder)]
    pub item_destination: Box<Account<'info, token::TokenAccount>>,

    #[account(
        has_one = builder,
        mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    /// CHECK: build pda checks this account
    pub builder: UncheckedAccount<'info>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

pub fn handler(ctx: Context<ReturnBuildMaterialSpl>) -> Result<()> {
    // check build status
    match ctx.accounts.build.status {
        BuildStatus::InProgress => {
            // if the build is still in progress allow the builder to withdraw
        }
        BuildStatus::ItemReceived => {
            // verify item is eligible to be returned to the builder
            // if the item has no durability left, the token must be burned
            require!(
                ctx.accounts.item.item_state.returnable(),
                ErrorCode::ItemNotReturnable
            );

            // check that the build effect is applied
            require!(
                ctx.accounts.build.build_effect_applied(
                    ctx.accounts.item_class.key(),
                    ctx.accounts.item_mint.key()
                ),
                ErrorCode::BuildEffectNotApplied
            );
        }
        _ => return Err(ErrorCode::ItemNotReturnable.into()),
    }

    // decrement the amount in the build pda so we know its been returned
    ctx.accounts.build.decrement_build_amount(
        ctx.accounts.item.item_class.key(),
        ctx.accounts.item_source.amount,
    );

    // transfer tokens back to builder
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.item_source.to_account_info(),
        to: ctx.accounts.item_destination.to_account_info(),
        authority: ctx.accounts.build.to_account_info(),
    };

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            &[&[
                Build::PREFIX.as_bytes(),
                ctx.accounts.build.item_class.key().as_ref(),
                ctx.accounts.builder.key().as_ref(),
                &[*ctx.bumps.get("build").unwrap()],
            ]],
        ),
        ctx.accounts.item_source.amount,
    )?;

    let close_accounts = token::CloseAccount {
        account: ctx.accounts.item_source.to_account_info(),
        destination: ctx.accounts.builder.to_account_info(),
        authority: ctx.accounts.build.to_account_info(),
    };

    // close the account after transferring the tokens

    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        close_accounts,
        &[&[
            Build::PREFIX.as_bytes(),
            ctx.accounts.build.item_class.as_ref(),
            ctx.accounts.builder.key().as_ref(),
            &[*ctx.bumps.get("build").unwrap()],
        ]],
    ))
}
