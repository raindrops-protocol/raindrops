use std::convert::TryInto;

use anchor_lang::{prelude::*, solana_program::{keccak::hashv, program::invoke}};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::instruction::{builders::Transfer, InstructionBuilder, TransferArgs};
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression, ConcurrentMerkleTree, zero_copy::ZeroCopy,
};

use crate::state::{errors::ErrorCode, Build, ItemClassV1, Schema, TokenMetadataProgram, NoopProgram};

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

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), material_item_class_items.key().as_ref()], bump)]
    pub material_item_class: Box<Account<'info, ItemClassV1>>,

    /// CHECK: checked by spl-account-compression
    pub material_item_class_items: UncheckedAccount<'info>,

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

    /// CHECK: checked with constraint
    #[account()]
    pub instructions: UncheckedAccount<'info>,

    pub noop: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub token_metadata: Program<'info, TokenMetadataProgram>,
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddBuildMaterialArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler(ctx: Context<AddBuildMaterial>, args: AddBuildMaterialArgs) -> Result<()> {
    let verify_item_accounts = VerifyLeaf {
        merkle_tree: ctx.accounts.material_item_class_items.to_account_info(),
    };

    //let node = hashv(&[]);

    //// parse merkle tree
    //let items_tree_data = &ctx.accounts.material_item_class_items.try_borrow_mut_data().unwrap();
    //let items_tree = ConcurrentMerkleTree::<14, 64>::load_bytes(items_tree_data)?;

    verify_leaf(
        CpiContext::new(
            ctx.accounts.account_compression.to_account_info(),
            verify_item_accounts,
        ).with_remaining_accounts(vec![]),
        args.root,
        ctx.accounts.material_mint.key().as_ref().try_into().unwrap(),
        args.leaf_index,
    )?;

    // update build pda with material data
    let build = &mut ctx.accounts.build;
    let mut material_added = false;
    for material in build.materials.iter_mut() {
        if material
            .item_class
            .eq(&ctx.accounts.material_item_class.key())
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

    // update build pda
    Ok(())
}
