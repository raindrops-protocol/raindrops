use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};
use std::convert::TryInto;

use crate::state::{
    accounts::{Build, ItemClassV1, Schema},
    errors::ErrorCode,
    BuildStatus, NoopProgram,
};

#[derive(Accounts)]
pub struct CompleteBuild<'info> {
    pub item_mint: Box<Account<'info, token::Mint>>,

    #[account(seeds = [ItemClassV1::PREFIX.as_bytes(), item_class_items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    /// CHECK: checked by spl-account-compression
    pub item_class_items: UncheckedAccount<'info>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), schema.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteBuildArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CompleteBuild<'info>>,
    args: CompleteBuildArgs,
) -> Result<()> {
    // check the build is in progress before running completion steps
    require!(
        ctx.accounts.build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // check build meets schema requirements
    for required_material in &ctx.accounts.schema.materials {
        let mut found = false;
        for escrowed_material in &ctx.accounts.build.materials {
            if required_material
                .item_class
                .eq(&escrowed_material.item_class)
                && required_material.amount == escrowed_material.amount
            {
                found = true;
                break;
            }
        }
        require!(found, ErrorCode::MissingBuildMaterial);
    }

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

    // set the item mint that will be received

    // verify mint exists in the items tree
    let verify_item_accounts = VerifyLeaf {
        merkle_tree: ctx.accounts.item_class_items.to_account_info(),
    };

    verify_leaf(
        CpiContext::new(
            ctx.accounts.account_compression.to_account_info(),
            verify_item_accounts,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        args.root,
        ctx.accounts.item_mint.key().as_ref().try_into().unwrap(),
        args.leaf_index,
    )?;

    // set the item mint in the build pda
    // this represents the token that will be transferred to the builder
    let build = &mut ctx.accounts.build;
    build.item_mint = Some(ctx.accounts.item_mint.key());

    Ok(())
}
