pub mod utils;

use crate::utils::{assert_is_proper_class, assert_is_proper_instance};
use anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize};
use anchor_spl::token::{Mint, Token, TokenAccount};
use raindrops_item::{
    utils::{
        assert_part_of_namespace, assert_permissiveness_access, close_token_account,
        spl_token_transfer, AssertPermissivenessAccessArgs, TokenTransferParams,
    },
    Boolean, ChildUpdatePropagationPermissiveness, NamespaceAndIndex, Permissiveness,
    PermissivenessType,
};
anchor_lang::declare_id!("stk9HFnKhZN2PZjnn5C4wTzmeiAEgsDkbqnHkNjX1Z4");
pub const PREFIX: &str = "staking";
pub const STAKING_COUNTER: &str = "counter";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginArtifactStakeWarmupArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub index: u64,
    pub staking_index: u64,
    pub artifact_class_mint: Pubkey,
    pub artifact_mint: Pubkey,
    pub staking_amount: u64,
    pub staking_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndArtifactStakeWarmupArgs {
    pub class_index: u64,
    pub index: u64,
    pub staking_index: u64,
    pub artifact_class_mint: Pubkey,
    pub artifact_mint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginArtifactStakeCooldownArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub index: u64,
    pub staking_index: u64,
    pub artifact_class_mint: Pubkey,
    pub artifact_mint: Pubkey,
    pub staking_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndArtifactStakeCooldownArgs {
    pub class_index: u64,
    pub index: u64,
    pub staking_index: u64,
    pub artifact_class_mint: Pubkey,
    pub artifact_mint: Pubkey,
}

#[program]
pub mod staking {

    use super::*;

    pub fn begin_artifact_stake_warmup<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BeginArtifactStakeWarmup<'info>>,
        args: BeginArtifactStakeWarmupArgs,
    ) -> Result<()> {
        let namespace = &ctx.accounts.namespace;
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let staking_account = &ctx.accounts.staking_account;
        let staking_mint = &ctx.accounts.staking_mint;
        let staking_transfer_authority = &ctx.accounts.staking_transfer_authority;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        let BeginArtifactStakeWarmupArgs {
            class_index,
            parent_class_index,
            artifact_class_mint,
            artifact_mint,
            staking_amount,
            staking_permissiveness_to_use,
            index,
            ..
        } = args;

        let artifact_class =
            assert_is_proper_class(artifact_class_unchecked, &artifact_class_mint, class_index)?;

        assert_is_proper_instance(
            artifact_unchecked,
            &artifact_class_unchecked.key(),
            &artifact_mint,
            index,
        )?;

        let namespace = assert_part_of_namespace(&artifact_unchecked.to_account_info(), namespace)?;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &artifact_class_unchecked.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &staking_permissiveness_to_use,
            permissiveness_array: &artifact_class.data.staking_permissiveness,
            index: class_index,
            class_index: parent_class_index,
            account_mint: Some(&artifact_class_mint),
        })?;

        for wl in &namespace.whitelisted_staking_mints {
            if *wl == staking_mint.key() {
                spl_token_transfer(TokenTransferParams {
                    source: staking_account.to_account_info(),
                    destination: staking_escrow.to_account_info(),
                    amount: staking_amount,
                    authority: staking_transfer_authority.to_account_info(),
                    authority_signer_seeds: &[],
                    token_program: token_program.to_account_info(),
                })?;

                staking_counter.bump = *ctx
                    .bumps
                    .get("artifact_intermediary_staking_counter")
                    .unwrap();
                staking_counter.event_start = clock.unix_timestamp;
                staking_counter.event_type = 0;
                return Ok(());
            }
        }

        return Err(error!(ErrorCode::StakingMintNotWhitelisted));
    }

    pub fn end_artifact_stake_warmup<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EndArtifactStakeWarmup<'info>>,
        args: EndArtifactStakeWarmupArgs,
    ) -> Result<()> {
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let artifact_mint_staking_account = &ctx.accounts.artifact_mint_staking_account;
        let staking_mint = &ctx.accounts.staking_mint;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let payer = &ctx.accounts.payer;

        let EndArtifactStakeWarmupArgs {
            class_index,
            index,
            artifact_class_mint,
            artifact_mint,
            ..
        } = args;

        let artifact_class =
            assert_is_proper_class(artifact_class_unchecked, &artifact_class_mint, class_index)?;

        assert_is_proper_instance(
            artifact_unchecked,
            &artifact_class_unchecked.key(),
            &artifact_mint,
            index,
        )?;

        require!(staking_counter.event_type == 0, IncorrectStakingCounterType);
        require!(staking_counter.event_start > 0, StakingWarmupNotStarted);

        if let Some(duration) = artifact_class.data.staking_warm_up_duration {
            require!(
                staking_counter
                    .event_start
                    .checked_add(duration as i64)
                    .ok_or(ErrorCode::NumericalOverflowError)?
                    <= clock.unix_timestamp,
                StakingWarmupNotFinished
            )
        }

        let staking_mint_key = staking_mint.key();
        let signer_seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &index.to_le_bytes(),
            &staking_mint_key.as_ref(),
            &args.staking_index.to_le_bytes(),
            STAKING_COUNTER.as_bytes(),
            &[staking_counter.bump],
        ];

        let staking_amount = staking_escrow.amount;

        spl_token_transfer(TokenTransferParams {
            source: staking_escrow.to_account_info(),
            destination: artifact_mint_staking_account.to_account_info(),
            amount: staking_amount,
            authority: staking_counter.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            token_program: token_program.to_account_info(),
        })?;

        let counter_info = staking_counter.to_account_info();
        let snapshot: u64 = counter_info.lamports();

        **counter_info.lamports.borrow_mut() = 0;

        **payer.lamports.borrow_mut() = payer
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        close_token_account(
            &staking_escrow.to_account_info(),
            payer,
            token_program,
            &staking_counter.to_account_info(),
            &signer_seeds,
        )?;

        // FIXME: Call cpi to update tokens_staked

        // artifact.tokens_staked = artifact
        //     .tokens_staked
        //     .checked_add(staking_amount)
        //     .ok_or(ErrorCode::NumericalOverflowError)?;

        // // Because artifact is using a copy of this data
        // let mut data = artifact_unchecked.data.borrow_mut();
        // data.copy_from_slice(&artifact.try_to_vec()?);

        return Ok(());
    }

    pub fn begin_artifact_stake_cooldown<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BeginArtifactStakeCooldown<'info>>,
        args: BeginArtifactStakeCooldownArgs,
    ) -> Result<()> {
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let artifact_mint_staking_account = &ctx.accounts.artifact_mint_staking_account;
        let staking_mint = &ctx.accounts.staking_mint;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        let BeginArtifactStakeCooldownArgs {
            class_index,
            parent_class_index,
            index,
            artifact_class_mint,
            artifact_mint,
            staking_permissiveness_to_use,
            ..
        } = args;

        let artifact_class =
            assert_is_proper_class(artifact_class_unchecked, &artifact_class_mint, class_index)?;

        assert_is_proper_instance(
            artifact_unchecked,
            &artifact_class_unchecked.key(),
            &artifact_mint,
            index,
        )?;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &artifact_class_unchecked.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &staking_permissiveness_to_use,
            permissiveness_array: if artifact_class.data.unstaking_permissiveness.is_some() {
                &artifact_class.data.unstaking_permissiveness
            } else {
                &artifact_class.data.staking_permissiveness
            },
            index: class_index,
            class_index: parent_class_index,
            account_mint: Some(&artifact_class_mint),
        })?;

        let staking_mint_key = staking_mint.key();
        let staking_escrow_bump = *ctx
            .bumps
            .get("artifact_intermediary_staking_account")
            .unwrap();
        let signer_seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &index.to_le_bytes(),
            &staking_mint_key.as_ref(),
            &args.staking_index.to_le_bytes(),
            &[staking_escrow_bump],
        ];

        let amount_to_unstake = artifact_mint_staking_account.amount;

        spl_token_transfer(TokenTransferParams {
            source: artifact_mint_staking_account.to_account_info(),
            destination: staking_escrow.to_account_info(),
            amount: amount_to_unstake,
            authority: staking_escrow.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            token_program: token_program.to_account_info(),
        })?;

        // FIXME: Call cpi to update tokens_staked

        // artifact.tokens_staked = artifact
        //     .tokens_staked
        //     .checked_sub(amount_to_unstake)
        //     .ok_or(ErrorCode::NumericalOverflowError)?;

        // // Because artifact is using a copy of this data
        // let mut data = artifact_unchecked.data.borrow_mut();
        // data.copy_from_slice(&artifact.try_to_vec()?);

        staking_counter.bump = *ctx
            .bumps
            .get("artifact_intermediary_staking_counter")
            .unwrap();
        staking_counter.event_start = clock.unix_timestamp;
        staking_counter.event_type = 1;

        return Ok(());
    }

    pub fn end_artifact_stake_cooldown<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EndArtifactStakeCooldown<'info>>,
        args: EndArtifactStakeCooldownArgs,
    ) -> Result<()> {
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let staking_account = &ctx.accounts.staking_account;
        let staking_mint = &ctx.accounts.staking_mint;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let payer = &ctx.accounts.payer;

        let EndArtifactStakeCooldownArgs {
            class_index,
            index,
            artifact_class_mint,
            artifact_mint,
            ..
        } = args;

        let artifact_class =
            assert_is_proper_class(artifact_class_unchecked, &artifact_class_mint, class_index)?;

        assert_is_proper_instance(
            artifact_unchecked,
            &artifact_class_unchecked.key(),
            &artifact_mint,
            index,
        )?;

        require!(staking_counter.event_type == 1, IncorrectStakingCounterType);
        require!(staking_counter.event_start > 0, StakingCooldownNotStarted);

        if let Some(duration) = artifact_class.data.staking_cooldown_duration {
            require!(
                staking_counter
                    .event_start
                    .checked_add(duration as i64)
                    .ok_or(ErrorCode::NumericalOverflowError)?
                    <= clock.unix_timestamp,
                StakingCooldownNotFinished
            )
        }

        let staking_mint_key = staking_mint.key();
        let staking_account_key = staking_account.key();
        let signer_seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &index.to_le_bytes(),
            &staking_mint_key.as_ref(),
            &args.staking_index.to_le_bytes(),
            STAKING_COUNTER.as_bytes(),
            staking_account_key.as_ref(),
            &[staking_counter.bump],
        ];

        spl_token_transfer(TokenTransferParams {
            source: staking_escrow.to_account_info(),
            destination: staking_account.to_account_info(),
            amount: staking_escrow.amount,
            authority: staking_counter.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            token_program: token_program.to_account_info(),
        })?;

        let counter_info = staking_counter.to_account_info();
        let snapshot: u64 = counter_info.lamports();

        **counter_info.lamports.borrow_mut() = 0;

        **payer.lamports.borrow_mut() = payer
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        close_token_account(
            &staking_escrow.to_account_info(),
            payer,
            token_program,
            &staking_counter.to_account_info(),
            &signer_seeds,
        )?;

        return Ok(());
    }
}

