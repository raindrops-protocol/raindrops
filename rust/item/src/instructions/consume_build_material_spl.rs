use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::state::{
    accounts::{Build, ItemClassV1, ItemV1},
    errors::ErrorCode,
    BuildStatus,
};

#[derive(Accounts)]
pub struct ConsumeBuildMaterialSpl<'info> {
    #[account(
        has_one = item_mint,
        seeds = [ItemV1::PREFIX.as_bytes(), item.item_class.key().as_ref(), item_mint.key().as_ref()], bump)]
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
    pub builder: UncheckedAccount<'info>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, token::Token>,
}

pub fn handler(ctx: Context<ConsumeBuildMaterialSpl>) -> Result<()> {
    // check that the build item has been received by the builder
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::ItemReceived),
        ErrorCode::InvalidBuildStatus
    );

    // check that the build effect has been applied before consuming item
    let mut checked = false;
    for build_material_data in &ctx.accounts.build.materials {
        // get corresponding item class
        if build_material_data
            .item_class
            .eq(&ctx.accounts.item_class.key())
        {
            // find the specific mint within the item class and verify the build effect has been applied
            for mint_data in &build_material_data.mints {
                if mint_data.mint.eq(&ctx.accounts.item_mint.key()) {
                    checked = true;
                    require!(
                        mint_data.build_effect_applied,
                        ErrorCode::BuildEffectNotApplied
                    );
                }
            }
        }
    }
    require!(checked, ErrorCode::IncorrectMaterial);

    // the durability must be 0 to be consumed, its the responsibility of the schema to decrement the durability via apply_build_effec
    require!(
        ctx.accounts.item.item_state.durability <= 0,
        ErrorCode::ItemNotConsumable
    );

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
    )
}
