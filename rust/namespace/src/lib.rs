pub mod utils;

use {
    crate::utils::{
        assert_derivation, assert_initialized, assert_metadata_valid, assert_owned_by,
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
    anchor_spl::token::{Mint, Token, TokenAccount},
    metaplex_token_metadata::instruction::{
        create_master_edition, create_metadata_accounts,
        mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
    },
    spl_token::instruction::{initialize_account2, mint_to},
};
anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");

const PREFIX: &str = "namespace";
const MAX_WHITELIST: usize = 5;
#[program]
pub mod namespace {
    use super::*;
    pub fn initialize_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, InitializeNamespace<'info>>,
        bump: u8,
        uuid: String,
        pretty_name: String,
        join_permissiveness: NamespaceJoinPermissiveness,
        whitelisted_staking_mints: Vec<Pubkey>,
    ) -> ProgramResult {
        if uuid.len() > 6 {
            return Err(ErrorCode::UUIDTooLong.into());
        }

        if pretty_name.len() > 32 {
            return Err(ErrorCode::PrettyNameTooLong.into());
        }

        if whitelisted_staking_mints.len() > MAX_WHITELIST {
            return Err(ErrorCode::WhitelistStakeListTooLong.into());
        }

        for n in 0..whitelisted_staking_mints.len() {
            let mint_account = &ctx.remaining_accounts[n];
            // Assert they are all real mints.
            let _mint: spl_token::state::Mint = assert_initialized(&mint_account)?;
        }

        let namespace = &mut ctx.accounts.namespace;
        let metadata = &ctx.accounts.metadata;
        let mint = &ctx.accounts.mint;
        let master_edition = &ctx.accounts.master_edition;

        assert_metadata_valid(metadata, Some(master_edition), &mint.key())?;

        namespace.bump = bump;
        namespace.uuid = uuid;
        namespace.whitelisted_staking_mints = whitelisted_staking_mints;
        namespace.pretty_name = namespace.pretty_name.to_string();
        namespace.join_permissiveness = join_permissiveness;
        namespace.metadata = metadata.key();
        namespace.master_edition = master_edition.key();
        namespace.highest_page = 0;
        namespace.items_cached = 0;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum NamespaceJoinPermissiveness {
    AnybodyCanJoin,
    TokenHolderMustCosign,
}

/// seed ['namespace', namespace program, mint]
#[account]
pub struct Namespace {
    mint: Pubkey,
    metadata: Pubkey,
    master_edition: Pubkey,
    uuid: String,
    pretty_name: String,
    highest_page: u64,
    items_cached: u64,
    join_permissiveness: NamespaceJoinPermissiveness,
    bump: u8,
    whitelisted_staking_mints: Vec<Pubkey>,
}

/// seed ['namespace', namespace program, mint, page number]
#[account]
pub struct NamespaceIndex {
    pub namespace: Pubkey,
    pub page: u64,
    pub caches: Vec<Pubkey>,
}

pub const NAMESPACE_SIZE: usize = 8 + // key
32 + // mint
32 + // metadata
32 + // edition
6 + // uuid
32 + // pretty name
8 + // highest page
8 + // items cached
1 + // join permissiveness
1 + // bump
5 + // whitelist staking mints
200; // padding

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeNamespace<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), mint.key().as_ref()], payer=payer, bump=bump, space=NAMESPACE_SIZE)]
    namespace: Account<'info, Namespace>,
    mint: Account<'info, Mint>,
    metadata: UncheckedAccount<'info>,
    master_edition: UncheckedAccount<'info>,
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct UpdateNamespace<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key())]
    namespace_token: Account<'info, TokenAccount>,
    token_holder: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, index_bump: u8, page: u64)]
pub struct CacheArtifact<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key())]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), page.to_string().as_bytes()], bump=index_bump)]
    index: Account<'info, NamespaceIndex>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    token_holder: Signer<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
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
    #[msg("UUID too long, 6 char max")]
    UUIDTooLong,
    #[msg("Pretty name too long, 32 char max")]
    PrettyNameTooLong,
    #[msg("Whitelist stake list too long, 5 max")]
    WhitelistStakeListTooLong,
    #[msg("Metadata doesnt exist")]
    MetadataDoesntExist,
    #[msg("Edition doesnt exist")]
    EditionDoesntExist,
}