// [COMMON REMAINING ACCOUNTS]
// Most actions require certain remainingAccounts based on their permissioned setup
// if you see common remaining accounts label, use the following as your rubric:
// If update/usage permissiveness is token holder can update:
// token_account [readable]
// token_holder [signer]
// If update/usage permissiveness is class holder can update
// class token_account [readable]
// class token_holder [signer]
// class [readable]
// class mint [readable]
// If update/usage permissiveness is update authority can update
// metadata_update_authority [signer]
// metadata [readable]
// If update permissiveness is anybody can update, nothing further is required.

#[derive(Accounts)]
#[instruction(args: BeginArtifactStakeWarmupArgs)]
pub struct BeginArtifactStakeWarmup<'info> {
    /// CHECK: assert_is_proper_class
    artifact_class: UncheckedAccount<'info>,
    /// CHECK: assert_is_proper_instance
    artifact: UncheckedAccount<'info>,
    #[account(
        init,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
        ],
        bump,
        token::mint = staking_mint,
        token::authority = artifact_intermediary_staking_counter,
        payer = payer,
    )]
    artifact_intermediary_staking_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
            STAKING_COUNTER.as_bytes(),
        ],
        bump,
        space = 8 + 1 + 8 + 1,
        payer = payer,
    )]
    artifact_intermediary_staking_counter: Box<Account<'info, StakingCounter>>,
    #[account(constraint = staking_account.mint == staking_mint.key())]
    staking_account: Box<Account<'info, TokenAccount>>,
    staking_mint: Box<Account<'info, Mint>>,
    staking_transfer_authority: Signer<'info>,
    /// CHECK: assert_part_of_namespace
    namespace: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: EndArtifactStakeWarmupArgs)]
