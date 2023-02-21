use anchor_lang::{prelude::*, solana_program::program::invoke_signed};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};

use crate::state::{errors::ErrorCode, Build, ItemClassV1, Schema, TokenMetadataProgram};

#[derive(Accounts)]
pub struct ReceiveItem<'info> {
    pub item_mint: Account<'info, token::Mint>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_metadata: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_edition: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = item_class)]
    pub item_source: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_source_token_record: UncheckedAccount<'info>,

    #[account(init_if_needed, payer = builder, associated_token::mint = item_mint, associated_token::authority = builder)]
    pub item_destination: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_destination_token_record: UncheckedAccount<'info>,

    #[account(
        constraint = item_mint.key().eq(&build.output_mint.unwrap()),
        mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: checked with constraint
    #[account()]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub token_metadata: Program<'info, TokenMetadataProgram>,
}

pub fn handler(ctx: Context<ReceiveItem>) -> Result<()> {
    // check that the build is complete
    // TODO: convert these bools into a build stages enum
    require!(
        ctx.accounts.build.complete && !ctx.accounts.build.item_distributed,
        ErrorCode::BuildIncomplete
    );

    let build = &mut ctx.accounts.build;
    build.item_distributed = true;

    // transfer the pNFT to the builder
    // transfer item_mint to destination
    let transfer_args = TransferArgs::V1 {
        amount: 1,
        authorization_data: None,
    };

    let transfer_ix = Transfer {
        token: ctx.accounts.item_source.key(),
        token_owner: ctx.accounts.item_class.key(),
        destination: ctx.accounts.item_destination.key(),
        destination_owner: ctx.accounts.builder.key(),
        mint: ctx.accounts.item_mint.key(),
        metadata: ctx.accounts.item_metadata.key(),
        edition: Some(ctx.accounts.item_edition.key()),
        owner_token_record: Some(ctx.accounts.item_source_token_record.key()),
        destination_token_record: Some(ctx.accounts.item_destination_token_record.key()),
        authority: ctx.accounts.item_class.key(),
        payer: ctx.accounts.builder.key(),
        system_program: ctx.accounts.system_program.key(),
        sysvar_instructions: ctx.accounts.instructions.key(),
        spl_token_program: ctx.accounts.token_program.key(),
        spl_ata_program: ctx.accounts.associated_token_program.key(),
        authorization_rules_program: None,
        authorization_rules: None,
        args: transfer_args,
    };

    let transfer_accounts = [
        ctx.accounts.item_source.to_account_info(),
        ctx.accounts.item_class.to_account_info(),
        ctx.accounts.item_destination.to_account_info(),
        ctx.accounts.builder.to_account_info(),
        ctx.accounts.item_mint.to_account_info(),
        ctx.accounts.item_metadata.to_account_info(),
        ctx.accounts.item_edition.to_account_info(),
        ctx.accounts.item_source_token_record.to_account_info(),
        ctx.accounts.item_destination_token_record.to_account_info(),
        ctx.accounts.item_class.to_account_info(),
        ctx.accounts.builder.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.associated_token_program.to_account_info(),
    ];

    invoke_signed(
        &transfer_ix.instruction(),
        &transfer_accounts,
        &[&[
            ItemClassV1::PREFIX.as_bytes(),
            ctx.accounts.item_class.items.as_ref(),
            &[*ctx.bumps.get("item_class").unwrap()],
        ]],
    )?;

    Ok(())
}
