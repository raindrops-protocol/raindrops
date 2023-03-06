use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};

use crate::state::{
    accounts::{Build, ItemClassV1},
    errors::ErrorCode,
    BuildMaterialMint, NoopProgram,
};

#[derive(Accounts)]
pub struct VerifyBuildMaterial<'info> {
    pub material_mint: Box<Account<'info, token::Mint>>,

    #[account(
        seeds = [ItemClassV1::PREFIX.as_bytes(), material_item_class_items.key().as_ref()], bump)]
    pub material_item_class: Box<Account<'info, ItemClassV1>>,

    /// CHECK: checked by spl-account-compression
    pub material_item_class_items: UncheckedAccount<'info>,

    #[account(mut, seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub log_wrapper: Program<'info, NoopProgram>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyBuildMaterialArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, VerifyBuildMaterial<'info>>,
    args: VerifyBuildMaterialArgs,
) -> Result<()> {
    // verify mint exists in the items tree
    let verify_item_accounts = VerifyLeaf {
        merkle_tree: ctx.accounts.material_item_class_items.to_account_info(),
    };

    verify_leaf(
        CpiContext::new(
            ctx.accounts.account_compression.to_account_info(),
            verify_item_accounts,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        args.root,
        ctx.accounts
            .material_mint
            .key()
            .as_ref()
            .try_into()
            .unwrap(),
        args.leaf_index,
    )?;

    // set the verified mint in the build data
    let build = &mut ctx.accounts.build;
    let mut verified = false;
    for build_material_data in build.materials.iter_mut() {
        if build_material_data
            .item_class
            .eq(&ctx.accounts.material_item_class.key())
        {
            // error if builder already escrowed enough of this material
            require!(
                build_material_data.current_amount < build_material_data.required_amount,
                ErrorCode::IncorrectMaterial
            );

            let material_mint = ctx.accounts.material_mint.key();

            // check this mint wasn't already verified
            let already_verified = build_material_data
                .mints
                .iter()
                .any(|mint_data| mint_data.mint.eq(&material_mint));
            require!(!already_verified, ErrorCode::IncorrectMaterial);

            // add the mint to the list of build materials
            build_material_data.mints.push(BuildMaterialMint {
                build_effect_applied: false,
                mint: ctx.accounts.material_mint.key(),
            });

            verified = true;

            break;
        }
    }
    require!(verified, ErrorCode::IncorrectMaterial);

    Ok(())
}
