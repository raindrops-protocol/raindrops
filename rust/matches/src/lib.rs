pub mod utils;

use {
    crate::utils::{
        assert_derivation, assert_initialized, assert_owned_by, create_or_allocate_account_raw,
        get_mask_and_index_for_seq, spl_token_burn, spl_token_mint_to, spl_token_transfer,
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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateMatchArgs {
    match_state: MatchState,
    token_entry_validation_root: Option<Root>,
    token_entry_validation: Option<Vec<TokenValidation>>,
    win_oracle: Pubkey,
    win_oracle_cooldown: u64,
    authority: Pubkey,
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
    receiver: Signer<'info>,
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
    receiver: Signer<'info>,
    // cant be stolen to a different craft item token account due to seed by token key
    #[account(mut, seeds=[PREFIX.as_bytes(), match_instance.win_oracle.as_ref(), token_mint.key().as_ref(), receiver.key().as_ref()], bump=args.escrow_bump)]
    token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    token_mint: Account<'info, Mint>,
    #[account(mut, constraint=token_account.mint == token_mint.key())]
    token_account: Account<'info, TokenAccount>,
    token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum MatchState {
    Draft,
    Initialized,
    Started,
    Finalized,
    PaidOut,
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
    new_state: MatchState,
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
}
