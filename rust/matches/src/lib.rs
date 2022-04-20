pub mod utils;

use {
    crate::utils::{
        assert_derivation, assert_initialized, assert_is_ata, assert_owned_by, close_token_account,
        create_or_allocate_account_raw, get_mask_and_index_for_seq, is_part_of_namespace,
        is_valid_validation, spl_token_burn, spl_token_mint_to, spl_token_transfer, verify,
        TokenBurnParams, TokenTransferParams,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize, Discriminator,
    },
    anchor_spl::token::{Mint, TokenAccount},
    metaplex_token_metadata::instruction::{
        create_master_edition, create_metadata_accounts,
        mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
    },
    spl_token::instruction::{initialize_account2, mint_to},
};
anchor_lang::declare_id!("mtchsiT6WoLQ62fwCoiHMCfXJzogtfru4ovY8tXKrjJ");
pub const PREFIX: &str = "matches";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateOrUpdateOracleArgs {
    oracle_bump: u8,
    token_transfer_root: Option<Root>,
    token_transfers: Option<Vec<TokenDelta>>,
    seed: Pubkey,
    space: u64,
    finalized: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainOracleArgs {
    oracle_bump: u8,
    match_bump: u8,
    seed: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateMatchArgs {
    match_bump: u8,
    match_state: MatchState,
    token_entry_validation_root: Option<Root>,
    token_entry_validation: Option<Vec<TokenValidation>>,
    win_oracle: Pubkey,
    win_oracle_cooldown: u64,
    authority: Pubkey,
    space: u64,
    leave_allowed: bool,
    join_allowed_during_start: bool,
    minimum_allowed_entry_time: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateMatchArgs {
    match_state: MatchState,
    token_entry_validation_root: Option<Root>,
    token_entry_validation: Option<Vec<TokenValidation>>,
    win_oracle_cooldown: u64,
    authority: Pubkey,
    leave_allowed: bool,
    join_allowed_during_start: bool,
    minimum_allowed_entry_time: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JoinMatchArgs {
    amount: u64,
    escrow_bump: u8,
    token_entry_validation_proof: Option<Vec<[u8; 32]>>,
    token_entry_validation: Option<TokenValidation>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LeaveMatchArgs {
    amount: u64,
    escrow_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DisburseTokensByOracleArgs {
    escrow_bump: u8,
    token_delta_proof_info: Option<TokenDeltaProofInfo>,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenDeltaProofInfo {
    token_delta_proof: Vec<[u8; 32]>,
    token_delta: TokenDelta,
    total_proof: Vec<[u8; 32]>,
    total: u64,
}

#[program]
pub mod matches {

    use super::*;

    pub fn create_or_update_oracle<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateOrUpdateOracle<'info>>,
        args: CreateOrUpdateOracleArgs,
    ) -> Result<()> {
        let CreateOrUpdateOracleArgs {
            token_transfer_root,
            token_transfers,
            finalized,
            ..
        } = args;

        let win_oracle = &mut ctx.accounts.oracle;

        require!(!win_oracle.finalized, OracleAlreadyFinalized);

        win_oracle.finalized = finalized;
        win_oracle.token_transfer_root = token_transfer_root.clone();
        win_oracle.token_transfers = token_transfers.clone();

        return Ok(());
    }

    pub fn create_match<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateMatch<'info>>,
        args: CreateMatchArgs,
    ) -> Result<()> {
        let CreateMatchArgs {
            match_bump,
            match_state,
            token_entry_validation_root,
            token_entry_validation,
            win_oracle,
            win_oracle_cooldown,
            authority,
            leave_allowed,
            minimum_allowed_entry_time,
            ..
        } = args;

        let match_instance = &mut ctx.accounts.match_instance;

        match_instance.bump = *ctx.bumps.get("match_instance").unwrap();
        require!(
            match_state == MatchState::Draft || match_state == MatchState::Initialized,
            InvalidStartingMatchState
        );
        match_instance.state = match_state;
        if token_entry_validation.is_some() {
            match_instance.token_entry_validation = token_entry_validation;
        } else {
            match_instance.token_entry_validation_root = token_entry_validation_root;
        }
        match_instance.win_oracle = win_oracle;
        match_instance.win_oracle_cooldown = win_oracle_cooldown;
        match_instance.authority = authority;
        match_instance.minimum_allowed_entry_time = minimum_allowed_entry_time;
        match_instance.leave_allowed = leave_allowed;

        Ok(())
    }

    pub fn update_match<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateMatch<'info>>,
        args: UpdateMatchArgs,
    ) -> Result<()> {
        let UpdateMatchArgs {
            match_state,
            token_entry_validation_root,
            token_entry_validation,
            authority,
            win_oracle_cooldown,
            leave_allowed,
            minimum_allowed_entry_time,
            join_allowed_during_start,
            ..
        } = args;

        let match_instance = &mut ctx.accounts.match_instance;

        match match_instance.state {
            MatchState::Draft => {
                require!(
                    match_state == MatchState::Initialized
                        || match_state == MatchState::Draft
                        || match_state == MatchState::Deactivated,
                    InvalidUpdateMatchState
                )
            }
            MatchState::Initialized => {
                require!(
                    match_state == MatchState::Started
                        || match_state == MatchState::Initialized
                        || match_state == MatchState::Deactivated,
                    InvalidUpdateMatchState
                )
            }
            MatchState::Started => {
                require!(
                    match_state == MatchState::Deactivated || match_state == MatchState::Started,
                    InvalidUpdateMatchState
                )
            }
            MatchState::Finalized => {
                require!(
                    match_state == MatchState::Finalized,
                    InvalidUpdateMatchState
                )
            }
            MatchState::PaidOut => {
                require!(match_state == MatchState::PaidOut, InvalidUpdateMatchState)
            }
            MatchState::Deactivated => {
                require!(
                    match_state == MatchState::Deactivated,
                    InvalidUpdateMatchState
                )
            }
        }

        match_instance.state = match_state;
        if token_entry_validation.is_some() {
            match_instance.token_entry_validation = token_entry_validation;
        } else {
            match_instance.token_entry_validation_root = token_entry_validation_root;
        }
        match_instance.authority = authority;
        match_instance.win_oracle_cooldown = win_oracle_cooldown;

        match_instance.minimum_allowed_entry_time = minimum_allowed_entry_time;
        match_instance.leave_allowed = leave_allowed;
        match_instance.join_allowed_during_start = join_allowed_during_start;

        Ok(())
    }

    pub fn update_match_from_oracle<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateMatchFromOracle<'info>>,
    ) -> Result<()> {
        let match_instance = &mut ctx.accounts.match_instance;
        let win_oracle = &ctx.accounts.win_oracle;
        let clock = &ctx.accounts.clock;

        let win_oracle_instance: Account<'_, WinOracle> =
            Account::try_from(&win_oracle.to_account_info())?;

        if match_instance.last_oracle_check != 0 {
            require!(
                clock.unix_timestamp - match_instance.win_oracle_cooldown as i64
                    > match_instance.last_oracle_check as i64,
                OracleCooldownNotPassed
            );
        }

        require!(
            match_instance.state == MatchState::Started
                || match_instance.state == MatchState::Initialized,
            InvalidOracleUpdate
        );

        if win_oracle_instance.finalized {
            match_instance.state = MatchState::Finalized;
        } else {
            match_instance.state = MatchState::Started;
        }

        match_instance.last_oracle_check = clock.unix_timestamp as u64;

        Ok(())
    }

    pub fn drain_oracle<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainOracle<'info>>,
        _args: DrainOracleArgs,
    ) -> Result<()> {
        let match_instance = &mut ctx.accounts.match_instance;

        require!(
            match_instance.to_account_info().data_is_empty(),
            MatchMustBeDrained
        );

        let oracle = &mut ctx.accounts.oracle;
        let receiver = &mut ctx.accounts.receiver;

        let info = oracle.to_account_info();
        let snapshot: u64 = info.lamports();

        **info.lamports.borrow_mut() = 0;

        **receiver.lamports.borrow_mut() = receiver
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn drain_match<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainMatch<'info>>,
    ) -> Result<()> {
        let match_instance = &mut ctx.accounts.match_instance;
        let receiver = &mut ctx.accounts.receiver;
        require!(
            match_instance.state == MatchState::Deactivated
                || match_instance.state == MatchState::PaidOut,
            CannotDrainYet
        );

        require!(
            match_instance.token_types_removed == match_instance.token_types_added,
            CannotDrainYet
        );

        let info = match_instance.to_account_info();
        let snapshot: u64 = info.lamports();

        **info.lamports.borrow_mut() = 0;

        **receiver.lamports.borrow_mut() = receiver
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn leave_match<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, LeaveMatch<'info>>,
        _args: LeaveMatchArgs,
    ) -> Result<()> {
        let match_instance = &mut ctx.accounts.match_instance;
        let token_account_escrow = &ctx.accounts.token_account_escrow;
        let destination_token_account = &ctx.accounts.destination_token_account;
        let token_mint = &ctx.accounts.token_mint;
        let receiver = &mut ctx.accounts.receiver;
        let token_program = &ctx.accounts.token_program;
        let destination_info = destination_token_account.to_account_info();
        let token_escrow_info = token_account_escrow.to_account_info();
        let match_info = match_instance.to_account_info();
        let token_info = token_program.to_account_info();
        let receiver_info = receiver.to_account_info();

        assert_is_ata(&destination_info, &receiver.key(), &token_mint.key(), None)?;

        require!(
            match_instance.state == MatchState::Deactivated
                || match_instance.state == MatchState::PaidOut
                || match_instance.state == MatchState::Initialized
                || match_instance.state == MatchState::Started,
            CannotLeaveMatch
        );

        if match_instance.state == MatchState::Initialized
            || match_instance.state == MatchState::Started
        {
            require!(match_instance.leave_allowed, CannotLeaveMatch);
            require!(receiver.is_signer, ReceiverMustBeSigner)
        }

        let match_seeds = &[
            PREFIX.as_bytes(),
            match_instance.win_oracle.as_ref(),
            &[match_instance.bump],
        ];

        spl_token_transfer(TokenTransferParams {
            source: token_account_escrow.to_account_info(),
            destination: destination_info,
            amount: token_account_escrow.amount,
            authority: match_instance.to_account_info(),
            authority_signer_seeds: match_seeds,
            token_program: token_info,
        })?;

        close_token_account(
            &token_escrow_info,
            &receiver_info,
            token_program,
            &match_info,
            match_seeds,
        )?;

        match_instance.token_types_removed = match_instance
            .token_types_removed
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn disburse_tokens_by_oracle<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DisburseTokensByOracle<'info>>,
        args: DisburseTokensByOracleArgs,
    ) -> Result<()> {
        let match_instance = &mut ctx.accounts.match_instance;
        let token_account_escrow = &ctx.accounts.token_account_escrow;
        let destination_token_account = &ctx.accounts.destination_token_account;
        let token_mint = &ctx.accounts.token_mint;
        let win_oracle = &ctx.accounts.win_oracle;
        let original_sender = &ctx.accounts.original_sender;
        let token_program = &ctx.accounts.token_program;

        let DisburseTokensByOracleArgs {
            token_delta_proof_info,
            ..
        } = args;

        require!(
            match_instance.state == MatchState::Finalized,
            MatchMustBeInFinalized
        );

        msg!("1");
        let tfer = if let Some(proof_info) = token_delta_proof_info {
            let TokenDeltaProofInfo {
                token_delta_proof,
                token_delta,
                total_proof,
                total,
            } = proof_info;
            if let Some(root) = &win_oracle.token_transfer_root {
                let chief_node = anchor_lang::solana_program::keccak::hashv(&[
                    &[0x00],
                    &AnchorSerialize::try_to_vec(&token_delta)?,
                    &match_instance.current_token_transfer_index.to_le_bytes(),
                ]);
                require!(
                    verify(&token_delta_proof, &root.root, chief_node.0),
                    InvalidProof
                );

                let total_node =
                    anchor_lang::solana_program::keccak::hashv(&[&[0x00], &total.to_le_bytes()]);
                require!(verify(&total_proof, &root.root, total_node.0), InvalidProof);
                if match_instance.current_token_transfer_index == (total - 1) as u64 {
                    match_instance.state = MatchState::PaidOut;
                }
                token_delta
            } else {
                return Err(error!(ErrorCode::RootNotPresent));
            }
        } else if let Some(tfer_arr) = &win_oracle.token_transfers {
            if match_instance.current_token_transfer_index == (tfer_arr.len() - 1) as u64 {
                match_instance.state = MatchState::PaidOut;
            }
            tfer_arr[match_instance.current_token_transfer_index as usize].clone()
        } else {
            return Err(error!(ErrorCode::NoDeltasFound));
        };
        msg!("2");

        require!(
            tfer.token_transfer_type == TokenTransferType::Normal,
            UsePlayerEndpoint
        );

        require!(
            token_account_escrow.amount <= tfer.amount,
            CannotDeltaMoreThanAmountPresent
        );
        msg!("3");

        require!(tfer.mint == token_mint.key(), DeltaMintDoesNotMatch);

        require!(tfer.from == original_sender.key(), FromDoesNotMatch);

        let time_to_close = token_account_escrow.amount == tfer.amount;
        let match_seeds = &[
            PREFIX.as_bytes(),
            match_instance.win_oracle.as_ref(),
            &[match_instance.bump],
        ];

        if let Some(to) = tfer.to {
            let dest_acct_info = destination_token_account.to_account_info();
            if to != destination_token_account.key() {
                assert_is_ata(&dest_acct_info, &to, &token_mint.key(), None)?;
            }

            spl_token_transfer(TokenTransferParams {
                source: token_account_escrow.to_account_info(),
                destination: dest_acct_info,
                amount: tfer.amount,
                authority: match_instance.to_account_info(),
                authority_signer_seeds: match_seeds,
                token_program: token_program.to_account_info(),
            })?;
        } else {
            spl_token_burn(TokenBurnParams {
                mint: token_mint.to_account_info(),
                source: token_account_escrow.to_account_info(),
                amount: tfer.amount,
                authority: match_instance.to_account_info(),
                authority_signer_seeds: Some(match_seeds),
                token_program: token_program.to_account_info(),
            })?;
        }
        msg!("4");

        if time_to_close {
            close_token_account(
                &token_account_escrow.to_account_info(),
                &original_sender.to_account_info(),
                token_program,
                &match_instance.to_account_info(),
                match_seeds,
            )?;
            match_instance.token_types_removed = match_instance
                .token_types_removed
                .checked_add(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        match_instance.current_token_transfer_index = match_instance
            .current_token_transfer_index
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        return Ok(());
    }

    pub fn join_match<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, JoinMatch<'info>>,
        args: JoinMatchArgs,
    ) -> Result<()> {
        let match_instance = &mut ctx.accounts.match_instance;
        let token_account_escrow = &ctx.accounts.token_account_escrow;
        let source_token_account = &ctx.accounts.source_token_account;
        let token_transfer_authority = &ctx.accounts.token_transfer_authority;
        let token_mint = &ctx.accounts.token_mint;
        let payer = &mut ctx.accounts.payer;
        let token_program = &ctx.accounts.token_program;
        let validation_program = &ctx.accounts.validation_program;
        let source_item_or_player_pda = &ctx.accounts.source_item_or_player_pda;
        let source_info = source_token_account.to_account_info();
        let token_info = token_program.to_account_info();

        let JoinMatchArgs {
            amount,
            token_entry_validation_proof,
            token_entry_validation,
            ..
        } = args;

        assert_is_ata(
            &source_info,
            &payer.key(),
            &token_mint.key(),
            Some(&token_transfer_authority.key()),
        )?;

        if match_instance.join_allowed_during_start {
            require!(
                match_instance.state == MatchState::Initialized
                    || match_instance.state == MatchState::Started,
                CannotEnterMatch
            );
        } else {
            require!(
                match_instance.state == MatchState::Initialized,
                CannotEnterMatch
            );
        }

        if let Some(proof) = token_entry_validation_proof {
            if let Some(root) = &match_instance.token_entry_validation_root {
                if let Some(validation) = token_entry_validation {
                    let chief_node = anchor_lang::solana_program::keccak::hashv(&[
                        &[0x00],
                        &AnchorSerialize::try_to_vec(&validation)?,
                    ]);
                    require!(verify(&proof, &root.root, chief_node.0), InvalidProof);
                    if !is_valid_validation(
                        &validation,
                        source_item_or_player_pda,
                        token_mint,
                        validation_program,
                    )? {
                        return Err(error!(ErrorCode::InvalidValidation));
                    }
                } else {
                    return Err(error!(ErrorCode::MustPassUpObject));
                }
            } else {
                return Err(error!(ErrorCode::RootNotPresent));
            }
        } else if let Some(val_arr) = &match_instance.token_entry_validation {
            let mut validation = false;
            for val in val_arr {
                if is_valid_validation(
                    &val,
                    source_item_or_player_pda,
                    token_mint,
                    validation_program,
                )? {
                    validation = true;
                    break;
                }
            }
            if !validation {
                return Err(error!(ErrorCode::NoValidValidationFound));
            }
        };

        spl_token_transfer(TokenTransferParams {
            source: source_info,
            destination: token_account_escrow.to_account_info(),
            amount,
            authority: token_transfer_authority.to_account_info(),
            authority_signer_seeds: &[],
            token_program: token_info,
        })?;

        match_instance.token_types_added = match_instance
            .token_types_added
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(args: CreateMatchArgs)]
pub struct CreateMatch<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), args.win_oracle.as_ref()], bump, payer=payer, space=args.space as usize, constraint=args.space >= MIN_MATCH_SIZE as u64)]
    match_instance: Account<'info, Match>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(args: UpdateMatchArgs)]
