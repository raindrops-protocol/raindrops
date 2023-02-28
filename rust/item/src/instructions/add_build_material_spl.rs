use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Build, ItemClassV1, ItemV1},
    errors::ErrorCode,
    BuildStatus, ItemState,
};

#[derive(Accounts)]
pub struct AddBuildMaterialSpl<'info> {
    pub material_mint: Box<Account<'info, token::Mint>>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), material_item_class.items.key().as_ref()], bump)]
    pub material_item_class: Account<'info, ItemClassV1>,

    #[account(mut, associated_token::mint = material_mint, associated_token::authority = builder)]
    pub material_source: Box<Account<'info, token::TokenAccount>>,

    #[account(init_if_needed, payer = builder, associated_token::mint = material_mint, associated_token::authority = build)]
    pub material_destination: Box<Account<'info, token::TokenAccount>>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(init_if_needed, payer = builder, space = ItemV1::SPACE, seeds = [ItemV1::PREFIX.as_bytes(), material_item_class.key().as_ref(), material_mint.key().as_ref()], bump)]
    pub item: Account<'info, ItemV1>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddBuildMaterialSplArgs {
    pub amount: u64,
}

pub fn handler(ctx: Context<AddBuildMaterialSpl>, args: AddBuildMaterialSplArgs) -> Result<()> {
    let build = &mut ctx.accounts.build;

    // check that the build is in progress
    require!(
        build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // verify material_mint
    for build_material_data in &ctx.accounts.build.materials {
        // find the corresponding item class
        if ctx
            .accounts
            .material_item_class
            .key()
            .eq(&build_material_data.item_class.key())
        {
            // check the material mint exists in the list of verified mints
            let verified = build_material_data
                .mints
                .iter()
                .any(|mint_data| mint_data.mint.eq(&ctx.accounts.material_mint.key()));
            require!(verified, ErrorCode::IncorrectMaterial);
        }
    }

    // increment current_amount by transfer amount
    for build_material_data in ctx.accounts.build.materials.iter_mut() {
        // find the corresponding item class
        if ctx
            .accounts
            .material_item_class
            .key()
            .eq(&build_material_data.item_class.key())
        {
            build_material_data.current_amount += args.amount;
        }
    }

    // set the initial data if item pda has not been initialized until this instruction
    if !ctx.accounts.item.initialized {
        ctx.accounts.item.set_inner(ItemV1 {
            initialized: true,
            item_class: ctx.accounts.material_item_class.key(),
            item_mint: ctx.accounts.material_mint.key(),
            item_state: ItemState::default(),
        })
    }

    // transfer tokens to build pda
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.material_source.to_account_info(),
        to: ctx.accounts.material_destination.to_account_info(),
        authority: ctx.accounts.builder.to_account_info(),
    };

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        ),
        args.amount,
    )
}
