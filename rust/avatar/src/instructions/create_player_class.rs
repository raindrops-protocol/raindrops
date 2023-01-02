use anchor_lang::{
    prelude::*,
    solana_program::program::{invoke},
};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::{instruction::{create_metadata_accounts_v2, create_master_edition_v3}, state::DataV2};
use raindrops_player::{
    cpi::{accounts::CreatePlayerClass as CreatePlayerClassAccounts, create_player_class},
    CreatePlayerClassArgs, PlayerClassConfig, PlayerClassData, PlayerClassSettings,
};

use crate::state::{MetadataProgram, PlayerProgram};

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, CreatePlayerClass<'info>>) -> Result<()> {
    msg!("past init");
    // create player class metadata
    // TODO: what to put here?
    let data = DataV2 {
        name: "PlayerClass".to_string(),
        symbol: "PC".to_string(),
        uri: "https://foo.com/bar.json".to_string(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let create_metadata_accounts = [
        ctx.accounts.player_class_metadata.to_account_info(),
        ctx.accounts.player_class_mint.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];

    let metadata_ix = create_metadata_accounts_v2(
        ctx.accounts.metadata_program.key(),
        ctx.accounts.player_class_metadata.key(),
        ctx.accounts.player_class_mint.key(),
        ctx.accounts.authority.key(),
        ctx.accounts.authority.key(),
        ctx.accounts.authority.key(),
        data.name,
        data.symbol,
        data.uri,
        data.creators,
        data.seller_fee_basis_points,
        false,
        false,
        data.collection,
        data.uses,
    );

    invoke(&metadata_ix, &create_metadata_accounts)?;

    // mint master edition token to authority ata
    let player_class_mint_to_accounts = token::MintTo {
        mint: ctx.accounts.player_class_mint.to_account_info(),
        to: ctx.accounts.authority_ata.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            player_class_mint_to_accounts,
        ),
        1,
    )?;

    // create player class master edition
    let create_player_class_master_edition_accounts = [
        ctx.accounts.player_class_me.to_account_info(),
        ctx.accounts.player_class_metadata.to_account_info(),
        ctx.accounts.player_class_mint.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.rent.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ];

    // create master edition account
    let player_class_master_edition_ix = create_master_edition_v3(
        ctx.accounts.metadata_program.key(),
        ctx.accounts.player_class_me.key(),
        ctx.accounts.player_class_mint.key(),
        ctx.accounts.authority.key(),
        ctx.accounts.authority.key(),
        ctx.accounts.player_class_metadata.key(),
        ctx.accounts.authority.key(),
        Some(0),
    );

    invoke(
        &player_class_master_edition_ix,
        &create_player_class_master_edition_accounts,
    )?;

    // create player class
    let create_player_class_args = CreatePlayerClassArgs {
        class_index: 0,
        parent_class_index: None,
        parent_of_parent_class_index: None,
        space: 400,
        desired_namespace_array_size: 0,
        update_permissiveness_to_use: None,
        store_mint: false,
        store_metadata_fields: false,
        player_class_data: create_player_class_data(),
    };

    let create_player_class_accounts = CreatePlayerClassAccounts {
        player_class: ctx.accounts.player_class.clone().to_account_info(),
        player_mint: ctx.accounts.player_class_mint.to_account_info(),
        metadata: ctx.accounts.player_class_metadata.to_account_info(),
        edition: ctx.accounts.player_class_me.to_account_info(),
        parent: ctx.accounts.player_class.to_account_info(),
        payer: ctx.accounts.authority.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };

    let player_program = ctx.accounts.player_program.to_account_info();

    let cpi_ctx = CpiContext::new(
        player_program,
        create_player_class_accounts,
    );

    let remaining_accounts = vec![ctx.accounts.authority.to_account_info(), ctx.accounts.player_class_metadata.to_account_info()];

    create_player_class(
        cpi_ctx.with_remaining_accounts(remaining_accounts),
        create_player_class_args,
    )
}

#[derive(Accounts)]
pub struct CreatePlayerClass<'info> {
    /// CHECK: initialized by raindrops player program
    #[account(mut, seeds = [b"player", player_class_mint.key().as_ref(), &0_u64.to_le_bytes()], bump, seeds::program = PlayerProgram::id())]
    pub player_class: UncheckedAccount<'info>,

    #[account(init, payer = authority, mint::decimals = 0, mint::authority = authority, mint::freeze_authority = authority)]
    pub player_class_mint: Account<'info, token::Mint>,

    /// CHECK: initialized by metaplex token metadata program
    #[account(mut, seeds = [b"metadata", MetadataProgram::id().as_ref(), player_class_mint.key().as_ref()], bump, seeds::program = MetadataProgram::id())]
    pub player_class_metadata: UncheckedAccount<'info>,

    /// CHECK: initialized by metaplex token metadata program
    #[account(mut, seeds = [b"metadata", MetadataProgram::id().as_ref(), player_class_mint.key().as_ref(), b"edition"], bump, seeds::program = MetadataProgram::id())]
    pub player_class_me: UncheckedAccount<'info>,

    #[account(init, payer = authority, associated_token::mint = player_class_mint, associated_token::authority = authority)]
    pub authority_ata: Account<'info, token::TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub player_program: Program<'info, PlayerProgram>,

    pub metadata_program: Program<'info, MetadataProgram>,
}

// return minimal player class config
fn create_player_class_data() -> PlayerClassData {
    let settings = PlayerClassSettings {
        default_category: None,
        children_must_be_editions: None,
        builder_must_be_holder: None,
        update_permissiveness: None,
        instance_update_permissiveness: None,
        build_permissiveness: None,
        equip_item_permissiveness: None,
        add_item_permissiveness: None,
        use_item_permissiveness: None,
        unequip_item_permissiveness: None,
        remove_item_permissiveness: None,
        staking_warm_up_duration: None,
        staking_cooldown_duration: None,
        staking_permissiveness: None,
        unstaking_permissiveness: None,
        child_update_propagation_permissiveness: None,
    };
    let config = PlayerClassConfig {
        starting_stats_uri: None,
        basic_stats: None,
        body_parts: None,
        equip_validation: None,
        add_to_pack_validation: None,
    };

    PlayerClassData { settings, config }
}