pub struct UpdateMatch<'info> {
    #[account(mut, constraint=match_instance.authority == authority.key(), seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    #[account(constraint=win_oracle.key() == match_instance.win_oracle)]
    win_oracle: UncheckedAccount<'info>,
    authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateMatchFromOracle<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    #[account(constraint=win_oracle.key() == match_instance.win_oracle)]
    win_oracle: UncheckedAccount<'info>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct DrainMatch<'info> {
    #[account(mut, constraint=match_instance.authority == authority.key(), seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    authority: Signer<'info>,
    receiver: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(args: DrainOracleArgs)]
pub struct DrainOracle<'info> {
    #[account(seeds=[PREFIX.as_bytes(), oracle.key().as_ref()], bump=args.match_bump)]
    match_instance: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), authority.key().as_ref(), args.seed.as_ref()], bump = args.oracle_bump)]
    oracle: Account<'info, WinOracle>,
    authority: Signer<'info>,
    #[account(mut)]
    receiver: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(args: JoinMatchArgs)]
pub struct JoinMatch<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Box<Account<'info, Match>>,
    token_transfer_authority: Signer<'info>,
    #[account(init_if_needed, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), token_mint.key().as_ref(), source_token_account.owner.as_ref()], bump=args.escrow_bump, token::mint = token_mint, token::authority = match_instance, payer=payer)]
    token_account_escrow: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    token_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint=source_token_account.mint == token_mint.key())]
    source_token_account: Box<Account<'info, TokenAccount>>,
    // set to system if none
    source_item_or_player_pda: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    validation_program: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(args: DisburseTokensByOracleArgs)]
