use anchor_lang::prelude::*;
use spl_account_compression::{
    cpi::{accounts::Initialize, init_empty_merkle_tree},
    program::SplAccountCompression,
};

use crate::state::{ItemClassV1, Material, NoopProgram, Schema};

#[derive(Accounts)]
#[instruction(args: CreateItemClassV1Args)]
pub struct CreateItemClassV1<'info> {
    /// CHECK: initialized by spl-account-compression program
    #[account(zero)]
    pub items: UncheckedAccount<'info>,

    #[account(init,
        payer = authority, space = ItemClassV1::SPACE,
        seeds = [ItemClassV1::PREFIX.as_bytes(), items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(init,
        payer = authority,
        space = Schema::space(args.schema_args.materials.len()),
        seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub account_compression_program: Program<'info, SplAccountCompression>,

    pub log_wrapper_program: Program<'info, NoopProgram>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateItemClassV1Args {
    pub schema_args: SchemaArgs,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SchemaArgs {
    pub build_enabled: bool,
    pub auto_activate: bool,
    pub materials: Vec<Material>,
}

pub fn handler(ctx: Context<CreateItemClassV1>, args: CreateItemClassV1Args) -> Result<()> {
    // init schema
    ctx.accounts.schema.set_inner(Schema {
        item_class: ctx.accounts.item_class.key(),
        build_enabled: args.schema_args.build_enabled,
        auto_activate: args.schema_args.auto_activate,
        materials: args.schema_args.materials,
    });

    // init item class
    ctx.accounts.item_class.set_inner(ItemClassV1 {
        items: ctx.accounts.items.key(),
    });

    let init_empty_merkle_tree_accounts = Initialize {
        merkle_tree: ctx.accounts.items.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
        noop: ctx.accounts.log_wrapper_program.to_account_info(),
    };

    // initialize merkle tree
    // TODO: init with data instead
    init_empty_merkle_tree(
        CpiContext::new_with_signer(
            ctx.accounts.account_compression_program.to_account_info(),
            init_empty_merkle_tree_accounts,
            &[&[
                ItemClassV1::PREFIX.as_bytes(),
                ctx.accounts.items.key().as_ref(),
                &[*ctx.bumps.get("item_class").unwrap()],
            ]],
        ),
        14,
        64,
    )
}
