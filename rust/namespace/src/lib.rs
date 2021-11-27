pub mod utils;

use {
    crate::utils::{
        assert_can_add_to_namespace, assert_derivation, assert_initialized, assert_metadata_valid,
        assert_owned_by, assert_part_of_namespace, create_or_allocate_account_raw,
        get_mask_and_index_for_seq, inverse_indexed_bool_for_namespace, pull_namespaces,
        spl_token_burn, spl_token_mint_to, spl_token_transfer, TokenBurnParams,
        TokenTransferParams,
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
    arrayref::{array_mut_ref, array_ref},
    metaplex_token_metadata::instruction::{
        create_master_edition, create_metadata_accounts,
        mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
    },
    spl_token::instruction::{initialize_account2, mint_to},
    std::str::FromStr,
};
anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const PLAYER_ID: Pubkey = Pubkey::from_str("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const MATCH_ID: Pubkey = Pubkey::from_str("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const ITEM_ID: Pubkey = Pubkey::from_str("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const MAX_NAMESPACES: usize = 5;

const PREFIX: &str = "namespace";
const GATEKEEPER: &str = "gatekeeper";
const MAX_WHITELIST: usize = 5;
const MAX_CACHED_ITEMS: usize = 100;
#[program]
pub mod namespace {

    use utils::pull_namespaces;

    use super::*;
    pub fn initialize_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, InitializeNamespace<'info>>,
        bump: u8,
        uuid: String,
        pretty_name: String,
        permissiveness_settings: PermissivenessSettings,
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

        let mut namespace_arr = vec![];
        for _n in 0..MAX_NAMESPACES {
            namespace_arr.push(NamespaceAndIndex {
                namespace: anchor_lang::solana_program::system_program::id(),
                indexed: false,
            });
        }

        namespace.namespaces = ArtifactNamespaceSetting {
            namespaces: namespace_arr,
        };
        namespace.bump = bump;
        namespace.uuid = uuid;
        namespace.whitelisted_staking_mints = whitelisted_staking_mints;
        namespace.pretty_name = namespace.pretty_name.to_string();
        namespace.permissiveness_settings = permissiveness_settings;
        namespace.metadata = metadata.key();
        namespace.master_edition = master_edition.key();
        namespace.highest_page = 0;
        namespace.artifacts_cached = 0;
        namespace.artifacts_added = 0;

        Ok(())
    }

    pub fn update_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, UpdateNamespace<'info>>,
        pretty_name: Option<String>,
        permissiveness_settings: Option<PermissivenessSettings>,
        whitelisted_staking_mints: Option<Vec<Pubkey>>,
    ) -> ProgramResult {
        let namespace = &mut ctx.accounts.namespace;

        if let Some(ws_mints) = whitelisted_staking_mints {
            if ws_mints.len() > MAX_WHITELIST {
                return Err(ErrorCode::WhitelistStakeListTooLong.into());
            }
            for n in 0..ws_mints.len() {
                let mint_account = &ctx.remaining_accounts[n];
                // Assert they are all real mints.
                let _mint: spl_token::state::Mint = assert_initialized(&mint_account)?;
            }
            namespace.whitelisted_staking_mints = ws_mints;
        }
        if let Some(pn) = pretty_name {
            if pn.len() > 32 {
                return Err(ErrorCode::PrettyNameTooLong.into());
            }
            namespace.pretty_name = pn.to_string();
        }

        if let Some(permissiveness) = permissiveness_settings {
            namespace.permissiveness_settings = permissiveness;
        }

        Ok(())
    }

    pub fn cache_artifact<'info>(
        ctx: Context<'_, '_, '_, 'info, CacheArtifact<'info>>,
        index_bump: u8,
        prior_index_bump: u8,
        page: u64,
    ) -> ProgramResult {
        let namespace = &mut ctx.accounts.namespace;
        let index = &mut ctx.accounts.index;
        let prior_index = &ctx.accounts.prior_index;
        let artifact = &mut ctx.accounts.artifact;
        let index_info = index.to_account_info();
        let prior_index_info = prior_index.to_account_info();
        let artifact_info = artifact.to_account_info();

        assert_part_of_namespace(artifact, namespace)?;

        if artifact.owner != &PLAYER_ID
            && artifact.owner != &MATCH_ID
            && artifact.owner != &ITEM_ID
            && artifact.owner != &id()
        {
            return Err(ErrorCode::CanOnlyCacheValidRaindropsObjects.into());
        }

        if index_info.data_is_empty() {
            if prior_index_info.data_is_empty() {
                return Err(ErrorCode::PreviousIndexNeedsToExistBeforeCreatingThisOne.into());
            } else if prior_index.caches.len() < MAX_CACHED_ITEMS {
                return Err(ErrorCode::PreviousIndexNotFull.into());
            }
            let namespace_key = namespace.key();
            let page_str = page.to_string();
            let signer_seeds = [
                PREFIX.as_bytes(),
                namespace_key.as_ref(),
                page_str.as_bytes(),
                &[index_bump],
            ];
            create_or_allocate_account_raw(
                *ctx.program_id,
                &index_info,
                &ctx.accounts.rent.to_account_info(),
                &ctx.accounts.system_program,
                &ctx.accounts.payer,
                INDEX_SIZE,
                &signer_seeds,
            )?;
        } else if index.caches.len() >= MAX_CACHED_ITEMS {
            return Err(ErrorCode::IndexFull.into());
        }

        namespace.artifacts_cached = namespace
            .artifacts_cached
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;
        if page > namespace.highest_page {
            namespace.highest_page = page
        }
        index.page = page;
        index.namespace = namespace.key();
        index.caches.push(artifact.key());

        let old_val = inverse_indexed_bool_for_namespace(artifact, namespace.key())?;
        if old_val == 1 {
            return Err(ErrorCode::AlreadyCached.into());
        }
        Ok(())
    }

    pub fn uncache_artifact<'info>(
        ctx: Context<'_, '_, '_, 'info, UncacheArtifact<'info>>,
        page: u64,
        _namespace_gatekeeper_bump: u8,
    ) -> ProgramResult {
        let namespace = &mut ctx.accounts.namespace;
        let index = &mut ctx.accounts.index;
        let artifact = &mut ctx.accounts.artifact;
        let receiver = &mut ctx.accounts.receiver;
        let artifact_info = artifact.to_account_info();

        assert_part_of_namespace(artifact, namespace)?;

        let mut found = false;
        let mut new_arr = vec![];
        for obj in &index.caches {
            if obj != &artifact.key() {
                new_arr.push(obj);
            } else {
                found = true;
            }
        }

        if found {
            inverse_indexed_bool_for_namespace(artifact, namespace.key())?;
            namespace.artifacts_cached = namespace
                .artifacts_cached
                .checked_sub(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        if page == namespace.highest_page && index.caches.len() == 0 {
            namespace.highest_page = page
                .checked_sub(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            let curr_lamp = index.to_account_info().lamports();
            **index.to_account_info().lamports.borrow_mut() = 0;

            **receiver.lamports.borrow_mut() = receiver
                .lamports()
                .checked_add(curr_lamp)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        Ok(())
    }

    pub fn create_namespace_gatekeeper<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateNamespaceGatekeeper<'info>>,
        bump: u8,
    ) -> ProgramResult {
        let mut namespace_gatekeeper = &ctx.accounts.namespace_gatekeeper;
        namespace_gatekeeper.bump = bump;
        Ok(())
    }

    pub fn add_to_namespace_gatekeeper<'info>(
        ctx: Context<'_, '_, '_, 'info, AddToNamespaceGatekeeper<'info>>,
        artifact_filter: ArtifactFilter,
    ) -> ProgramResult {
        let mut namespace_gatekeeper = &ctx.accounts.namespace_gatekeeper;
        namespace_gatekeeper.artifact_filters.push(artifact_filter);
        Ok(())
    }

    pub fn remove_from_namespace_gatekeeper<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveFromNamespaceGatekeeper<'info>>,
        idx: usize,
    ) -> ProgramResult {
        let mut namespace_gatekeeper = &ctx.accounts.namespace_gatekeeper;

        let new_arr = vec![];
        for i in 0..namespace_gatekeeper.artifact_filters.len() {
            if i != idx {
                new_arr.push(namespace_gatekeeper.artifact_filters[i])
            }
        }
        namespace_gatekeeper.artifact_filters = new_arr;
        Ok(())
    }

    pub fn leave_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, JoinNamespace<'info>>,
        _namespace_gatekeeper_bump: u8,
    ) -> ProgramResult {
        let namespace_gatekeeper = &ctx.accounts.namespace_gatekeeper;
        let artifact = &mut ctx.accounts.artifact;
        let token_holder = &ctx.accounts.token_holder;
        let namespace = &mut ctx.accounts.namespace;

        let mut art_namespaces = pull_namespaces(artifact)?;

        for n in art_namespaces.namespaces {
            if n.namespace == namespace.key() {
                if n.indexed {
                    return Err(ErrorCode::ArtifactStillCached.into());
                } else {
                    let mut new_vec = vec![];
                    for j in art_namespaces.namespaces {
                        if j.namespace != namespace.key() {
                            new_vec.push(j)
                        }
                    }
                    new_vec.push(NamespaceAndIndex {
                        namespace: anchor_lang::solana_program::system_program::id(),
                        indexed: false,
                    });
                    let mut data = artifact.data.borrow_mut();
                    let arr =
                        array_mut_ref![data, 8, NAMESPACE_AND_INDEX_SIZE * MAX_NAMESPACES + 4];

                    arr.copy_from_slice(&art_namespaces.try_to_vec()?);
                    namespace.artifacts_added = namespace
                        .artifacts_added
                        .checked_sub(1)
                        .ok_or(ErrorCode::NumericalOverflowError)?;
                    return Ok(());
                }
            }
        }

        return Err(ErrorCode::ArtifactNotPartOfNamespace.into());
    }

    pub fn join_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, JoinNamespace<'info>>,
        _namespace_gatekeeper_bump: u8,
    ) -> ProgramResult {
        let namespace_gatekeeper = &ctx.accounts.namespace_gatekeeper;
        let artifact = &mut ctx.accounts.artifact;
        let token_holder = &ctx.accounts.token_holder;
        let namespace = &mut ctx.accounts.namespace;

        let mut art_namespaces =
            assert_can_add_to_namespace(artifact, token_holder, namespace, namespace_gatekeeper)?;

        let found = false;
        for n in art_namespaces.namespaces {
            if n.namespace == namespace.key() {
                found = true;
            }
        }
        if !found {
            let mut most_recent_zero = None;
            for n in art_namespaces.namespaces {
                if n.namespace == anchor_lang::solana_program::system_program::id() {
                    most_recent_zero = Some(n);
                    break;
                }
            }
            if let Some(mrz) = most_recent_zero {
                mrz.namespace = namespace.key();
                mrz.indexed = false;
                let mut data = artifact.data.borrow_mut();
                let arr = array_mut_ref![data, 8, NAMESPACE_AND_INDEX_SIZE * MAX_NAMESPACES + 4];

                arr.copy_from_slice(&art_namespaces.try_to_vec()?);
                namespace.artifacts_added = namespace
                    .artifacts_added
                    .checked_add(1)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
            } else {
                msg!("Out of space!");
                return Err(ErrorCode::CannotJoinNamespace.into());
            }
        }
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Permissiveness {
    All,
    Whitelist,
    Blacklist,
    Namespace,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ArtifactType {
    Player,
    Item,
    Mission,
    Namespace,
}

pub const MAX_FILTER_SLOTS: usize = 5;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Filter {
    Namespace {
        namespaces: Vec<Pubkey>, //
        padding: [u8; FILTER_SIZE - MAX_FILTER_SLOTS * 32],
    },
    Category {
        namespace: Pubkey,
        category: Option<Vec<String>>,
        padding: [u8; 32],
        padding2: [u8; FILTER_SIZE - 1 - (25 * MAX_FILTER_SLOTS) - 32 - 32],
    },
    Key {
        key: Pubkey,
        mint: Pubkey,
        metadata: Pubkey,
        edition: Option<Pubkey>,
        padding: [u8; 32],
        padding2: [u8; FILTER_SIZE - 32 - 32 - 32 - 33 - 32],
    },
}

pub const FILTER_SIZE: usize = (MAX_FILTER_SLOTS + 1) * 32;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ArtifactFilter {
    filter: Filter,
    token_type: ArtifactType,
}

#[account]
pub struct NamespaceGatekeeper {
    bump: u8,
    artifact_filters: Vec<ArtifactFilter>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PermissivenessSettings {
    namespace_permissiveness: Permissiveness,
    item_permissiveness: Permissiveness,
    player_permissiveness: Permissiveness,
    match_permissiveness: Permissiveness,
    mission_permissiveness: Permissiveness,
    cache_permissiveness: Permissiveness,
}

/// seed ['namespace', namespace program, mint]
#[account]
pub struct Namespace {
    namespaces: ArtifactNamespaceSetting,
    mint: Pubkey,
    metadata: Pubkey,
    master_edition: Pubkey,
    uuid: String,
    pretty_name: String,
    artifacts_added: u64,
    highest_page: u64,
    artifacts_cached: u64,
    permissiveness_settings: PermissivenessSettings,
    bump: u8,
    whitelisted_staking_mints: Vec<Pubkey>,
}

/// seed ['namespace', namespace program, mint, page number]
#[account]
pub struct NamespaceIndex {
    pub namespace: Pubkey,
    pub bump: u8,
    pub page: u64,
    pub caches: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
}

pub const NAMESPACE_AND_INDEX_SIZE: usize = 33;
#[account]
pub struct ArtifactNamespaceSetting {
    namespaces: Vec<NamespaceAndIndex>,
}

pub const NAMESPACE_SIZE: usize = 8 + // key
1 + // indexed
33 + // namespace
32 + // mint
32 + // metadata
32 + // edition
6 + // uuid
32 + // pretty name
8 + // artifacts_added
8 + // highest page
8 + // artifacts cached
6 + // permissivenesses
1 + // bump
5 + // whitelist staking mints
200; // padding

pub const INDEX_SIZE: usize = 8 + // key
32 + // namespace
1 + // bump
8 + // page
4 + // amount in vec
32*MAX_CACHED_ITEMS + // array space
100; //padding

pub const ARTIFACT_FILTER_SIZE: usize = 8 + // key
1 + // indexed
33 + // namespace
1 + // is blacklist
FILTER_SIZE + //
1 + // artifact type
32 + // artifact
8 + // filter index
1 + // bump
100; //padding

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
pub struct UpdateNamespace<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    token_holder: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, space: usize)]
pub struct CreateNamespaceGatekeeper<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(init, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump=bump, payer=payer, space=space)]
    namespace_gatekeeper: Account<'info, NamespaceGatekeeper>,
    token_holder: Signer<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddToNamespaceGatekeeper<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump=namespace_gatekeeper.bump)]
    namespace_gatekeeper: Account<'info, NamespaceGatekeeper>,
    token_holder: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveFromNamespaceGatekeeper<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump=namespace_gatekeeper.bump)]
    namespace_gatekeeper: Account<'info, NamespaceGatekeeper>,
    token_holder: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(namespace_gatekeeper_bump: u8)]
