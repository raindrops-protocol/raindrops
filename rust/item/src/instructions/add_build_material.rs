use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, sysvar::instructions::ID as InstructionsID},
};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};

use crate::state::{
    accounts::{Build, ItemClassV1, Schema},
    errors::ErrorCode,
    BuildStatus, TokenMetadataProgram,
};

#[derive(Accounts)]
pub struct AddBuildMaterial<'info> {
    pub material_mint: Box<Account<'info, token::Mint>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub material_metadata: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub material_edition: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = material_mint, associated_token::authority = builder)]
    pub material_source: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub material_source_token_record: UncheckedAccount<'info>,

    #[account(init_if_needed, payer = builder, associated_token::mint = material_mint, associated_token::authority = build)]
    pub material_destination: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub material_destination_token_record: UncheckedAccount<'info>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: manually checked with constraint
    #[account(address = InstructionsID)]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub token_metadata: Program<'info, TokenMetadataProgram>,
}

pub fn handler(ctx: Context<AddBuildMaterial>) -> Result<()> {
    let build = &mut ctx.accounts.build;

    // check that the build is in progress
    require!(
        build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // update build pda with material data
    let mut material_added = false;
    for material in build.materials.iter_mut() {
        if material
            .item_mint
            .unwrap()
            .eq(&ctx.accounts.material_mint.key())
        {
            // TODO: fail if added amount is > required amount
            material.amount += 1;

            material_added = true;

            break;
        }
    }
    require!(material_added, ErrorCode::IncorrectMaterial);

    // transfer material_mint to destination
    let transfer_args = TransferArgs::V1 {
        amount: 1,
        authorization_data: None,
    };

    let transfer_ix = Transfer {
        token: ctx.accounts.material_source.key(),
        token_owner: ctx.accounts.builder.key(),
        destination: ctx.accounts.material_destination.key(),
        destination_owner: ctx.accounts.build.key(),
        mint: ctx.accounts.material_mint.key(),
        metadata: ctx.accounts.material_metadata.key(),
        edition: Some(ctx.accounts.material_edition.key()),
        owner_token_record: Some(ctx.accounts.material_source_token_record.key()),
        destination_token_record: Some(ctx.accounts.material_destination_token_record.key()),
        authority: ctx.accounts.builder.key(),
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
        ctx.accounts.material_source.to_account_info(),
        ctx.accounts.builder.to_account_info(),
        ctx.accounts.material_destination.to_account_info(),
        ctx.accounts.build.to_account_info(),
        ctx.accounts.material_mint.to_account_info(),
        ctx.accounts.material_metadata.to_account_info(),
        ctx.accounts.material_edition.to_account_info(),
        ctx.accounts.material_source_token_record.to_account_info(),
        ctx.accounts
            .material_destination_token_record
            .to_account_info(),
        ctx.accounts.build.to_account_info(),
        ctx.accounts.builder.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.associated_token_program.to_account_info(),
    ];

    invoke(&transfer_ix.instruction(), &transfer_accounts)?;

    Ok(())
}
