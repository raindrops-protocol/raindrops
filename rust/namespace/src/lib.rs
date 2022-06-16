pub mod utils;

use {
    crate::utils::{
        assert_can_add_to_namespace, assert_initialized, assert_metadata_valid,
        assert_part_of_namespace, create_or_allocate_account_raw,
        inverse_indexed_bool_for_namespace, pull_namespaces,
    },
    anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize},
    anchor_spl::token::{Mint, Token, TokenAccount},
    std::str::FromStr,
};
anchor_lang::declare_id!("nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV");
pub const PLAYER_ID: &str = "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98";
pub const MATCH_ID: &str = "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98";
pub const ITEM_ID: &str = "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98";

pub const PREFIX: &str = "namespace";
const GATEKEEPER: &str = "gatekeeper";
const MAX_WHITELIST: usize = 5;
const MAX_CACHED_ITEMS: usize = 100;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeNamespaceArgs {
    desired_namespace_array_size: u64,
    uuid: String,
    pretty_name: String,
    permissiveness_settings: PermissivenessSettings,
    whitelisted_staking_mints: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateNamespaceArgs {
    pretty_name: Option<String>,
    permissiveness_settings: Option<PermissivenessSettings>,
    whitelisted_staking_mints: Option<Vec<Pubkey>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CacheArtifactArgs {
    page: u64,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UncacheArtifactArgs {
    page: u64,
}

#[program]
pub mod namespace {

    use super::*;
    pub fn initialize_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, InitializeNamespace<'info>>,
        args: InitializeNamespaceArgs,
    ) -> Result<()> {
        msg!("initialize_namespace");
        let InitializeNamespaceArgs {
            desired_namespace_array_size,
            uuid,
            pretty_name,
            permissiveness_settings,
            whitelisted_staking_mints,
        } = args;

        if uuid.len() > 6 {
            return Err(error!(ErrorCode::UUIDTooLong));
        }

        if pretty_name.len() > 32 {
            return Err(error!(ErrorCode::PrettyNameTooLong));
        }

        if whitelisted_staking_mints.len() > MAX_WHITELIST {
            return Err(error!(ErrorCode::WhitelistStakeListTooLong));
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

        msg!("assert_metadata_valid");
        assert_metadata_valid(metadata, Some(master_edition), &mint.key())?;

        if desired_namespace_array_size > 0 {
            let mut namespace_arr = vec![];

            for _n in 0..desired_namespace_array_size {
                namespace_arr.push(NamespaceAndIndex {
                    namespace: anchor_lang::solana_program::system_program::id(),
                    indexed: false,
                    inherited: InheritanceState::NotInherited,
                });
            }

            namespace.namespaces = Some(namespace_arr);
        } else {
            namespace.namespaces = None
        }

        namespace.bump = *ctx.bumps.get("namespace").unwrap();
        namespace.uuid = uuid;
        namespace.whitelisted_staking_mints = whitelisted_staking_mints;
        namespace.pretty_name = pretty_name;
        namespace.permissiveness_settings = permissiveness_settings;
        namespace.mint = mint.key();
        namespace.metadata = metadata.key();
        namespace.master_edition = master_edition.key();
        namespace.highest_page = 0;
        namespace.artifacts_cached = 0;
        namespace.artifacts_added = 0;

        msg!("ok");
        Ok(())
    }

    pub fn update_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, UpdateNamespace<'info>>,
        args: UpdateNamespaceArgs,
    ) -> Result<()> {
        let UpdateNamespaceArgs {
            pretty_name,
            permissiveness_settings,
            whitelisted_staking_mints,
        } = args;

        let namespace = &mut ctx.accounts.namespace;

        if let Some(ws_mints) = whitelisted_staking_mints {
            if ws_mints.len() > MAX_WHITELIST {
                return Err(error!(ErrorCode::WhitelistStakeListTooLong));
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
                return Err(error!(ErrorCode::PrettyNameTooLong));
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
        args: CacheArtifactArgs,
    ) -> Result<()> {
        let CacheArtifactArgs { page } = args;

        let namespace = &mut ctx.accounts.namespace;
        let index = &mut ctx.accounts.index;
        let prior_index = &ctx.accounts.prior_index;
        let artifact = &mut ctx.accounts.artifact;
        let index_info = index.to_account_info();
        let prior_index_info = prior_index.to_account_info();

        assert_part_of_namespace(artifact, namespace)?;

        if artifact.owner != &Pubkey::from_str(PLAYER_ID).unwrap()
            && artifact.owner != &Pubkey::from_str(MATCH_ID).unwrap()
            && artifact.owner != &Pubkey::from_str(ITEM_ID).unwrap()
            && artifact.owner != &id()
        {
            return Err(error!(ErrorCode::CanOnlyCacheValidRaindropsObjects));
        }

        if index_info.data_is_empty() {
            if prior_index_info.data_is_empty() {
                return Err(error!(
                    ErrorCode::PreviousIndexNeedsToExistBeforeCreatingThisOne
                ));
            } else if prior_index.caches.len() < MAX_CACHED_ITEMS {
                return Err(error!(ErrorCode::PreviousIndexNotFull));
            }
            let namespace_key = namespace.key();
            let page_str = page.to_string();
            let signer_seeds = [
                PREFIX.as_bytes(),
                namespace_key.as_ref(),
                page_str.as_bytes(),
                &[*ctx.bumps.get("index").unwrap()],
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
            return Err(error!(ErrorCode::IndexFull));
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
            return Err(error!(ErrorCode::AlreadyCached));
        }
        Ok(())
    }

    pub fn uncache_artifact<'info>(
        ctx: Context<'_, '_, '_, 'info, UncacheArtifact<'info>>,
        args: UncacheArtifactArgs,
    ) -> Result<()> {
        let UncacheArtifactArgs { page, .. } = args;
        let namespace = &mut ctx.accounts.namespace;
        let index = &mut ctx.accounts.index;
        let artifact = &mut ctx.accounts.artifact;
        let receiver = &mut ctx.accounts.receiver;

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
        _bump: u8,
    ) -> Result<()> {
        let namespace_gatekeeper = &mut ctx.accounts.namespace_gatekeeper;
        namespace_gatekeeper.bump = *ctx.bumps.get("namespace_gatekeeper").unwrap();
        Ok(())
    }

    pub fn add_to_namespace_gatekeeper<'info>(
        ctx: Context<'_, '_, '_, 'info, AddToNamespaceGatekeeper<'info>>,
        artifact_filter: ArtifactFilter,
    ) -> Result<()> {
        let namespace_gatekeeper = &mut ctx.accounts.namespace_gatekeeper;
        namespace_gatekeeper.artifact_filters.push(artifact_filter);
        Ok(())
    }

    pub fn remove_from_namespace_gatekeeper<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveFromNamespaceGatekeeper<'info>>,
        idx: u64,
    ) -> Result<()> {
        let namespace_gatekeeper = &mut ctx.accounts.namespace_gatekeeper;

        let mut new_arr = vec![];
        for i in 0..namespace_gatekeeper.artifact_filters.len() {
            if i != idx as usize {
                new_arr.push(namespace_gatekeeper.artifact_filters[i].clone())
            }
        }
        namespace_gatekeeper.artifact_filters = new_arr;
        Ok(())
    }

    pub fn leave_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, JoinNamespace<'info>>,
        _namespace_gatekeeper_bump: u8,
    ) -> Result<()> {
        let artifact = &mut ctx.accounts.artifact;
        let namespace = &mut ctx.accounts.namespace;

        let art_namespaces = pull_namespaces(artifact)?;

        if let Some(art_names) = art_namespaces {
            for n in &art_names {
                if n.namespace == namespace.key() {
                    if n.indexed {
                        return Err(error!(ErrorCode::ArtifactStillCached));
                    } else {
                        let mut new_vec = vec![];
                        for j in &art_names {
                            if j.namespace != namespace.key() {
                                new_vec.push(j)
                            }
                        }
                        let new_name = NamespaceAndIndex {
                            namespace: anchor_lang::solana_program::system_program::id(),
                            indexed: false,
                            inherited: InheritanceState::NotInherited,
                        };
                        new_vec.push(&new_name);
                        let mut data = artifact.data.borrow_mut();
                        data[8] = 1; // Option yes.
                        let mut start: usize = 0;
                        for j in 0..new_vec.len() {
                            let as_vec = new_vec[j].try_to_vec()?;
                            for byte in as_vec {
                                data[13 + start] = byte;
                                start += 1;
                            }
                        }
                        namespace.artifacts_added = namespace
                            .artifacts_added
                            .checked_sub(1)
                            .ok_or(ErrorCode::NumericalOverflowError)?;
                        return Ok(());
                    }
                }
            }
        }

        return Err(error!(ErrorCode::ArtifactNotPartOfNamespace));
    }

    pub fn join_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, JoinNamespace<'info>>,
        _namespace_gatekeeper_bump: u8,
    ) -> Result<()> {
        let namespace_gatekeeper = &ctx.accounts.namespace_gatekeeper;
        let artifact = &mut ctx.accounts.artifact;
        let token_holder = &ctx.accounts.token_holder;
        let namespace = &mut ctx.accounts.namespace;

        let mut art_namespaces =
            assert_can_add_to_namespace(artifact, token_holder, namespace, namespace_gatekeeper)?;

        if let Some(art_names) = &mut art_namespaces {
            let mut found = false;
            for n in 0..art_names.len() {
                if art_names[n].namespace == namespace.key() {
                    found = true;
                }
            }
            if !found {
                let mut most_recent_zero = false;
                let mut start: usize = 0;

                for mut n in art_names {
                    if n.namespace == anchor_lang::solana_program::system_program::id() {
                        most_recent_zero = true;
                        n.namespace = namespace.key();
                        n.indexed = false;
                        let mut data = artifact.data.borrow_mut();
                        data[8] = 1; // option yes
                        let as_vec = n.try_to_vec()?;
                        for byte in as_vec {
                            data[13 + start] = byte;
                            start += 1;
                        }

                        namespace.artifacts_added = namespace
                            .artifacts_added
                            .checked_add(1)
                            .ok_or(ErrorCode::NumericalOverflowError)?;
                        break;
                    }
                    start += NAMESPACE_AND_INDEX_SIZE;
                }
                if !most_recent_zero {
                    msg!("Out of space!");
                    return Err(error!(ErrorCode::CannotJoinNamespace));
                }
            }
        } else {
            msg!("Out of space! You did not allocate any space for namespaces.");
            return Err(error!(ErrorCode::CannotJoinNamespace));
        }
        Ok(())
    }

    pub fn item_validation<'info>(
        _ctx: Context<'_, '_, '_, 'info, ItemValidation<'info>>,
        _args: ValidationArgs,
    ) -> Result<()> {
        // Dummy
        Ok(())
    }

    pub fn match_validation<'info>(
        _ctx: Context<'_, '_, '_, 'info, MatchValidation<'info>>,
        _args: MatchValidationArgs,
    ) -> Result<()> {
        // Dummy
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
        namespaces: Vec<Pubkey>,
    },
    Category {
        namespace: Pubkey,
        category: Option<Vec<String>>,
    },
    Key {
        key: Pubkey,
        mint: Pubkey,
        metadata: Pubkey,
        edition: Option<Pubkey>,
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
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    pub mint: Pubkey,
    pub metadata: Pubkey,
    pub master_edition: Pubkey,
    pub uuid: String,
    pub pretty_name: String,
    pub artifacts_added: u64,
    pub highest_page: u64,
    pub artifacts_cached: u64,
    pub permissiveness_settings: PermissivenessSettings,
    pub bump: u8,
    pub whitelisted_staking_mints: Vec<Pubkey>,
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
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum InheritanceState {
    NotInherited,
    Inherited,
    Overridden,
}

pub const NAMESPACE_AND_INDEX_SIZE: usize = 34;

pub const MIN_NAMESPACE_SIZE: usize = 8 + // key
1 + // indexed
1 + // namespace array
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
32 * MAX_CACHED_ITEMS + // array space
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
#[instruction(args: InitializeNamespaceArgs)]
pub struct InitializeNamespace<'info> {
    #[account(
        init,
        seeds=[PREFIX.as_bytes(), mint.key().as_ref()],
        payer=payer,
        bump,
        space=args.desired_namespace_array_size as usize * NAMESPACE_AND_INDEX_SIZE + MIN_NAMESPACE_SIZE + 4)
    ]
    namespace: Account<'info, Namespace>,
    mint: Account<'info, Mint>,
    metadata: UncheckedAccount<'info>,
    master_edition: UncheckedAccount<'info>,

    #[account(mut)]
    payer: Signer<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateNamespace<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            namespace_token.mint.as_ref()
        ],
        bump=namespace.bump
    )]
    namespace: Account<'info, Namespace>,
    #[account(
        // Check to make sure the token owner is the signer, and that the token is an nft, decimals == 0
        constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1
    )]
    namespace_token: Account<'info, TokenAccount>,
    token_holder: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(space: usize)]
