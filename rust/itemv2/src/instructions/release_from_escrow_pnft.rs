use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, sysvar::instructions::ID as InstructionsID},
};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};

use crate::state::{accounts::ItemClass, AuthRulesProgram, TokenMetadataProgram};

#[derive(Accounts)]
pub struct ReleaseFromEscrowPNft<'info> {
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

    #[account(init_if_needed, payer = authority, associated_token::mint = item_mint, associated_token::authority = destination_authority)]
    pub item_destination: Box<Account<'info, token::TokenAccount>>,

    pub destination_authority: SystemAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_destination_token_record: UncheckedAccount<'info>,

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

    /// CHECK: checked with constraint
    #[account(address = InstructionsID)]
    pub instructions: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub token_metadata: Program<'info, TokenMetadataProgram>,

    pub auth_rules_program: Program<'info, AuthRulesProgram>,
}

pub fn handler(ctx: Context<ReleaseFromEscrowPNft>) -> Result<()> {
    // transfer item_mint to destination
    let transfer_args = TransferArgs::V1 {
        amount: 1, // this should always be 1 for a pNFT
        authorization_data: None,
    };

    let transfer_ix = Transfer {
        token: ctx.accounts.item_source.key(),
        token_owner: ctx.accounts.item_class.key(),
        destination: ctx.accounts.item_destination.key(),
        destination_owner: ctx.accounts.destination_authority.key(),
        mint: ctx.accounts.item_mint.key(),
        metadata: ctx.accounts.item_metadata.key(),
        edition: Some(ctx.accounts.item_edition.key()),
        owner_token_record: Some(ctx.accounts.item_source_token_record.key()),
        destination_token_record: Some(ctx.accounts.item_destination_token_record.key()),
        authority: ctx.accounts.item_class.key(),
        payer: ctx.accounts.authority.key(),
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
        ctx.accounts.destination_authority.to_account_info(),
        ctx.accounts.item_mint.to_account_info(),
        ctx.accounts.item_metadata.to_account_info(),
        ctx.accounts.item_edition.to_account_info(),
        ctx.accounts.item_source_token_record.to_account_info(),
        ctx.accounts.item_destination_token_record.to_account_info(),
        ctx.accounts.item_class.to_account_info(),
        ctx.accounts.authority.to_account_info(),
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
            ItemClass::PREFIX.as_bytes(),
            ctx.accounts.item_class_authority_mint.key().as_ref(),
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
            destination: ctx.accounts.authority.to_account_info(),
            authority: ctx.accounts.item_class.to_account_info(),
        };

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_ata_accounts,
            &[&[
                ItemClass::PREFIX.as_bytes(),
                ctx.accounts.item_class_authority_mint.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ))?;
    }

    Ok(())
}
