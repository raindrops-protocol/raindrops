use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, sysvar::instructions::ID as InstructionsID},
};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};

use crate::state::{
    accounts::{Build, ItemClassV1, ItemV1},
    errors::ErrorCode,
    BuildStatus, TokenMetadataProgram,
};

#[derive(Accounts)]
pub struct ReturnBuildMaterial<'info> {
    #[account(mut,
        has_one = item_mint,
        seeds = [ItemV1::PREFIX.as_bytes(), item.item_class.key().as_ref(), item_mint.key().as_ref()], bump)]
    pub item: Account<'info, ItemV1>,

    pub item_mint: Box<Account<'info, token::Mint>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_metadata: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_edition: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = build)]
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
        has_one = builder,
        mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    /// CHECK: build pda checks this account
    pub builder: UncheckedAccount<'info>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

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
}

pub fn handler(ctx: Context<ReturnBuildMaterial>) -> Result<()> {
    // check that the build item has been retrieved by the builder
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::ItemReceived),
        ErrorCode::InvalidBuildStatus
    );

    // check that the build effect has been applied before returning item
    for build_material_data in &ctx.accounts.build.materials {
        // get corresponding item class
        if build_material_data
            .item_class
            .eq(&ctx.accounts.item_class.key())
        {
            // find the specific mint within the item class and verify the build effect has been applied
            for mint_data in &build_material_data.mints {
                if mint_data.mint.eq(&ctx.accounts.item_mint.key()) {
                    require!(
                        mint_data.build_effect_applied,
                        ErrorCode::BuildEffectNotApplied
                    );
                }
            }
        }
    }

    // verify item is eligible to be returned to the builder
    // if the item has no durability left, the token must be burned
    require!(
        ctx.accounts.item.item_state.durability > 0,
        ErrorCode::ItemNotReturnable
    );

    // transfer the pNFT to the builder
    // transfer item_mint to destination
    let transfer_args = TransferArgs::V1 {
        amount: 1,
        authorization_data: None,
    };

    let transfer_ix = Transfer {
        token: ctx.accounts.item_source.key(),
        token_owner: ctx.accounts.build.key(),
        destination: ctx.accounts.item_destination.key(),
        destination_owner: ctx.accounts.builder.key(),
        mint: ctx.accounts.item_mint.key(),
        metadata: ctx.accounts.item_metadata.key(),
        edition: Some(ctx.accounts.item_edition.key()),
        owner_token_record: Some(ctx.accounts.item_source_token_record.key()),
        destination_token_record: Some(ctx.accounts.item_destination_token_record.key()),
        authority: ctx.accounts.build.key(),
        payer: ctx.accounts.payer.key(),
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
        ctx.accounts.build.to_account_info(),
        ctx.accounts.item_destination.to_account_info(),
        ctx.accounts.builder.to_account_info(),
        ctx.accounts.item_mint.to_account_info(),
        ctx.accounts.item_metadata.to_account_info(),
        ctx.accounts.item_edition.to_account_info(),
        ctx.accounts.item_source_token_record.to_account_info(),
        ctx.accounts.item_destination_token_record.to_account_info(),
        ctx.accounts.build.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.associated_token_program.to_account_info(),
    ];

    invoke_signed(
        &transfer_ix.instruction(),
        &transfer_accounts,
        &[&[
            Build::PREFIX.as_bytes(),
            ctx.accounts.item_class.key().as_ref(),
            ctx.accounts.builder.key().as_ref(),
            &[*ctx.bumps.get("build").unwrap()],
        ]],
    )?;

    Ok(())
}
