use anchor_lang::prelude::*;
use spl_account_compression::{
    cpi::{
        accounts::{Initialize, Modify, VerifyLeaf},
        append, init_empty_merkle_tree, verify_leaf,
    },
    program::SplAccountCompression,
    ConcurrentMerkleTree,
    zero_copy::ZeroCopy,
};

use crate::state::{ItemClassV1, Material, Schema, NoopProgram};

#[derive(Accounts)]
#[instruction(args: CreateItemClassV1Args)]
pub struct CreateItemClassV1<'info> {
    /// CHECK: Done by account compression
    #[account(zero)]
    pub members: UncheckedAccount<'info>,

    #[account(init,
        payer = authority, space = ItemClassV1::SPACE,
        seeds = [ItemClassV1::PREFIX.as_bytes(), members.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(init,
        payer = authority,
        space = Schema::space(args.schema_args.materials),
        seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub account_compression: Program<'info, SplAccountCompression>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateItemClassV1Args {
    pub schema_args: SchemaArgs,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SchemaArgs {
    pub auto_activate: bool,
    pub materials: Vec<Material>,
}

pub fn handler(ctx: Context<CreateItemClassV1>, args: CreateItemClassV1Args) -> Result<()> {
    // init schema
    ctx.accounts.schema.set_inner(Schema{
        item_class: ctx.accounts.item_class.key(),
        auto_activate: args.schema_args.auto_activate,
        materials: args.schema_args.materials,
    });

    // init item class
    ctx.accounts.item_class.set_inner(ItemClassV1{
        members: ctx.accounts.members.key(),
    });

    let init_empty_merkle_tree_accounts = Initialize {
        merkle_tree: ctx.accounts.members.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
        noop: ctx.accounts.log_wrapper.to_account_info(),
    };

    // initialize merkle tree account
    init_empty_merkle_tree(
        CpiContext::new_with_signer(
            ctx.accounts.account_compression.to_account_info(),
            init_empty_merkle_tree_accounts,
            &[&[
                ctx.accounts.members.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        14,
        64,
    )
}