pub struct DisburseTokensByOracle<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), token_mint.key().as_ref(), original_sender.key().as_ref()], bump=args.escrow_bump)]
    token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    token_mint: Account<'info, Mint>,
    #[account(mut, constraint=destination_token_account.mint == token_mint.key())]
    destination_token_account: Account<'info, TokenAccount>,
    #[account(constraint=win_oracle.key() == match_instance.win_oracle)]
    win_oracle: Box<Account<'info, WinOracle>>,
    #[account(mut)]
    original_sender: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(args: DisburseTokensByOracleArgs)]
pub struct DisbursePlayerTokensByOracle<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), player_token_mint.key().as_ref(), original_sender.key().as_ref()], bump=args.escrow_bump)]
    player_token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    player_token_mint: Account<'info, Mint>,
    #[account(mut)]
    token_mint: Account<'info, Mint>,
    #[account(mut, constraint=player_item_token_account.mint == token_mint.key())]
    player_item_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint=destination_token_account.mint == token_mint.key())]
    destination_token_account: Account<'info, TokenAccount>,
    #[account(constraint=win_oracle.key() == match_instance.win_oracle)]
    win_oracle: UncheckedAccount<'info>,
    #[account(mut)]
    original_sender: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}
#[derive(Accounts)]
#[instruction(args: LeaveMatchArgs)]
pub struct LeaveMatch<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    receiver: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), token_mint.key().as_ref(), receiver.key().as_ref()], bump=args.escrow_bump)]
    token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    token_mint: Account<'info, Mint>,
    #[account(mut, constraint=destination_token_account.mint == token_mint.key())]
    destination_token_account: Account<'info, TokenAccount>,
    token_program: Program<'info, Token>,
}

