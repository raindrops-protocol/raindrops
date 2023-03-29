use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, sysvar::instructions::ID as InstructionsID},
};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};

use crate::state::{
    accounts::{Build, ItemClassV1, ItemV1},
    errors::ErrorCode,
    AuthRulesProgram, BuildStatus, TokenMetadataProgram,
};

#[derive(Accounts)]
pub struct ConsumeIngredientPNft<'info> {
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

    /// CHECK: Done by token metadata
    pub auth_rules: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = item_mint, associated_token::authority = build)]
    pub item_source: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_source_token_record: UncheckedAccount<'info>,

    #[account(init_if_needed, payer = payer, associated_token::mint = item_mint, associated_token::authority = output_item_class_authority)]
    pub item_destination: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub item_destination_token_record: UncheckedAccount<'info>,

    #[account(
        mut, seeds = [Build::PREFIX.as_bytes(), output_item_class.key().as_ref(), build.builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(
        constraint = output_item_class.authority.eq(&output_item_class_authority.key()),
        seeds = [ItemClassV1::PREFIX.as_bytes(), output_item_class.items.key().as_ref()], bump)]
    pub output_item_class: Account<'info, ItemClassV1>,

    /// CHECK: output_item_class constraint
    pub output_item_class_authority: UncheckedAccount<'info>,

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

pub fn handler(ctx: Context<ConsumeIngredientPNft>) -> Result<()> {
    // check build status
    match ctx.accounts.build.status {
        BuildStatus::ItemReceived => {
            // check that the build effect is applied
            require!(
                ctx.accounts.build.build_effect_applied(
                    ctx.accounts.item.item_class.key(),
                    ctx.accounts.item_mint.key()
                ),
                ErrorCode::BuildEffectNotApplied
            );

            // the durability must be 0 to be consumed,
            // its the responsibility of the schema to decrement the durability via apply_build_effect
            require!(
                ctx.accounts.item.item_state.broken(),
                ErrorCode::ItemNotConsumable
            );

            // decrement the amount in the build pda so we know its been burned
            ctx.accounts.build.decrement_build_amount(
                ctx.accounts.item.item_class.key(),
                ctx.accounts.item_source.amount,
            );
        }
        _ => return Err(ErrorCode::ItemNotConsumable.into()),
    }

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
        destination_owner: ctx.accounts.output_item_class_authority.key(),
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
        authorization_rules_program: Some(ctx.accounts.auth_rules_program.key()),
        authorization_rules: Some(ctx.accounts.auth_rules.key()),
        args: transfer_args,
    };

    let transfer_accounts = [
        ctx.accounts.item_source.to_account_info(),
        ctx.accounts.build.to_account_info(),
        ctx.accounts.item_destination.to_account_info(),
        ctx.accounts.output_item_class_authority.to_account_info(),
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
        ctx.accounts.auth_rules_program.to_account_info(),
        ctx.accounts.auth_rules.to_account_info(),
    ];

    invoke_signed(
        &transfer_ix.instruction(),
        &transfer_accounts,
        &[&[
            Build::PREFIX.as_bytes(),
            ctx.accounts.build.item_class.key().as_ref(),
            ctx.accounts.build.builder.as_ref(),
            &[*ctx.bumps.get("build").unwrap()],
        ]],
    )?;

    Ok(())
}
