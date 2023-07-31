use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, sysvar::instructions::ID as InstructionsID},
};
use anchor_spl::token;
use mpl_token_metadata::instruction::{builders::Burn, BurnArgs, InstructionBuilder};

use crate::state::{
    accounts::{Build, Item},
    errors::ErrorCode,
    BuildStatus, TokenMetadataProgram,
};

#[derive(Accounts)]
pub struct DestroyIngredientPNft<'info> {
    #[account(mut,
        has_one = item_mint,
        seeds = [Item::PREFIX.as_bytes(), item_mint.key().as_ref()], bump)]
    pub item: Account<'info, Item>,

    #[account(mut)]
    pub item_mint: Box<Account<'info, token::Mint>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_metadata: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_edition: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = build)]
    pub item_ata: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_token_record: UncheckedAccount<'info>,

    #[account(
        mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: checked with constraint
    #[account(address = InstructionsID)]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub token_metadata: Program<'info, TokenMetadataProgram>,
}

pub fn handler(ctx: Context<DestroyIngredientPNft>) -> Result<()> {
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
                    ctx.accounts.item_ata.amount,
                )
                .unwrap();
        }
        _ => return Err(ErrorCode::ItemIneligibleForDestruction.into()),
    }

    let burn_ix = Burn {
        authority: ctx.accounts.build.key(),
        collection_metadata: Some(ctx.accounts.collection_metadata.key()),
        metadata: ctx.accounts.item_metadata.key(),
        edition: Some(ctx.accounts.item_edition.key()),
        mint: ctx.accounts.item_mint.key(),
        token: ctx.accounts.item_ata.key(),
        master_edition: None,
        master_edition_mint: None,
        master_edition_token: None,
        edition_marker: None,
        token_record: Some(ctx.accounts.item_token_record.key()),
        system_program: ctx.accounts.system_program.key(),
        sysvar_instructions: ctx.accounts.instructions.key(),
        spl_token_program: ctx.accounts.token_program.key(),
        args: BurnArgs::V1 { amount: 1 },
    };

    let burn_accounts = [
        ctx.accounts.build.to_account_info(),
        ctx.accounts.collection_metadata.to_account_info(),
        ctx.accounts.item_metadata.to_account_info(),
        ctx.accounts.item_edition.to_account_info(),
        ctx.accounts.item_mint.to_account_info(),
        ctx.accounts.item_ata.to_account_info(),
        ctx.accounts.item_edition.to_account_info(),
        ctx.accounts.item_token_record.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ];

    invoke_signed(
        &burn_ix.instruction(),
        &burn_accounts,
        &[&[
            Build::PREFIX.as_bytes(),
            ctx.accounts.build.item_class.key().as_ref(),
            ctx.accounts.build.builder.key().as_ref(),
            &[*ctx.bumps.get("build").unwrap()],
        ]],
    )?;

    // close item pda
    ctx.accounts
        .item
        .close(ctx.accounts.payer.to_account_info())
}
