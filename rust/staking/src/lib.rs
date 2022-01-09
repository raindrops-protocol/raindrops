pub mod utils;

use {
    crate::utils::{
        assert_is_proper_class, assert_is_proper_instance, assert_part_of_namespace,
        assert_permissiveness_access, close_token_account,
        create_program_token_account_if_not_present, spl_token_transfer,
        AssertPermissivenessAccessArgs, TokenTransferParams,
    },
    anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize},
    anchor_spl::token::{Mint, Token, TokenAccount},
};
anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const PREFIX: &str = "staking";
pub const STAKING_COUNTER: &str = "counter";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginArtifactStakeWarmupArgs {
    artifact_intermediary_staking_bump: u8,
    staking_counter_bump: u8,
    class_index: u64,
    index: u64,
    staking_index: u64,
    artifact_class_mint: Pubkey,
    artifact_mint: Pubkey,
    staking_amount: u64,
    staking_permissiveness_to_use: Option<Permissiveness>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginArtifactStakeCooldownArgs {
    artifact_intermediary_staking_bump: u8,
    artifact_mint_staking_bump: u8,
    staking_counter_bump: u8,
    class_index: u64,
    index: u64,
    staking_index: u64,
    artifact_class_mint: Pubkey,
    artifact_mint: Pubkey,
    amount_to_unstake: u64,
    staking_permissiveness_to_use: Option<Permissiveness>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndArtifactStakeWarmupArgs {
    artifact_intermediary_staking_bump: u8,
    artifact_mint_staking_bump: u8,
    class_index: u64,
    index: u64,
    staking_index: u64,
    artifact_class_mint: Pubkey,
    artifact_mint: Pubkey,
    staking_amount: u64,
    staking_permissiveness_to_use: Option<Permissiveness>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndArtifactStakeCooldownArgs {
    artifact_intermediary_staking_bump: u8,
    staking_counter_bump: u8,
    class_index: u64,
    index: u64,
    staking_index: u64,
    staking_mint: Pubkey,
    artifact_class_mint: Pubkey,
    artifact_mint: Pubkey,
    staking_permissiveness_to_use: Option<Permissiveness>,
}

#[program]
pub mod staking {

    use super::*;

    pub fn begin_artifact_stake_warmup<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BeginArtifactStakeWarmup<'info>>,
        args: BeginArtifactStakeWarmupArgs,
    ) -> ProgramResult {
        let namespace = &ctx.accounts.namespace;
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let staking_mint = &ctx.accounts.staking_mint;
        let staking_account = &ctx.accounts.staking_token_account;
        let staking_transfer_authority = &ctx.accounts.staking_transfer_authority;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        let BeginArtifactStakeWarmupArgs {
            staking_counter_bump,
            class_index,
            artifact_class_mint,
            staking_amount,
            staking_permissiveness_to_use,
            artifact_mint,
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

                staking_counter.bump = staking_counter_bump;
                staking_counter.event_start = clock.unix_timestamp;
                staking_counter.event_type = 0;
                return Ok(());
            }
        }

        return Err(ErrorCode::StakingMintNotWhitelisted.into());
    }

    pub fn end_artifact_stake_warmup<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EndArtifactStakeWarmup<'info>>,
        args: EndArtifactStakeWarmupArgs,
    ) -> ProgramResult {
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let staking_mint = &ctx.accounts.staking_mint;
        let artifact_mint_staking_account = &ctx.accounts.artifact_mint_staking_account;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let system = &ctx.accounts.system_program;
        let payer = &ctx.accounts.payer;
        let rent = &ctx.accounts.rent;

        let EndArtifactStakeWarmupArgs {
            class_index,
            index,
            artifact_class_mint,
            staking_amount,
            staking_permissiveness_to_use,
            artifact_mint,
            ..
        } = args;

        let artifact_class =
            assert_is_proper_class(artifact_class_unchecked, &artifact_class_mint, class_index)?;

        let mut artifact = assert_is_proper_instance(
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

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &artifact_class_unchecked.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &staking_permissiveness_to_use,
            permissiveness_array: &artifact_class.data.staking_permissiveness,
            index: class_index,
            account_mint: Some(&artifact_class_mint),
        })?;

        let signer_seeds = [
            PREFIX.as_bytes(),
            artifact_mint.as_ref(),
            &index.to_le_bytes(),
            &[artifact.bump],
        ];

        let artifact_info = artifact_unchecked.to_account_info();

        create_program_token_account_if_not_present(
            artifact_mint_staking_account,
            system,
            &payer.to_account_info(),
            token_program,
            staking_mint,
            &artifact_info,
            rent,
            &signer_seeds,
        )?;

        spl_token_transfer(TokenTransferParams {
            source: staking_escrow.to_account_info(),
            destination: artifact_mint_staking_account.to_account_info(),
            amount: staking_amount,
            authority: artifact_info,
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
            staking_escrow,
            payer,
            token_program,
            &artifact_unchecked.to_account_info(),
            &signer_seeds,
        )?;

        artifact.tokens_staked = artifact
            .tokens_staked
            .checked_add(staking_amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        return Ok(());
    }

    pub fn begin_artifact_stake_cooldown<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BeginArtifactStakeCooldown<'info>>,
        args: BeginArtifactStakeCooldownArgs,
    ) -> ProgramResult {
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let artifact_mint_staking_account = &ctx.accounts.artifact_mint_staking_account;

        let BeginArtifactStakeCooldownArgs {
            staking_counter_bump,
            class_index,
            index,
            artifact_class_mint,
            amount_to_unstake,
            staking_permissiveness_to_use,
            artifact_mint,
            ..
        } = args;

        let artifact_class =
            assert_is_proper_class(artifact_class_unchecked, &artifact_class_mint, class_index)?;

        let mut artifact = assert_is_proper_instance(
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
            account_mint: Some(&artifact_class_mint),
        })?;

        let signer_seeds = [
            PREFIX.as_bytes(),
            artifact_mint.as_ref(),
            &index.to_le_bytes(),
            &[artifact.bump],
        ];

        spl_token_transfer(TokenTransferParams {
            source: artifact_mint_staking_account.to_account_info(),
            destination: staking_escrow.to_account_info(),
            amount: amount_to_unstake,
            authority: artifact_unchecked.to_account_info(),
            authority_signer_seeds: &signer_seeds,
            token_program: token_program.to_account_info(),
        })?;

        artifact.tokens_staked = artifact
            .tokens_staked
            .checked_sub(amount_to_unstake)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        staking_counter.bump = staking_counter_bump;
        staking_counter.event_start = clock.unix_timestamp;
        staking_counter.event_type = 1;

        return Ok(());
    }

    pub fn end_artifact_stake_cooldown<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EndArtifactStakeCooldown<'info>>,
        args: EndArtifactStakeCooldownArgs,
    ) -> ProgramResult {
        let artifact_unchecked = &mut ctx.accounts.artifact;
        let artifact_class_unchecked = &ctx.accounts.artifact_class;
        let staking_escrow = &mut ctx.accounts.artifact_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.artifact_intermediary_staking_counter;
        let staking_account = &ctx.accounts.staking_account;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let payer = &ctx.accounts.payer;

        let EndArtifactStakeCooldownArgs {
            class_index,
            index,
            artifact_class_mint,
            staking_permissiveness_to_use,
            artifact_mint,
            ..
        } = args;

        let artifact_class =
            assert_is_proper_class(artifact_class_unchecked, &artifact_class_mint, class_index)?;

        let artifact = assert_is_proper_instance(
            artifact_unchecked,
            &artifact_class_unchecked.key(),
            &artifact_mint,
            index,
        )?;

        require!(staking_counter.event_type == 1, IncorrectStakingCounterType);
        require!(staking_counter.event_start > 0, StakingWarmupNotStarted);

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
            account_mint: Some(&artifact_class_mint),
        })?;

        let signer_seeds = [
            PREFIX.as_bytes(),
            artifact_mint.as_ref(),
            &index.to_le_bytes(),
            &[artifact.bump],
        ];

        let artifact_info = artifact_unchecked.to_account_info();

        spl_token_transfer(TokenTransferParams {
            source: staking_escrow.to_account_info(),
            destination: staking_account.to_account_info(),
            amount: staking_escrow.amount,
            authority: artifact_info,
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
            staking_escrow,
            payer,
            token_program,
            &artifact_unchecked.to_account_info(),
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
    artifact_class: UncheckedAccount<'info>,
    artifact: UncheckedAccount<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), args.artifact_class_mint.as_ref(), args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes()], bump=args.artifact_intermediary_staking_bump, token::mint = staking_mint, token::authority = artifact, payer=payer)]
    artifact_intermediary_staking_account: Account<'info, TokenAccount>,
    #[account(init, seeds=[PREFIX.as_bytes(), args.artifact_class_mint.as_ref(),args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes(), STAKING_COUNTER.as_bytes()], bump=args.staking_counter_bump, space=8+1+8+1, payer=payer)]
    artifact_intermediary_staking_counter: Account<'info, StakingCounter>,
    #[account(constraint=staking_token_account.mint == staking_mint.key())]
    staking_token_account: Account<'info, TokenAccount>,
    staking_mint: Account<'info, Mint>,
    staking_transfer_authority: Signer<'info>,
    namespace: UncheckedAccount<'info>,
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
    artifact_class: UncheckedAccount<'info>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(),args.artifact_class_mint.as_ref(), args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes()], bump=args.artifact_intermediary_staking_bump)]
    artifact_intermediary_staking_account: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.artifact_class_mint.as_ref(),args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes(), STAKING_COUNTER.as_bytes()], bump=artifact_intermediary_staking_counter.bump)]
    artifact_intermediary_staking_counter: Account<'info, StakingCounter>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.artifact_class_mint.as_ref(), args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref()], bump=args.artifact_mint_staking_bump)]
    artifact_mint_staking_account: UncheckedAccount<'info>,
    staking_mint: Account<'info, Mint>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}