pub struct CreateNamespaceGatekeeper<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(init, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump, payer=payer, space=space)]
    namespace_gatekeeper: Account<'info, NamespaceGatekeeper>,
    token_holder: Signer<'info>,
    #[account(mut)]
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidationArgs {
    extra_identifier: u64,
    class_index: u64,
    index: u64,
    item_class_mint: Pubkey,
    amount: u64,
    usage_permissiveness_to_use: Option<u8>,
    usage_index: u16,
    // Use this if using roots
    usage_info: Option<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Callback {
    pub key: Pubkey,
    pub code: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenValidation {
    filter: TokenValidationFilter,
    is_blacklist: bool,
    validation: Option<Callback>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TokenValidationFilter {
    None,
    All,
    Namespace { namespace: Pubkey },
    Parent { key: Pubkey },
    Mint { mint: Pubkey },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MatchValidationArgs {
    extra_identifier: u64,
    token_validation: TokenValidation,
}

#[derive(Accounts)]
#[instruction(args: ValidationArgs)]
pub struct ItemValidation<'info> {
    item_class: UncheckedAccount<'info>,
    item: UncheckedAccount<'info>,
    item_account: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(args: MatchValidationArgs)]
pub struct MatchValidation<'info> {
    source_item_or_player_pda: UncheckedAccount<'info>,
    mint: UncheckedAccount<'info>,
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
#[instruction(args: CacheArtifactArgs)]
pub struct CacheArtifact<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), args.page.to_string().as_bytes()], bump=index.bump)]
    index: Account<'info, NamespaceIndex>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), args.page.checked_sub(1).ok_or(0).unwrap().to_string().as_bytes()], bump=prior_index.bump)]
    prior_index: Account<'info, NamespaceIndex>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}
#[derive(Accounts)]
#[instruction(args: UncacheArtifactArgs)]
pub struct UncacheArtifact<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), args.page.to_string().as_bytes()], bump=index.bump)]
    index: Account<'info, NamespaceIndex>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
    // Received of funds
    receiver: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
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
