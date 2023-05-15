use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::token;
use spl_account_compression::{
    cpi::{accounts::VerifyLeaf, verify_leaf},
    program::SplAccountCompression,
};

#[derive(Accounts)]
pub struct VerifyPaymentMintTest<'info> {
    pub payment_mint: Account<'info, token::Mint>,

    /// CHECK: done by spl-account-compression
    pub payment_mints: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub account_compression: Program<'info, SplAccountCompression>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyPaymentMintTestArgs {
    pub root: [u8; 32],
    pub leaf_index: u32,
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, VerifyPaymentMintTest<'info>>,
    args: VerifyPaymentMintTestArgs,
) -> Result<()> {
    // verify payment mint exists in the payment mints tree
    let verify_payment_mint_accounts = VerifyLeaf {
        merkle_tree: ctx.accounts.payment_mints.to_account_info(),
    };

    verify_leaf(
        CpiContext::new(
            ctx.accounts.account_compression.to_account_info(),
            verify_payment_mint_accounts,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        args.root,
        ctx.accounts.payment_mint.key().as_ref().try_into().unwrap(),
        args.leaf_index,
    )?;

    Ok(())
}
