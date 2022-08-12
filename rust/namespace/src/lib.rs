pub mod utils;

use crate::utils::{
    assert_initialized, assert_metadata_valid, check_permissiveness_against_holder,
    lowest_available_page, pull_namespaces,
};
use anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize};
use anchor_spl::token::{Mint, Token, TokenAccount};
use raindrops_item::cpi::{
    accounts::{
        ItemClassCacheNamespace, ItemClassJoinNamespace, ItemClassLeaveNamespace,
        ItemClassUncacheNamespace,
    },
    item_class_cache_namespace, item_class_join_namespace, item_class_leave_namespace,
    item_class_uncache_namespace,
};

use raindrops_matches::cpi::{
    accounts::{
        MatchCacheNamespace, MatchJoinNamespace, MatchLeaveNamespace, MatchUncacheNamespace,
    },
    match_cache_namespace, match_join_namespace, match_leave_namespace, match_uncache_namespace,
};

anchor_lang::declare_id!("AguQatwNFEaZSFUHsTj5fcU3LdsNFQLrYSHQjZ4erC8X");

pub const PREFIX: &str = "namespace";
const GATEKEEPER: &str = "gatekeeper";
const MAX_WHITELIST: usize = 5;
const MAX_CACHED_ITEMS_PER_INDEX: usize = 100;

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
                    index: None,
                    inherited: InheritanceState::NotInherited,
                });
            }

            namespace.namespaces = Some(namespace_arr);
        } else {
            namespace.namespaces = None
        }
        msg!("{:?}", permissiveness_settings);

        namespace.bump = *ctx.bumps.get("namespace").unwrap();
        namespace.uuid = uuid;
        namespace.whitelisted_staking_mints = whitelisted_staking_mints;
        namespace.pretty_name = pretty_name;
        namespace.permissiveness_settings = permissiveness_settings;
        namespace.mint = mint.key();
        namespace.metadata = metadata.key();
        namespace.master_edition = master_edition.key();
        namespace.max_pages = 10;
        namespace.full_pages = Vec::with_capacity(namespace.max_pages as usize); // max 10 pages can be used for the cache
        namespace.artifacts_cached = 0;
        namespace.artifacts_added = 0;
        namespace.gatekeeper = None;

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
            if ws_mints.len() + namespace.whitelisted_staking_mints.len() > MAX_WHITELIST {
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
        let namespace = &mut ctx.accounts.namespace;
        let index = &mut ctx.accounts.index;
        let artifact = &mut ctx.accounts.artifact;

        // check artifact is joined to this namespace
        let mut in_namespace = false;
        let art_namespaces = pull_namespaces(&artifact).unwrap();
        for art_ns in art_namespaces {
            msg!("{}, {}", art_ns, namespace.key());
            if art_ns == namespace.key() {
                in_namespace = true;
            };
        }
        if !in_namespace {
            return Err(error!(ErrorCode::ArtifactLacksNamespace));
        }

        if artifact.owner != &raindrops_player::ID
            && artifact.owner != &raindrops_matches::ID
            && artifact.owner != &raindrops_item::ID
            && artifact.owner != &id()
        {
            return Err(error!(ErrorCode::CanOnlyCacheValidRaindropsObjects));
        }

        // if caches len is 0, it was just initialized
        if index.caches.len() == 0 {
            index.namespace = namespace.key();
            index.bump = *ctx.bumps.get("index").unwrap();
            index.page = args.page;
            index.caches = Vec::with_capacity(MAX_CACHED_ITEMS_PER_INDEX);
        };

        // if the current page is not the lowest available page error
        let lowest_available_page = lowest_available_page(&mut namespace.full_pages.clone())?;
        if index.page != lowest_available_page {
            return Err(error!(ErrorCode::PreviousIndexNotFull));
        };

        if lowest_available_page > namespace.max_pages {
            return Err(error!(ErrorCode::CacheFull));
        }

        // if we hit max items in the cache return an error
        if index.caches.len() >= MAX_CACHED_ITEMS_PER_INDEX {
            return Err(error!(ErrorCode::IndexFull));
        }

        // add item to cache
        index.caches.push(artifact.key());

        // if page is now full, add the page to the full_pages list
        if index.caches.len() == MAX_CACHED_ITEMS_PER_INDEX {
            msg!("{} page is full", index.page);
            namespace.full_pages.push(index.page);
        }

        namespace.artifacts_cached = namespace
            .artifacts_cached
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        let rd_program = ctx.accounts.raindrops_program.to_account_info();

        if raindrops_item::check_id(&rd_program.key()) {
            let accounts = ItemClassCacheNamespace {
                item_class: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            item_class_cache_namespace(CpiContext::new(rd_program, accounts), args.page)
        } else if raindrops_matches::check_id(&rd_program.key()) {
            let accounts = MatchCacheNamespace {
                match_instance: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            match_cache_namespace(CpiContext::new(rd_program, accounts), args.page)
        } else if crate::id().eq(&rd_program.key()) {
            let artifact_ns = &mut Account::<'_, Namespace>::try_from(&ctx.accounts.artifact)?;

            let mut cached = false;
            let mut new_namespaces: Vec<NamespaceAndIndex> = vec![];
            for ns in artifact_ns.namespaces.clone().unwrap() {
                if ns.namespace == namespace.key() && !cached {
                    cached = true;
                    new_namespaces.push(NamespaceAndIndex {
                        namespace: namespace.key(),
                        index: Some(index.page),
                        inherited: InheritanceState::NotInherited,
                    });
                } else {
                    msg!("else: {}", ns.namespace);
                    new_namespaces.push(ns);
                }
            }
            if !cached {
                return Err(error!(ErrorCode::CannotCacheArtifact));
            }
            artifact_ns.namespaces = Some(new_namespaces);
            artifact_ns.exit(&crate::id())
        } else {
            return Err(error!(ErrorCode::CannotCacheArtifact));
        }
    }

    pub fn uncache_artifact<'info>(
        ctx: Context<'_, '_, '_, 'info, UncacheArtifact<'info>>,
        args: UncacheArtifactArgs,
    ) -> Result<()> {
        let rd_program = ctx.accounts.raindrops_program.to_account_info();

        let namespace = &mut ctx.accounts.namespace;

        namespace.artifacts_cached = namespace
            .artifacts_cached
            .checked_sub(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        if raindrops_item::check_id(&rd_program.key()) {
            let accounts = ItemClassUncacheNamespace {
                item_class: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            item_class_uncache_namespace(CpiContext::new(rd_program, accounts))?;
        } else if raindrops_matches::check_id(&rd_program.key()) {
            let accounts = MatchUncacheNamespace {
                match_instance: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            match_uncache_namespace(CpiContext::new(rd_program, accounts))?;
        } else if crate::id().eq(&rd_program.key()) {
            let artifact_ns = &mut Account::<'_, Namespace>::try_from(&ctx.accounts.artifact)?;

            let mut uncached = false;
            let mut new_namespaces: Vec<NamespaceAndIndex> = vec![];
            for ns in artifact_ns.namespaces.clone().unwrap() {
                if ns.namespace == namespace.key() && !uncached {
                    uncached = true;
                    new_namespaces.push(NamespaceAndIndex {
                        namespace: namespace.key(),
                        index: None,
                        inherited: InheritanceState::NotInherited,
                    });
                } else {
                    new_namespaces.push(ns);
                }
            }
            if !uncached {
                return Err(error!(ErrorCode::CannotUncacheArtifact));
            }
            artifact_ns.namespaces = Some(new_namespaces);
            artifact_ns.exit(&crate::id()).unwrap();
        } else {
            return Err(error!(ErrorCode::CannotUncacheArtifact));
        }

        let UncacheArtifactArgs { page, .. } = args;

        // remove item from index
        let index = &mut ctx.accounts.index;
        let artifact_key = ctx.accounts.artifact.key();
        index.caches.retain(|&item| &item != &artifact_key);

        // if page was full, remove the page from full pages list
        namespace.full_pages.retain(|&i| i != page);

        return Ok(());
    }

    pub fn create_namespace_gatekeeper<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateNamespaceGatekeeper<'info>>,
    ) -> Result<()> {
        let namespace_gatekeeper = &mut ctx.accounts.namespace_gatekeeper;
        namespace_gatekeeper.bump = *ctx.bumps.get("namespace_gatekeeper").unwrap();
        namespace_gatekeeper.namespace = ctx.accounts.namespace.key();

        let namespace = &mut ctx.accounts.namespace;
        namespace.gatekeeper = Some(namespace_gatekeeper.key());
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
        artifact_filter: ArtifactFilter,
    ) -> Result<()> {
        let namespace_gatekeeper = &mut ctx.accounts.namespace_gatekeeper;
        namespace_gatekeeper
            .artifact_filters
            .retain(|item| item != &artifact_filter);
        Ok(())
    }

    pub fn leave_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, LeaveNamespace<'info>>,
    ) -> Result<()> {
        let rd_program = ctx.accounts.raindrops_program.to_account_info();

        let namespace = &mut ctx.accounts.namespace;

        namespace.artifacts_added = namespace
            .artifacts_added
            .checked_sub(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        if raindrops_item::check_id(&rd_program.key()) {
            check_permissiveness_against_holder(
                &rd_program.key(),
                &ctx.accounts.artifact,
                &ctx.accounts.token_holder,
                &ctx.accounts.namespace_gatekeeper,
                &namespace.permissiveness_settings.item_permissiveness,
            )?;

            let accounts = ItemClassLeaveNamespace {
                item_class: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            item_class_leave_namespace(CpiContext::new(rd_program, accounts))
        } else if raindrops_matches::check_id(&rd_program.key()) {
            check_permissiveness_against_holder(
                &rd_program.key(),
                &ctx.accounts.artifact,
                &ctx.accounts.token_holder,
                &ctx.accounts.namespace_gatekeeper,
                &namespace.permissiveness_settings.match_permissiveness,
            )?;

            let accounts = MatchLeaveNamespace {
                match_instance: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            match_leave_namespace(CpiContext::new(rd_program, accounts))
        } else if crate::id().eq(&rd_program.key()) {
            let artifact_ns = &mut Account::<'_, Namespace>::try_from(&ctx.accounts.artifact)?;

            let mut left = false;
            let mut new_namespaces: Vec<NamespaceAndIndex> = vec![];
            for ns in artifact_ns.namespaces.clone().unwrap() {
                if ns.namespace == namespace.key() && !left {
                    if ns.index != None {
                        return Err(error!(ErrorCode::CannotLeaveNamespace));
                    }
                    left = true;
                    new_namespaces.push(NamespaceAndIndex {
                        namespace: anchor_lang::solana_program::system_program::id(),
                        index: None,
                        inherited: InheritanceState::NotInherited,
                    });
                } else {
                    new_namespaces.push(ns);
                }
            }
            if !left {
                return Err(error!(ErrorCode::CannotLeaveNamespace));
            }
            artifact_ns.namespaces = Some(new_namespaces);
            artifact_ns.exit(&crate::id())
        } else {
            return Err(error!(ErrorCode::CannotLeaveNamespace));
        }
    }

    pub fn join_namespace<'info>(
        ctx: Context<'_, '_, '_, 'info, JoinNamespace<'info>>,
    ) -> Result<()> {
        let rd_program = ctx.accounts.raindrops_program.to_account_info();

        let namespace = &mut ctx.accounts.namespace;

        namespace.artifacts_added = namespace
            .artifacts_added
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        if raindrops_item::check_id(&rd_program.key()) {
            msg!("joining item to namespace");
            check_permissiveness_against_holder(
                &rd_program.key(),
                &ctx.accounts.artifact,
                &ctx.accounts.token_holder,
                &ctx.accounts.namespace_gatekeeper,
                &namespace.permissiveness_settings.item_permissiveness,
            )?;

            let accounts = ItemClassJoinNamespace {
                item_class: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            item_class_join_namespace(CpiContext::new(rd_program, accounts))?;
        } else if raindrops_matches::check_id(&rd_program.key()) {
            msg!("joining match to namespace");
            check_permissiveness_against_holder(
                &rd_program.key(),
                &ctx.accounts.artifact,
                &ctx.accounts.token_holder,
                &ctx.accounts.namespace_gatekeeper,
                &namespace.permissiveness_settings.match_permissiveness,
            )?;

            let accounts = MatchJoinNamespace {
                match_instance: ctx.accounts.artifact.to_account_info(),
                namespace: namespace.to_account_info(),
                instructions: ctx.accounts.instructions.to_account_info(),
            };

            match_join_namespace(CpiContext::new(rd_program, accounts))?;
        } else if crate::id().eq(&rd_program.key()) {
            msg!("joining namespace to namespace");
            check_permissiveness_against_holder(
                &rd_program.key(),
                &ctx.accounts.artifact,
                &ctx.accounts.token_holder,
                &ctx.accounts.namespace_gatekeeper,
                &namespace.permissiveness_settings.namespace_permissiveness,
            )?;

            let artifact_ns = &mut Account::<'_, Namespace>::try_from(&ctx.accounts.artifact)?;

            let mut joined = false;
            let mut new_namespaces: Vec<NamespaceAndIndex> = vec![];
            for ns in artifact_ns.namespaces.clone().unwrap() {
                if ns.namespace == anchor_lang::solana_program::system_program::id() && !joined {
                    joined = true;
                    new_namespaces.push(NamespaceAndIndex {
                        namespace: namespace.key(),
                        index: None,
                        inherited: InheritanceState::NotInherited,
                    });
                } else {
                    new_namespaces.push(ns);
                }
            }
            if !joined {
                return Err(error!(ErrorCode::CannotJoinNamespace));
            }
            msg!("writing to artifact_ns");
            artifact_ns.namespaces = Some(new_namespaces);
            artifact_ns.exit(&crate::id()).unwrap();
        } else {
            return Err(error!(ErrorCode::CannotJoinNamespace));
        }

        Ok(())
    }

    // FOR TESTING ONLY
    pub fn item_validation<'info>(
        _ctx: Context<'_, '_, '_, 'info, ItemValidation<'info>>,
        _args: ValidationArgs,
    ) -> Result<()> {
        // Dummy
        Ok(())
    }

    // FOR TESTING ONLY
    pub fn match_validation<'info>(
        _ctx: Context<'_, '_, '_, 'info, MatchValidation<'info>>,
        _args: MatchValidationArgs,
    ) -> Result<()> {
        // Dummy
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum Permissiveness {
    All,
    Whitelist,
    Blacklist,
    Namespace,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ArtifactType {
    Player,
    Item,
    Mission,
    Namespace,
}

pub const MAX_FILTER_SLOTS: usize = 5;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct ArtifactFilter {
    filter: Filter,
    token_type: ArtifactType,
}

#[account]
pub struct NamespaceGatekeeper {
    bump: u8,
    namespace: Pubkey,
    artifact_filters: Vec<ArtifactFilter>,
}

// TODO get this right
impl NamespaceGatekeeper {
    pub fn space() -> usize {
        8 + 1 + 32 + ARTIFACT_FILTER_SIZE
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
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
    pub max_pages: u64,
    pub full_pages: Vec<u64>,
    pub artifacts_cached: u64,
    pub permissiveness_settings: PermissivenessSettings,
    pub bump: u8,
    pub whitelisted_staking_mints: Vec<Pubkey>,
    pub gatekeeper: Option<Pubkey>,
}

/// seed ['namespace', namespace program, mint, page number]
#[account]
pub struct NamespaceIndex {
    pub namespace: Pubkey,
    pub bump: u8,
    pub page: u64,
    pub caches: Vec<Pubkey>,
}

impl NamespaceIndex {
    pub fn space() -> usize {
        8 + 32 + 1 + 8 + (4 + (32 * MAX_CACHED_ITEMS_PER_INDEX))
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    index: Option<u64>,
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
(4 + (8 * 10)) + // full pages, max 10 pages
8 + // artifacts cached
6 + // permissivenesses
1 + // bump
5 + // whitelist staking mints
1 + 32 + // Namespace gatekeeper optional pubkey
200; // padding

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
pub struct CreateNamespaceGatekeeper<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(init, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump, payer=payer, space=NamespaceGatekeeper::space())]
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
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump=namespace_gatekeeper.bump, has_one=namespace)]
    namespace_gatekeeper: Account<'info, NamespaceGatekeeper>,
    token_holder: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveFromNamespaceGatekeeper<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump=namespace_gatekeeper.bump, has_one=namespace)]
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
pub struct JoinNamespace<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump, has_one=namespace)]
    namespace_gatekeeper: Account<'info, NamespaceGatekeeper>,
    token_holder: UncheckedAccount<'info>,
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    instructions: UncheckedAccount<'info>,
    #[account(constraint=raindrops_program.key() == crate::id() || raindrops_program.key() == raindrops_item::id() || raindrops_program.key() == raindrops_player::id() || raindrops_program.key() == raindrops_matches::id())]
    raindrops_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct LeaveNamespace<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), GATEKEEPER.as_bytes()], bump, has_one=namespace)]
    namespace_gatekeeper: Account<'info, NamespaceGatekeeper>,
    token_holder: UncheckedAccount<'info>,
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    instructions: UncheckedAccount<'info>,
    #[account(constraint=raindrops_program.key() == crate::id() || raindrops_program.key() == raindrops_item::id() || raindrops_program.key() == raindrops_player::id() || raindrops_program.key() == raindrops_matches::id())]
    raindrops_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(args: CacheArtifactArgs)]