/// While not required to be an account owned by this program, we provide an easy
/// set of endpoitns to create oracles using the program if you don't want to do it yourself.
#[derive(Accounts)]
#[instruction(args: CreateOrUpdateOracleArgs)]
pub struct CreateOrUpdateOracle<'info> {
    #[account(init_if_needed, seeds=[PREFIX.as_bytes(), payer.key().as_ref(), args.seed.as_ref()], bump, payer=payer, space=args.space as usize)]
    oracle: Account<'info, WinOracle>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MatchState {
    Draft,
    Initialized,
    Started,
    Finalized,
    PaidOut,
    Deactivated,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum PermissivenessType {
    TokenHolder,
    ParentTokenHolder,
    UpdateAuthority,
    Anybody,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Root {
    root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum InheritanceState {
    NotInherited,
    Inherited,
    Overridden,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Callback {
    pub key: Pubkey,
    pub code: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidationArgs {
    // For enum detection on the other end.
    instruction: [u8; 8],
    extra_identifier: u64,
    token_validation: TokenValidation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
    inherited: InheritanceState,
}

pub const MIN_MATCH_SIZE: usize = 8 + // discriminator
32 + // win oracle
8 + // oracle cooldown
8 + // last oracle check
32 + // authority,
1 + // match state
1 + // leave allowed
1 + // min valid entry
1 + // bump
8 + // current token tfer index
8 + // token types added
8 + // token types removed
1 + // token_entry_validation
1; // token entry validation root

use anchor_spl::token::Token;

#[account]
pub struct Match {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    // Win oracle must always present some rewards struct
    // for redistributing items
    win_oracle: Pubkey,
    win_oracle_cooldown: u64,
    last_oracle_check: u64,
    authority: Pubkey,
    state: MatchState,
    leave_allowed: bool,
    minimum_allowed_entry_time: Option<u64>,
    bump: u8,
    /// Increased by 1 every time the next token transfer
    /// in the win oracle is completed.
    current_token_transfer_index: u64,
    token_types_added: u64,
    token_types_removed: u64,
    token_entry_validation: Option<Vec<TokenValidation>>,
    token_entry_validation_root: Option<Root>,
    join_allowed_during_start: bool,
}

#[account]
pub struct PlayerWinCallbackBitmap {
    match_key: Pubkey,
}

// To transfer a player token, make it a Normal type
// and use it as the mint
// To transfer item from player a to b, use player to player
// and from and to are the player pubkeys, with item mint being mint
// To transfer item from player a to entrant b, use PlayerToEntrant
// from is the player pubkey, to is the wallet to which item is going.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenDelta {
    // Is either player pda, or original wallet that moved token in
    from: Pubkey,
    /// if no to, token is burned
    // can be player pda, or new wallet to send to.
    to: Option<Pubkey>,
    token_transfer_type: TokenTransferType,
    mint: Pubkey,
    amount: u64,
}
// Oracles must match this serde
#[account]
pub struct WinOracle {
    finalized: bool,
    token_transfer_root: Option<Root>,
    token_transfers: Option<Vec<TokenDelta>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TokenType {
    /// No missions explicitly.
    Player,
    Item,
    Any,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TokenTransferType {
    /// No missions explicitly.
    PlayerToPlayer,
    PlayerToEntrant,
    Normal,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Filter {
    None,
    All,
    Namespace { namespace: Pubkey },
    Parent { key: Pubkey },
    Mint { mint: Pubkey },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenValidation {
    filter: Filter,
    is_blacklist: bool,
    validation: Option<Callback>,
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
    #[msg("A match can only start in draft or initialized state")]
    InvalidStartingMatchState,
    #[msg("Match authority can only shift from Draft to Initialized or from Initialized/Started to Deactivated")]
    InvalidUpdateMatchState,
    #[msg("Cannot rely on an oracle until the match has been initialized or started")]
    InvalidOracleUpdate,
    #[msg("Cannot drain a match until it is in paid out or deactivated and all token accounts have been drained")]
    CannotDrainYet,
    #[msg("You can only leave deactivated or paid out matches, or initialized matches with leave_allowed on.")]
    CannotLeaveMatch,
    #[msg(
        "You must be the person who joined the match to leave it in initialized or started state."
    )]
    ReceiverMustBeSigner,
    #[msg("Public key mismatch")]
    PublicKeyMismatch,
    #[msg("To use an ata in this contract, please remove its delegate first")]
    AtaShouldNotHaveDelegate,
    #[msg("Can only enter matches in started or initialized state")]
    CannotEnterMatch,
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("Root not present on object")]
    RootNotPresent,
    #[msg("If using roots, must pass up the object you are proving is a member")]
    MustPassUpObject,
    #[msg("No valid validations found")]
    NoValidValidationFound,
    #[msg("Blacklisted")]
    Blacklisted,
    #[msg("Tokens are explicitly not allowed in this match")]
    NoTokensAllowed,
    #[msg("This validation will not let in this token")]
    InvalidValidation,
    #[msg("This oracle lacks any deltas")]
    NoDeltasFound,
    #[msg("Please use the player-specific endpoint for token transfers from a player")]
    UsePlayerEndpoint,
    #[msg("The original_sender argument does not match the from on the token delta")]
    FromDoesNotMatch,
    #[msg("Cannot give away more than is present in the token account")]
    CannotDeltaMoreThanAmountPresent,
    #[msg("Delta mint must match provided token mint account")]
    DeltaMintDoesNotMatch,
    #[msg("The given destination token account does not match the delta to field")]
    DestinationMismatch,
    #[msg("Match must be in finalized state to diburse")]
    MatchMustBeInFinalized,
    #[msg("ATA delegate mismatch")]
    AtaDelegateMismatch,
    #[msg("Oracle already finalized")]
    OracleAlreadyFinalized,
    #[msg("Oracle cooldown not over")]
    OracleCooldownNotPassed,
    #[msg("Match must be drained first")]
    MatchMustBeDrained,
    #[msg("No parent present")]
    NoParentPresent,
}