pub struct EndArtifactStakeWarmup<'info> {
    /// CHECK: assert_is_proper_class
    artifact_class: UncheckedAccount<'info>,
    /// CHECK: assert_is_proper_instance
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
        ],
        bump,
    )]
    artifact_intermediary_staking_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
            STAKING_COUNTER.as_bytes(),
        ],
        bump = artifact_intermediary_staking_counter.bump,
    )]
    artifact_intermediary_staking_counter: Box<Account<'info, StakingCounter>>,
    #[account(
        init_if_needed,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
        ],
        bump,
        token::mint = staking_mint,
        token::authority = artifact_intermediary_staking_account,
        payer = payer,
    )]
    artifact_mint_staking_account: Box<Account<'info, TokenAccount>>,
    staking_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(args: BeginArtifactStakeCooldownArgs)]
pub struct BeginArtifactStakeCooldown<'info> {
    /// CHECK: assert_is_proper_class
    artifact_class: UncheckedAccount<'info>,
    /// CHECK: assert_is_proper_instance
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(
        init,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
        ],
        bump,
        token::mint = staking_mint,
        token::authority = artifact_intermediary_staking_counter,
        payer = payer,
    )]
    artifact_intermediary_staking_account: Box<Account<'info, TokenAccount>>,
    // Note that staking counters going IN do not have intended staking account destination in the seeds
    // This is so they are easily derivable and findable by any user interface without an accounts query, so people can see inbound statuses
    // It's also okay to make ingoing end action permissionless because you are just moving tokens from controlled escrow to controlled internal bank of item
    // for outgoing, the final step should be permissionless too, but that would mean someone else could claim your tokens, unless
    // the staking counter is TIED in some way to the intended destination account. In order to make this permissionless without spending 32 bytes, we make the
    // seed have an additional key in the staking counter.
    #[account(
        init,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
            STAKING_COUNTER.as_bytes(),
            staking_account.key().as_ref(),
        ],
        bump,
        space = 8 + 1 + 8 + 1,
        payer = payer,
    )]
    artifact_intermediary_staking_counter: Box<Account<'info, StakingCounter>>,
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
        ],
        bump,
    )]
    artifact_mint_staking_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = staking_account.mint == staking_mint.key())]
    staking_account: Box<Account<'info, TokenAccount>>,
    staking_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: EndArtifactStakeCooldownArgs)]