pub struct CacheArtifact<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(init_if_needed, payer = payer, space = NamespaceIndex::space(), seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), &args.page.to_le_bytes()], bump)]
    index: Account<'info, NamespaceIndex>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    instructions: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    #[account(constraint=raindrops_program.key() == crate::id() || raindrops_program.key() == raindrops_item::id() || raindrops_program.key() == raindrops_player::id() || raindrops_program.key() == raindrops_matches::id())]
    raindrops_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(args: UncacheArtifactArgs)]
pub struct UncacheArtifact<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace_token.mint.as_ref()], bump=namespace.bump)]
    namespace: Account<'info, Namespace>,
    #[account(constraint=namespace_token.owner == token_holder.key() && namespace_token.amount == 1)]
    namespace_token: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), namespace.key().as_ref(), &args.page.to_le_bytes()], bump=index.bump)]
    index: Account<'info, NamespaceIndex>,
    #[account(mut)]
    artifact: UncheckedAccount<'info>,
    token_holder: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    instructions: UncheckedAccount<'info>,
    #[account(constraint=raindrops_program.key() == crate::id() || raindrops_program.key() == raindrops_item::id() || raindrops_program.key() == raindrops_player::id() || raindrops_program.key() == raindrops_matches::id())]
    raindrops_program: UncheckedAccount<'info>,
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
    #[msg("The previous index is not full yet, so you cannot make a new one")]
    PreviousIndexNotFull,
    #[msg("Index is full")]
    IndexFull,
    #[msg("Can only cache valid raindrops artifacts (players, items, matches)")]
    CanOnlyCacheValidRaindropsObjects,
    #[msg("Artifact lacks namespace!")]
    ArtifactLacksNamespace,
    #[msg("Artifact not part of namespace!")]
    ArtifactNotPartOfNamespace,
    #[msg("You do not have permissions to join this namespace")]
    CannotJoinNamespace,
    #[msg("Error leaving namespace")]
    CannotLeaveNamespace,
    #[msg("You cannot remove an artifact from a namespace while it is still cached there. Uncache it first.")]
    ArtifactStillCached,
    #[msg("Artifact Cache full")]
    CacheFull,
    #[msg("Cannot Uncache Artifact")]
    CannotUncacheArtifact,
    #[msg("Cannot Cache Artifact")]
    CannotCacheArtifact,
    #[msg("Artifact not configured for namespaces")]
    DesiredNamespacesNone,
}
