pub mod utils;

use {
    crate::utils::{
        assert_derivation, assert_initialized, assert_is_ata, assert_owned_by, close_token_account,
        create_or_allocate_account_raw, get_mask_and_index_for_seq, spl_token_burn,
        spl_token_mint_to, spl_token_transfer, TokenBurnParams, TokenTransferParams,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize,
    },
    anchor_spl::token::{Mint, TokenAccount},
    metaplex_token_metadata::instruction::{
        create_master_edition, create_metadata_accounts,
        mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
    },
    spl_token::instruction::{initialize_account2, mint_to},
};
anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const PREFIX: &str = "matches";

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
    minimum_allowed_entry_time: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JoinMatchArgs {
    amount: u64,
    escrow_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LeaveMatchArgs {
    amount: u64,
    escrow_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DisburseTokensByOracleArgs {
    escrow_bump: u8,
    original_sender: Pubkey,
}

#[program]
pub mod matches {
    use super::*;

    pub fn create_match<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateMatch<'info>>,
        args: CreateMatchArgs,
    ) -> ProgramResult {
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

        match_instance.bump = match_bump;
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
    ) -> ProgramResult {
        let UpdateMatchArgs {
            match_state,
            token_entry_validation_root,
            token_entry_validation,
            authority,
            win_oracle_cooldown,
            leave_allowed,
            minimum_allowed_entry_time,
            ..
        } = args;

        let match_instance = &mut ctx.accounts.match_instance;

        match match_instance.state {
            MatchState::Draft => {
                require!(
                    match_state == MatchState::Initialized,
                    InvalidUpdateMatchState
                )
            }
            MatchState::Initialized => {
                require!(match_state == MatchState::Started, InvalidUpdateMatchState)
            }
            MatchState::Started => {
                require!(
                    match_state == MatchState::Deactivated,
                    InvalidUpdateMatchState
                )
            }
            MatchState::Finalized => return Err(ErrorCode::InvalidUpdateMatchState.into()),
            MatchState::PaidOut => return Err(ErrorCode::InvalidUpdateMatchState.into()),
            MatchState::Deactivated => return Err(ErrorCode::InvalidUpdateMatchState.into()),
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

        Ok(())
    }

    pub fn update_match_from_oracle<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateMatchFromOracle<'info>>,
    ) -> ProgramResult {
        let match_instance = &mut ctx.accounts.match_instance;
        let win_oracle = &ctx.accounts.win_oracle;

        let win_oracle_instance: WinOracle =
            AnchorDeserialize::try_from_slice(&win_oracle.data.borrow())?;

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

        Ok(())
    }

    pub fn drain_match<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainMatch<'info>>,
    ) -> ProgramResult {
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
    ) -> ProgramResult {
        let match_instance = &mut ctx.accounts.match_instance;
        let token_account_escrow = &ctx.accounts.token_account_escrow;
        let destination_token_account = &ctx.accounts.token_account_escrow;
        let token_mint = &ctx.accounts.token_mint;
        let receiver = &mut ctx.accounts.receiver;
        let token_program = &ctx.accounts.token_program;
        let destination_info = destination_token_account.to_account_info();
        let token_escrow_info = token_account_escrow.to_account_info();
        let match_info = match_instance.to_account_info();
        let token_info = token_program.to_account_info();
        let receiver_info = receiver.to_account_info();

        assert_is_ata(&destination_info, &receiver.key(), &token_mint.key())?;

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
            .checked_sub(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(args: CreateMatchArgs)]
pub struct CreateMatch<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), args.win_oracle.as_ref()], bump=args.match_bump, payer=payer, space=args.space as usize, constraint=args.space >= MIN_MATCH_SIZE as u64)]
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
    #[account(constraint=win_oracle.key() == match_instance.key())]
    win_oracle: UncheckedAccount<'info>,
    authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateMatchFromOracle<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    #[account(constraint=win_oracle.key() == match_instance.win_oracle)]
    win_oracle: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct DrainMatch<'info> {
    #[account(mut, constraint=match_instance.authority == authority.key(), seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    authority: Signer<'info>,
    receiver: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(args: JoinMatchArgs)]
pub struct JoinMatch<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    token_transfer_authority: Signer<'info>,
    #[account(init_if_needed, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), token_mint.key().as_ref(), token_account.owner.as_ref()], bump=args.escrow_bump, token::mint = token_mint, token::authority = match_instance, payer=payer)]
    token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    token_mint: Account<'info, Mint>,
    #[account(mut, constraint=token_account.mint == token_mint.key())]
    token_account: Account<'info, TokenAccount>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(args: DisburseTokensByOracleArgs)]
pub struct DisburseTokensByOracle<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), token_mint.key().as_ref(), args.original_sender.as_ref()], bump=args.escrow_bump)]
    token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    token_mint: Account<'info, Mint>,
    #[account(mut, constraint=destination_token_account.mint == token_mint.key())]
    destination_token_account: Account<'info, TokenAccount>,
    #[account(constraint=win_oracle.key() == match_instance.win_oracle)]
    win_oracle: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(args: DisburseTokensByOracleArgs)]
pub struct DisbursePlayerTokensByOracle<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref()], bump=match_instance.bump)]
    match_instance: Account<'info, Match>,
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), player_token_mint.key().as_ref(), args.original_sender.as_ref()], bump=args.escrow_bump)]
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
pub struct Callback(pub Pubkey, pub u64);

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
    inherited: InheritanceState,
}

pub const MIN_MATCH_SIZE: usize = 8 + // discriminator
32 + // win oracle
8 + // oracle cooldown
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
}

#[account]
pub struct PlayerWinCallbackBitmap {
    match_key: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenDelta {
    from: Pubkey,
    /// if no to, token is burned
    to: Option<Pubkey>,
    token_type: TokenType,
    callback: Option<Callback>,
    mint: Pubkey,
    amount: u64,
}
// Oracles must match this serde
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WinOracle {
    finalized: bool,
    token_transfer_root: Option<Root>,
    token_transfers: Option<Vec<TokenDelta>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TokenType {
    /// No missions explicitly.
    Player,
    Item,
    Any,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Filter {
    None,
    All,
    Namespace { namespace: Pubkey },
    Key { key: Pubkey, index: u64 },
    Mint { mint: Pubkey },
}

#[account]
pub struct TokenValidation {
    filter: Filter,
    token_type: TokenType,
    is_blacklist: bool,
    callback: Option<Callback>,
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
}
