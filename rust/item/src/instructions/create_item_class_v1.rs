use anchor_lang::prelude::*;
use spl_account_compression::{
    cpi::{accounts::Initialize, init_empty_merkle_tree},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{ItemClassV1, Schema},
    Material, MaterialArg, NoopProgram,
};

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
        space = Schema::space(args.schema_args.material_args.len()),
        seeds = [Schema::PREFIX.as_bytes(), &Schema::INITIAL_INDEX.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub account_compression: Program<'info, SplAccountCompression>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateItemClassV1Args {
    pub schema_args: SchemaArgs,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SchemaArgs {
    pub build_enabled: bool,
    pub material_args: Vec<MaterialArg>,
}

pub fn handler(ctx: Context<CreateItemClassV1>, args: CreateItemClassV1Args) -> Result<()> {
    // set schema materials
    let mut materials: Vec<Material> = Vec::with_capacity(args.schema_args.material_args.len());
    for material_arg in args.schema_args.material_args {
        materials.push(material_arg.into())
    }

    // init item class
    ctx.accounts.item_class.set_inner(ItemClassV1 {
        authority: ctx.accounts.authority.key(),
        items: ctx.accounts.items.key(),
        schema_index: Schema::INITIAL_INDEX,
    });

    // init schema
    ctx.accounts.schema.set_inner(Schema {
        schema_index: Schema::INITIAL_INDEX,
        item_class: ctx.accounts.item_class.key(),
        build_enabled: args.schema_args.build_enabled,
        materials: materials,
    });

    let init_empty_merkle_tree_accounts = Initialize {
        merkle_tree: ctx.accounts.items.to_account_info(),
        authority: ctx.accounts.item_class.to_account_info(),
        noop: ctx.accounts.log_wrapper.to_account_info(),
    };

    // initialize merkle tree
    init_empty_merkle_tree(
        CpiContext::new_with_signer(
            ctx.accounts.account_compression.to_account_info(),
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