#[derive(Accounts)]
#[instruction(args: BeginArtifactStakeCooldownArgs)]
pub struct BeginArtifactStakeCooldown<'info> {
    artifact_class: UncheckedAccount<'info>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(),args.artifact_class_mint.as_ref(), args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes()], bump=args.artifact_intermediary_staking_bump, token::mint = staking_mint, token::authority = artifact, payer=payer)]
    artifact_intermediary_staking_account: Account<'info, TokenAccount>,
    #[account(init, seeds=[PREFIX.as_bytes(), args.artifact_class_mint.as_ref(), args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes(), STAKING_COUNTER.as_bytes()], bump=args.staking_counter_bump, space=8+1+8+1, payer=payer)]
    artifact_intermediary_staking_counter: Account<'info, StakingCounter>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.artifact_class_mint.as_ref(), args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref()], bump=args.artifact_mint_staking_bump)]
    artifact_mint_staking_account: UncheckedAccount<'info>,
    staking_mint: Account<'info, Mint>,
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
    artifact_class: UncheckedAccount<'info>,
    artifact: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(),args.artifact_class_mint.as_ref(), args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &args.staking_mint.key().as_ref(), &args.staking_index.to_le_bytes()], bump=args.artifact_intermediary_staking_bump)]
    artifact_intermediary_staking_account: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.artifact_class_mint.as_ref(),args.artifact_mint.as_ref(), &args.index.to_le_bytes(), &args.staking_mint.key().as_ref(), &args.staking_index.to_le_bytes(), STAKING_COUNTER.as_bytes()], bump=artifact_intermediary_staking_counter.bump)]
    artifact_intermediary_staking_counter: Account<'info, StakingCounter>,
    #[account(mut, constraint=staking_account.mint == args.staking_mint)]
    staking_account: Account<'info, TokenAccount>,
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct Permissiveness {
    inherited: InheritanceState,
    permissiveness_type: PermissivenessType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PermissivenessType {
    TokenHolder,
    ClassHolder,
    UpdateAuthority,
    Anybody,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChildUpdatePropagationPermissiveness {
    overridable: bool,
    inherited: InheritanceState,
    child_update_propagation_permissiveness_type: ChildUpdatePropagationPermissivenessType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ChildUpdatePropagationPermissivenessType {
    DefaultItemCategory,
    Usages,
    Components,
    UpdatePermissiveness,
    BuildPermissiveness,
    ChildUpdatePropagationPermissiveness,
    ChildrenMustBeEditionsPermissiveness,
    BuilderMustBeHolderPermissiveness,
    StakingPermissiveness,
    Namespaces,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum InheritanceState {
    NotInherited,
    Inherited,
    Overridden,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Boolean {
    inherited: InheritanceState,
    boolean: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ArtifactClassData {
    children_must_be_editions: Option<Boolean>,
    builder_must_be_holder: Option<Boolean>,
    update_permissiveness: Option<Vec<Permissiveness>>,
    build_permissiveness: Option<Vec<Permissiveness>>,
    staking_warm_up_duration: Option<u64>,
    staking_cooldown_duration: Option<u64>,
    staking_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use staking permissiveness
    unstaking_permissiveness: Option<Vec<Permissiveness>>,
    child_update_propagation_permissiveness: Option<Vec<ChildUpdatePropagationPermissiveness>>,
}

#[account]
pub struct ArtifactClass {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    parent: Option<Pubkey>,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    bump: u8,
    existing_children: u64,
    data: ArtifactClassData,
}

#[account]
pub struct StakingCounter {
    bump: u8,
    event_start: i64,
    event_type: u8,
}

#[account]
pub struct Artifact {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    parent: Pubkey,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    bump: u8,
    tokens_staked: u64,
}

#[error]
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
    #[msg("Staking cooldown not finished")]
    StakingCooldownNotFinished,
    #[msg("Invalid program owner")]
    InvalidProgramOwner,
    #[msg("Not initialized")]
    NotInitialized,
    #[msg("Staking mint not whitelisted")]
    StakingMintNotWhitelisted,
}
