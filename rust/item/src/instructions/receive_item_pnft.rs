use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, sysvar::instructions::ID as InstructionsID},
};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};

use crate::state::{
    accounts::{Build, ItemClassV1},
    errors::ErrorCode,
    AuthRulesProgram, BuildStatus, TokenMetadataProgram,
};

#[derive(Accounts)]
pub struct ReceiveItemPNft<'info> {
    pub item_mint: Account<'info, token::Mint>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_metadata: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_edition: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    pub auth_rules: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = item_class)]
    pub item_source: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_source_token_record: UncheckedAccount<'info>,

    #[account(init_if_needed, payer = payer, associated_token::mint = item_mint, associated_token::authority = builder)]
    pub item_destination: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_destination_token_record: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = builder,
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    pub builder: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: checked with constraint
    #[account(address = InstructionsID)]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub token_metadata: Program<'info, TokenMetadataProgram>,

    pub auth_rules_program: Program<'info, AuthRulesProgram>,
}

pub fn handler(ctx: Context<ReceiveItemPNft>) -> Result<()> {
    // check that the build is complete
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::Complete),
        ErrorCode::InvalidBuildStatus
    );

    // get output amount for item mint
    let amount = ctx
        .accounts
        .build
        .output
        .find_output_amount(&ctx.accounts.item_mint.key());

    // set build output to received
    ctx.accounts
        .build
        .output
        .set_output_as_received(&ctx.accounts.item_mint.key());

    // if all outputs have been dispensed, set build to final state
    if ctx.accounts.build.output.all_outputs_sent() {
        ctx.accounts.build.status = BuildStatus::ItemReceived;
    }

    // transfer the pNFT to the builder
    // transfer item_mint to destination
    let transfer_args = TransferArgs::V1 {
        amount, // this should always be 1 for a pNFT
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
        payer: ctx.accounts.payer.key(),
        system_program: ctx.accounts.system_program.key(),
        sysvar_instructions: ctx.accounts.instructions.key(),
        spl_token_program: ctx.accounts.token_program.key(),
        spl_ata_program: ctx.accounts.associated_token_program.key(),
        authorization_rules_program: Some(ctx.accounts.auth_rules_program.key()),
        authorization_rules: Some(ctx.accounts.auth_rules.key()),
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
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.associated_token_program.to_account_info(),
        ctx.accounts.auth_rules_program.to_account_info(),
        ctx.accounts.auth_rules.to_account_info(),
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

    // reload account data to check token account amount
    ctx.accounts.item_source.reload()?;

    // close token account if amount is 0
    if ctx.accounts.item_source.amount == 0 {
        // close item class ata
        let close_ata_accounts = token::CloseAccount {
            account: ctx.accounts.item_source.to_account_info(),
            destination: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.item_class.to_account_info(),
        };

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_ata_accounts,
            &[&[
                ItemClassV1::PREFIX.as_bytes(),
                ctx.accounts.item_class.items.as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ))?;
    }

    Ok(())
}
