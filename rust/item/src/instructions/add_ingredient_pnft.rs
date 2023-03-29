use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, sysvar::instructions::ID as InstructionsID},
};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};

use crate::state::{
    accounts::{Build, ItemClassV1, ItemV1},
    errors::ErrorCode,
    AuthRulesProgram, BuildStatus, ItemState, TokenMetadataProgram,
};

#[derive(Accounts)]
pub struct AddIngredientPNft<'info> {
    pub ingredient_mint: Box<Account<'info, token::Mint>>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), ingredient_item_class.items.key().as_ref()], bump)]
    pub ingredient_item_class: Account<'info, ItemClassV1>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub ingredient_metadata: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub ingredient_edition: UncheckedAccount<'info>,

    /// CHECK: Done by token metadata
    pub auth_rules: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = ingredient_mint, associated_token::authority = builder)]
    pub ingredient_source: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub ingredient_source_token_record: UncheckedAccount<'info>,

    #[account(init_if_needed, payer = builder, associated_token::mint = ingredient_mint, associated_token::authority = build)]
    pub ingredient_destination: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: Done by token metadata
    #[account(mut)]
    pub ingredient_destination_token_record: UncheckedAccount<'info>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(init_if_needed, payer = builder, space = ItemV1::SPACE, seeds = [ItemV1::PREFIX.as_bytes(), ingredient_item_class.key().as_ref(), ingredient_mint.key().as_ref()], bump)]
    pub item: Account<'info, ItemV1>,

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

    pub auth_rules_program: Program<'info, AuthRulesProgram>,
}

pub fn handler(ctx: Context<AddIngredientPNft>) -> Result<()> {
    let build = &mut ctx.accounts.build;

    // check that the build is in progress
    require!(
        build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // verify ingredient_mint
    let verified = build.verify_build_mint(
        ctx.accounts.ingredient_item_class.key(),
        ctx.accounts.ingredient_mint.key(),
    );
    require!(verified, ErrorCode::IncorrectIngredient);

    // increment current_amount by transfer amount (1)
    build.increment_build_amount(ctx.accounts.ingredient_item_class.key(), 1);

    // set the initial data if item pda has not been initialized until this instruction
    if !ctx.accounts.item.initialized {
        ctx.accounts.item.set_inner(ItemV1 {
            initialized: true,
            item_class: ctx.accounts.ingredient_item_class.key(),
            item_mint: ctx.accounts.ingredient_mint.key(),
            item_state: ItemState::new(),
        })
    } else {
        // check that the item is not on cooldown
        if ctx.accounts.item.item_state.on_cooldown() {
            return Err(ErrorCode::ItemOnCooldown.into());
        }
    }

    // transfer ingredient_mint to destination
    let transfer_args = TransferArgs::V1 {
        amount: 1,
        authorization_data: None,
    };

    let transfer_ix = Transfer {
        token: ctx.accounts.ingredient_source.key(),
        token_owner: ctx.accounts.builder.key(),
        destination: ctx.accounts.ingredient_destination.key(),
        destination_owner: ctx.accounts.build.key(),
        mint: ctx.accounts.ingredient_mint.key(),
        metadata: ctx.accounts.ingredient_metadata.key(),
        edition: Some(ctx.accounts.ingredient_edition.key()),
        owner_token_record: Some(ctx.accounts.ingredient_source_token_record.key()),
        destination_token_record: Some(ctx.accounts.ingredient_destination_token_record.key()),
        authority: ctx.accounts.builder.key(),
        payer: ctx.accounts.builder.key(),
        system_program: ctx.accounts.system_program.key(),
        sysvar_instructions: ctx.accounts.instructions.key(),
        spl_token_program: ctx.accounts.token_program.key(),
        spl_ata_program: ctx.accounts.associated_token_program.key(),
        authorization_rules_program: Some(ctx.accounts.auth_rules_program.key()),
        authorization_rules: Some(ctx.accounts.auth_rules.key()),
        args: transfer_args,
    };

    let transfer_accounts = [
        ctx.accounts.ingredient_source.to_account_info(),
        ctx.accounts.builder.to_account_info(),
        ctx.accounts.ingredient_destination.to_account_info(),
        ctx.accounts.build.to_account_info(),
        ctx.accounts.ingredient_mint.to_account_info(),
        ctx.accounts.ingredient_metadata.to_account_info(),
        ctx.accounts.ingredient_edition.to_account_info(),
        ctx.accounts.ingredient_source_token_record.to_account_info(),
        ctx.accounts
            .ingredient_destination_token_record
            .to_account_info(),
        ctx.accounts.build.to_account_info(),
        ctx.accounts.builder.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.associated_token_program.to_account_info(),
        ctx.accounts.auth_rules_program.to_account_info(),
        ctx.accounts.auth_rules.to_account_info(),
    ];

    invoke(&transfer_ix.instruction(), &transfer_accounts)?;

    Ok(())
}