pub struct EndArtifactStakeCooldown<'info> {
    /// CHECK: assert_is_proper_class
    artifact_class: UncheckedAccount<'info>,
    /// CHECK: assert_is_proper_instance
    artifact: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
        ],
        bump,
    )]
    artifact_intermediary_staking_account: Box<Account<'info, TokenAccount>>,
    // Wondering why this counter has an additional key of staking_account where inbound staking counters do not? See cooldown begin action.
    #[account(mut,
        seeds = [
            PREFIX.as_bytes(),
            args.artifact_class_mint.as_ref(),
            args.artifact_mint.as_ref(),
            &args.index.to_le_bytes(),
            &staking_mint.key().as_ref(),
            &args.staking_index.to_le_bytes(),
            STAKING_COUNTER.as_bytes(),
            staking_account.key().as_ref(),
        ],
        bump = artifact_intermediary_staking_counter.bump,
    )]
    artifact_intermediary_staking_counter: Box<Account<'info, StakingCounter>>,
    #[account(mut, constraint = staking_account.mint == staking_mint.key())]
    staking_account: Box<Account<'info, TokenAccount>>,
    staking_mint: Box<Account<'info, Mint>>,
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    clock: Sysvar<'info, Clock>,
}

#[account]
pub struct StakingCounter {
    pub bump: u8,
    pub event_start: i64,
    pub event_type: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ArtifactClassData {
    pub children_must_be_editions: Option<Boolean>,
    pub builder_must_be_holder: Option<Boolean>,
    pub update_permissiveness: Option<Vec<Permissiveness>>,
    pub build_permissiveness: Option<Vec<Permissiveness>>,
    pub staking_warm_up_duration: Option<u64>,
    pub staking_cooldown_duration: Option<u64>,
    pub staking_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use staking permissiveness
    pub unstaking_permissiveness: Option<Vec<Permissiveness>>,
    pub child_update_propagation_permissiveness: Option<Vec<ChildUpdatePropagationPermissiveness>>,
}

#[account]
pub struct ArtifactClass {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    pub parent: Option<Pubkey>,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    pub edition: Option<Pubkey>,
    pub bump: u8,
    pub existing_children: u64,
    pub data: ArtifactClassData,
}

#[account]
pub struct Artifact {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    pub parent: Pubkey,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    pub edition: Option<Pubkey>,
    pub bump: u8,
    pub tokens_staked: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Numerical overflow error")]
    NumericalOverflowError,
    #[msg("Token mint to failed")]
    TokenMintToFailed,
    #[msg("TokenBurnFailed")]
    TokenBurnFailed,
    #[msg("Derived key is invalid")]
    DerivedKeyInvalid,
    #[msg("Update authority for metadata expected as signer")]
    MustSpecifyPermissivenessType,
    #[msg("Permissiveness not found in array")]
    PermissivenessNotFound,
    #[msg("Public key mismatch")]
    PublicKeyMismatch,
    #[msg("Insufficient Balance")]
    InsufficientBalance,
    #[msg("Metadata doesn't exist")]
    MetadataDoesntExist,
    #[msg("Edition doesn't exist")]
    EditionDoesntExist,
    #[msg("No parent present")]
    NoParentPresent,
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    #[msg("Not mint authority")]
    NotMintAuthority,
    #[msg("Must be token holder to build against it")]
    MustBeHolderToBuild,
    #[msg("Missing the merkle fields")]
    MissingMerkleInfo,
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("Unable to find a valid cooldown state")]
    UnableToFindValidCooldownState,
    #[msg("You havent started staking yet")]
    StakingWarmupNotStarted,
    #[msg("You havent finished your warm up period")]
    StakingWarmupNotFinished,
    #[msg("Attempting to use a staking counter going in the wrong direction")]
    IncorrectStakingCounterType,
    #[msg("Staking cooldown not started")]
    StakingCooldownNotStarted,
    #[msg("Staking cooldown not finished")]
    StakingCooldownNotFinished,
    #[msg("Invalid program owner")]
    InvalidProgramOwner,
    #[msg("Not initialized")]
    NotInitialized,
    #[msg("Staking mint not whitelisted")]
    StakingMintNotWhitelisted,
    #[msg("Discriminator mismatch")]
    DiscriminatorMismatch,
    #[msg("Staking for player coming soon")]
    StakingForPlayerComingSoon,
}