pub struct JoinNamespace<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), PREFIX.as_bytes()], bump=namespace_gatekeeper_bump)]
    namespace_gatekeeper: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(namespace_gatekeeper_bump: u8)]
pub struct LeaveNamespace<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), PREFIX.as_bytes()], bump=namespace_gatekeeper_bump)]
    namespace_gatekeeper: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(index_bump: u8, prior_index_bump: u8, page: u64)]
pub struct CacheArtifact<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), page.to_string().as_bytes()], bump=index_bump)]
    index: Account<'info, NamespaceIndex>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), page.checked_sub(1).ok_or(0)?.to_string().as_bytes()], bump=prior_index_bump)]
    prior_index: Account<'info, NamespaceIndex>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}
#[derive(Accounts)]
#[instruction( page: u64)]
pub struct UncacheArtifact<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), page.to_string().as_bytes()], bump=index.bump)]
    index: Account<'info, NamespaceIndex>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
    // Received of funds
    receiver: UncheckedAccount<'info>,
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
    #[msg("Previous index needs to exist before creating this one")]
    PreviousIndexNeedsToExistBeforeCreatingThisOne,
    #[msg("The previous index is not full yet, so you cannot make a new one")]
    PreviousIndexNotFull,
    #[msg("Index is full")]
    IndexFull,
    #[msg("Can only cache valid raindrops artifacts (players, items, matches)")]
    CanOnlyCacheValidRaindropsObjects,
    #[msg("This artifact has already been cached")]
    AlreadyCached,
    #[msg("This artifact is not cached!")]
    NotCached,
    #[msg("This artifact is cached but not on this page")]
    NotCachedHere,
    #[msg("Artifact lacks namespace!")]
    ArtifactLacksNamespace,
    #[msg("Artifact not part of namespace!")]
    ArtifactNotPartOfNamespace,
    #[msg("You do not have permissions to join this namespace")]
    CannotJoinNamespace,
    #[msg("You cannot remove an artifact from a namespace while it is still cached there. Uncache it first.")]
    ArtifactStillCached,
}
