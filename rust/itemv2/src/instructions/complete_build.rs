use anchor_lang::prelude::*;
use anchor_spl::{metadata, token};
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};
use std::convert::TryInto;

use crate::state::{
    accounts::{is_collection_member, Build, BuildPermit, ItemClass, Pack},
    errors::ErrorCode,
    is_signer, BuildStatus, ItemClassMode, NoopProgram, PackContents,
};

#[derive(Accounts)]
pub struct CompleteBuild<'info> {
    pub item_mint: Option<Account<'info, token::Mint>>,

    #[account(mut,
        seeds = [b"metadata", mpl_token_metadata::ID.as_ref(), item_mint.clone().unwrap().key().as_ref()],
        seeds::program = mpl_token_metadata::ID,
        bump
    )]
    pub item_mint_metadata: Option<Box<Account<'info, metadata::MetadataAccount>>>,

    #[account(
        seeds = [ItemClass::PREFIX.as_bytes(), item_class.authority_mint.as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    /// CHECK: checked by spl-account-compression
    #[account(constraint = item_class.mode.is_verify_account(&item_class_verify_account.key()) @ ErrorCode::InvalidVerifyAccount)]
    pub item_class_verify_account: Option<UncheckedAccount<'info>>,

    #[account(mut,
        has_one = item_class,
        seeds = [Pack::PREFIX.as_bytes(), item_class.key().as_ref(), &pack.id.to_le_bytes()], bump
    )]
    pub pack: Option<Account<'info, Pack>>,

    #[account(mut,
        has_one = item_class,
        constraint = build_permit.builder.eq(&build.builder.key()),
        seeds = [BuildPermit::PREFIX.as_bytes(), build.builder.key().as_ref(), item_class.key().as_ref()], bump)]
    pub build_permit: Option<Account<'info, BuildPermit>>,

    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, constraint = is_signer(&payer.key()))]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub log_wrapper: Option<Program<'info, NoopProgram>>,

    pub account_compression: Option<Program<'info, SplAccountCompression>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteBuildArgs {
    pub merkle_tree_args: Option<CompleteBuildMerkleTreeArgs>,
    pub pack_args: Option<CompleteBuildPackArgs>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteBuildMerkleTreeArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteBuildPackArgs {
    pub pack_contents: PackContents,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CompleteBuild<'info>>,
    args: CompleteBuildArgs,
) -> Result<()> {
    // check build requirements are met
    ctx.accounts.build.validate_build_criteria()?;

    let build_account = &ctx.accounts.build.to_account_info();

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

    // verify the output ingredients based on the item class mode
    match ctx.accounts.item_class.mode {
        ItemClassMode::MerkleTree { .. } => {
            let verify_merkle_tree_args = args.merkle_tree_args.unwrap();

            // verify mint exists in the items tree
            let verify_item_accounts = VerifyLeaf {
                merkle_tree: ctx
                    .accounts
                    .item_class_verify_account
                    .clone()
                    .unwrap()
                    .to_account_info(),
            };

            verify_leaf(
                CpiContext::new(
                    ctx.accounts.account_compression.clone().unwrap().to_account_info(),
                    verify_item_accounts,
                )
                .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
                verify_merkle_tree_args.root,
                ctx.accounts.item_mint.clone().unwrap().key().as_ref().try_into().unwrap(),
                verify_merkle_tree_args.leaf_index,
            )?;

            // add output item to build pda
            let build_account = &ctx.accounts.build.to_account_info();
            ctx.accounts.build.add_output_item(
                ctx.accounts.item_mint.clone().unwrap().key(),
                1,
                build_account,
                ctx.accounts.payer.clone(),
                ctx.accounts.system_program.clone(),
            )?;
        }
        ItemClassMode::Collection { collection_mint } => {
            is_collection_member(
                ctx.accounts
                    .item_mint_metadata
                    .clone()
                    .unwrap()
                    .into_inner(),
                &collection_mint,
            )?;

            // add output item to build pda
            let build_account = &ctx.accounts.build.to_account_info();
            ctx.accounts.build.add_output_item(
                ctx.accounts.item_mint.clone().unwrap().key(),
                1,
                build_account,
                ctx.accounts.payer.clone(),
                ctx.accounts.system_program.clone(),
            )?;
        }
        ItemClassMode::Pack { .. } => {
            let pack_args = args.pack_args.unwrap();

            // check that the pack_contents hash matches the one stored in the pack pda
            let args_hash = pack_args.pack_contents.hash_pack_contents();
            let pda_hash = &ctx.accounts.pack.clone().unwrap().contents_hash;
            require!(args_hash.eq(pda_hash), ErrorCode::InvalidPackContents);

            // set the output data for this build based on the chosen pack
            for entry in &pack_args.pack_contents.entries {
                build.add_output_item(
                    entry.mint,
                    entry.amount,
                    build_account,
                    ctx.accounts.payer.clone(),
                    ctx.accounts.system_program.clone(),
                )?;
            }
        }
        ItemClassMode::PresetOnly => {
            // nothing to verify here, all outputs should already have been chosen in earlier build steps
        }
    };

    // if build permit is in use we must decrement the remaining builds
    if ctx.accounts.build.build_permit_in_use {
        match &mut ctx.accounts.build_permit {
            Some(build_permit) => {
                // decrement the remaining builds this build permit is allowed
                build_permit.remaining_builds -= 1;

                // if remaining builds are now 0, lets close the PDA
                if build_permit.remaining_builds == 0 {
                    ctx.accounts
                        .build_permit
                        .close(ctx.accounts.payer.to_account_info())?;
                }
            }
            None => return Err(ErrorCode::BuildPermitRequired.into()),
        }
    }

    Ok(())
}
