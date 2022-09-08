pub mod utils;

use {
    crate::utils::*,
    anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize},
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{close_account, CloseAccount, Mint, Token, TokenAccount},
    },
    raindrops_item::utils::{
        assert_keys_equal, assert_metadata_valid, get_item_usage, spl_token_transfer,
        GetItemUsageArgs, TokenTransferParams,
    },
};

anchor_lang::declare_id!("p1ay5K7mcAZUkzR1ArMLCCQ6C58ULUt7SUi7puGEWc1");

pub const PREFIX: &str = "player";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemCallbackArgs {
    pub instruction: [u8; 8],
    pub extra_identifier: u64,
    pub class_index: u64,
    pub index: u64,
    pub item_class_mint: Pubkey,
    pub amount: u64,
    pub usage_permissiveness_to_use: Option<PermissivenessType>,
    pub usage_index: u16,
    // Use this if using roots
    pub usage_info: Option<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CopyEndItemActivationBecauseAnchorSucksSometimesArgs {
    pub instruction: [u8; 8],
    pub item_class_mint: Pubkey,
    pub usage_permissiveness_to_use: Option<PermissivenessType>,
    pub usage_index: u16,
    pub index: u64,
    pub class_index: u64,
    pub amount: u64,
    // Required if using roots
    pub usage_info: Option<raindrops_item::CraftUsageInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CopyBeginItemActivationBecauseAnchorSucksSometimesArgs {
    pub instruction: [u8; 8],
    pub class_index: u64,
    pub index: u64,
    pub item_class_mint: Pubkey,
    pub item_mint: Pubkey,
    // How much space to use for the item marker
    pub item_marker_space: u8,
    pub usage_permissiveness_to_use: Option<PermissivenessType>,
    pub amount: u64,
    pub usage_index: u16,
    pub target: Option<Pubkey>,
    // Use this if using roots
    pub usage_info: Option<raindrops_item::UsageInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CopyUpdateValidForUseIfWarmupPassedBecauseAnchorSucksSometimesArgs {
    pub instruction: [u8; 8],
    pub item_mint: Pubkey,
    pub index: u64,
    pub usage_index: u16,
    pub class_index: u64,
    pub amount: u64,
    pub item_class_mint: Pubkey,
    // Required if using roots
    pub usage_proof: Option<Vec<[u8; 32]>>,
    pub usage: Option<raindrops_item::ItemUsage>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddOrRemoveItemValidationArgs {
    // For enum detection on the other end.
    pub instruction: [u8; 8],
    pub extra_identifier: u64,
    pub amount: u64,
    pub player_mint: Pubkey,
    pub item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddItemEffectArgs {
    pub item_index: u64,
    pub item_class_index: u64,
    pub index: u64,
    pub player_mint: Pubkey,
    pub item_class_mint: Pubkey,
    pub item_usage_index: u16,
    pub use_item_permissiveness_to_use: Option<PermissivenessType>,
    pub space: u64,
    // Use this if using roots
    pub usage_info: Option<UsageInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UsageInfo {
    // a specific usage state that is in the cooldown phase if the component condition is "Cooldown"
    pub usage_state_proof: Vec<[u8; 32]>,
    pub usage_state: Vec<u8>,
    pub usage_proof: Vec<[u8; 32]>,
    pub usage: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddItemArgs {
    pub item_index: u64,
    pub index: u64,
    pub player_mint: Pubkey,
    pub amount: u64,
    pub add_item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RemoveItemArgs {
    pub item_index: u64,
    pub index: u64,
    pub player_mint: Pubkey,
    pub amount: u64,
    pub remove_item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ToggleEquipItemArgs {
    pub item_index: u64,
    pub item_mint: Pubkey,
    pub item_class_mint: Pubkey,
    pub index: u64,
    pub player_mint: Pubkey,
    pub amount: u64,
    pub equipping: bool,
    pub body_part_index: u16,
    pub equip_item_permissiveness_to_use: Option<PermissivenessType>,
    pub item_usage_index: u16,
    // Use this if using roots
    pub item_usage_proof: Option<Vec<[u8; 32]>>,
    pub item_usage: Option<Vec<u8>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ResetPlayerStatsArgs {
    pub index: u64,
    pub player_mint: Pubkey,
    pub equip_item_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainPlayerArgs {
    pub index: u64,
    pub class_index: u64,
    pub player_mint: Pubkey,
    pub player_class_mint: Pubkey,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePlayerClassArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
    pub player_class_data: Option<PlayerClassData>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreatePlayerClassArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub parent_of_parent_class_index: Option<u64>,
    pub space: u64,
    pub desired_namespace_array_size: u16,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
    pub store_mint: bool,
    pub store_metadata_fields: bool,
    pub player_class_data: PlayerClassData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainPlayerClassArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
    pub player_class_mint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BuildPlayerArgs {
    pub class_index: u64,
    pub parent_class_index: Option<u64>,
    pub new_player_index: u64,
    pub space: u64,
    pub player_class_mint: Pubkey,
    pub build_permissiveness_to_use: Option<PermissivenessType>,
    pub store_mint: bool,
    pub store_metadata_fields: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePlayerArgs {
    pub class_index: u64,
    pub index: u64,
    pub player_mint: Pubkey,
    pub update_permissiveness_to_use: Option<PermissivenessType>,
    pub player_class_mint: Pubkey,
    pub new_data: Option<PlayerData>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UseItemArgs {
    pub item_class_index: u64,
    pub item_index: u64,
    pub item_class_mint: Pubkey,
    pub item_mint: Pubkey,
    // How much space to use for the item marker
    pub item_marker_space: u8,
    pub use_item_permissiveness_to_use: Option<PermissivenessType>,
    pub amount: u64,
    pub item_usage_index: u16,
    pub target: Option<Pubkey>,
    pub index: u64,
    pub player_mint: Pubkey,
    // Use this if using roots
    pub item_usage_info: Option<Vec<u8>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateValidForUseIfWarmupPassedOnItemArgs {
    pub item_mint: Pubkey,
    pub item_index: u64,
    pub item_usage_index: u16,
    pub item_class_index: u64,
    pub amount: u64,
    pub item_class_mint: Pubkey,
    pub usage_permissiveness_to_use: Option<PermissivenessType>,
    pub index: u64,
    pub player_mint: Pubkey,
    // Required if using roots
    pub item_usage_proof: Option<Vec<[u8; 32]>>,
    pub item_usage: Option<Vec<u8>>,
}

#[program]
pub mod player {

    use super::*;

    pub fn create_player_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreatePlayerClass<'info>>,
        args: CreatePlayerClassArgs,
    ) -> Result<()> {
        let CreatePlayerClassArgs {
            class_index,
            parent_class_index,
            desired_namespace_array_size,
            update_permissiveness_to_use,
            store_mint,
            store_metadata_fields,
            parent_of_parent_class_index,
            mut player_class_data,
            ..
        } = args;

        let player_class = &mut ctx.accounts.player_class;
        let player_class_info = player_class.to_account_info();
        let player_mint = &ctx.accounts.player_mint;
        let metadata = &ctx.accounts.metadata;
        let edition = &ctx.accounts.edition;
        let parent = &ctx.accounts.parent;

        msg!("assert_metadata_valid");
        raindrops_item::utils::assert_metadata_valid(
            &metadata.to_account_info(),
            Some(&edition.to_account_info()),
            &player_mint.key(),
        )?;

        msg!("namespaces");
        if desired_namespace_array_size > 0 {
            let mut namespace_arr = vec![];

            for _n in 0..desired_namespace_array_size {
                namespace_arr.push(NamespaceAndIndex {
                    namespace: anchor_lang::solana_program::system_program::id(),
                    indexed: false,
                    inherited: InheritanceState::NotInherited,
                });
            }

            player_class.namespaces = Some(namespace_arr);
        } else {
            player_class.namespaces = None
        }

        msg!("2");
        let parent_info = parent.to_account_info();
        if !parent.data_is_empty()
            && parent_info.owner == ctx.program_id
            && parent.key() != player_class.key()
        {
            msg!("2 parent is not empty");
            let mut parent_deserialized: Account<'_, PlayerClass> =
                Account::try_from(&parent_info)?;

            assert_permissiveness_access(AssertPermissivenessAccessArgs {
                program_id: ctx.program_id,
                given_account: parent,
                remaining_accounts: ctx.remaining_accounts,
                permissiveness_to_use: &update_permissiveness_to_use,
                permissiveness_array: &parent_deserialized.data.settings.update_permissiveness,
                class_index: parent_of_parent_class_index,
                index: parent_class_index.unwrap(),
                account_mint: None,
            })?;

            player_class.parent = Some(parent.key());

            parent_deserialized.existing_children = parent_deserialized
                .existing_children
                .checked_add(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;

            update_player_class_with_inherited_information(
                player_class,
                &mut player_class_data,
                &parent_deserialized,
                &parent_deserialized.data,
            );

            // Horribly inefficient but TODO replace later with something smarter.
            let parent_data = &mut parent_info.data.borrow_mut();
            let new_parent_data = parent_deserialized.try_to_vec()?;

            let mut i = 8;
            for data in new_parent_data {
                parent_data[i] = data;
                i += 1
            }
        } else {
            msg!("2 assert_permissiveness_access");
            assert_permissiveness_access(AssertPermissivenessAccessArgs {
                program_id: ctx.program_id,
                given_account: &player_class_info,
                remaining_accounts: ctx.remaining_accounts,
                permissiveness_to_use: &Some(PermissivenessType::UpdateAuthority),
                permissiveness_array: &Some(vec![Permissiveness {
                    permissiveness_type: PermissivenessType::UpdateAuthority,
                    inherited: InheritanceState::NotInherited,
                }]),
                class_index: parent_of_parent_class_index,
                index: class_index,
                account_mint: Some(&player_mint.key()),
            })?;
        }

        msg!("store_metadata_fields");
        player_class.bump = *ctx.bumps.get("player_class").unwrap();
        if store_metadata_fields {
            player_class.metadata = Some(metadata.key());
            player_class.edition = Some(edition.key());
        }

        msg!("store_mint");
        if store_mint {
            player_class.mint = Some(player_mint.key());
        }

        assert_index_and_name_uniqueness_in_player_class_data(&player_class_data)?;
        player_class.data = player_class_data;

        Ok(())
    }

    pub fn update_player_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdatePlayerClass<'info>>,
        args: UpdatePlayerClassArgs,
    ) -> Result<()> {
        let UpdatePlayerClassArgs {
            class_index,
            update_permissiveness_to_use,
            player_class_data,
            parent_class_index,
        } = args;

        let player_class = &mut ctx.accounts.player_class;
        let player_mint = &ctx.accounts.player_mint;
        let parent = &ctx.accounts.parent;

        msg!("player_class_data");
        let original_player_class_data = player_class.data.clone();

        msg!("assert_permissiveness_access check");
        let mut new_player_class_data = if let Some(icd) = player_class_data {
            assert_permissiveness_access(AssertPermissivenessAccessArgs {
                program_id: ctx.program_id,
                given_account: &player_class.to_account_info(),
                remaining_accounts: ctx.remaining_accounts,
                permissiveness_to_use: &update_permissiveness_to_use,
                permissiveness_array: &original_player_class_data.settings.update_permissiveness,
                index: class_index,
                class_index: parent_class_index,
                account_mint: Some(&player_mint.key()),
            })?;

            icd
        } else {
            original_player_class_data
        };
        // The only case where only one account is passed in is when you are just
        // requesting a permissionless inheritance update.
        if parent.key() != System::id() {
            if let Some(ic_parent) = player_class.parent {
                assert_keys_equal(parent.key(), ic_parent)?;
            } else {
                return Err(error!(ErrorCode::NoParentPresent));
            }
            let parent_deserialized: Box<Account<'_, PlayerClass>> =
                Box::new(Account::try_from(parent)?);
            update_player_class_with_inherited_information(
                player_class,
                &mut new_player_class_data,
                &parent_deserialized,
                &parent_deserialized.data,
            );
        } else if player_class.parent.is_some() {
            return Err(error!(ErrorCode::ExpectedParent));
        }

        assert_index_and_name_uniqueness_in_player_class_data(&new_player_class_data)?;
        player_class.data = new_player_class_data;

        Ok(())
    }

    pub fn drain_player_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainPlayerClass<'info>>,
        args: DrainPlayerClassArgs,
    ) -> Result<()> {
        let DrainPlayerClassArgs {
            class_index,
            update_permissiveness_to_use,
            player_class_mint,
            parent_class_index,
        } = args;
        let player_class = &mut ctx.accounts.player_class;
        let receiver = &ctx.accounts.receiver;
        let parent = &ctx.accounts.parent_class;
        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &update_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.update_permissiveness,
            index: class_index,
            class_index: parent_class_index,
            account_mint: Some(&player_class_mint.key()),
        })?;

        require!(player_class.existing_children == 0, ChildrenStillExist);

        if !parent.data_is_empty()
            && parent.key() != player_class.key()
            && parent.to_account_info().owner == ctx.program_id
        {
            let mut parent_deserialized: Account<'_, PlayerClass> =
                Account::try_from(&parent.to_account_info())?;

            if parent_deserialized.existing_children > 0 {
                parent_deserialized.existing_children = parent_deserialized
                    .existing_children
                    .checked_sub(1)
                    .ok_or(ErrorCode::NumericalOverflowError)?;

                // Horribly inefficient but TODO replace later with something smarter.
                let parent_data = &mut parent.data.borrow_mut();
                let new_parent_data = parent_deserialized.try_to_vec()?;

                let mut i = 8;
                for data in new_parent_data {
                    parent_data[i] = data;
                    i += 1
                }
            }
        }

        let player_class_info = player_class.to_account_info();
        let snapshot: u64 = player_class_info.lamports();

        **player_class_info.lamports.borrow_mut() = 0;

        **receiver.lamports.borrow_mut() = receiver
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn drain_player<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainPlayer<'info>>,
        args: DrainPlayerArgs,
    ) -> Result<()> {
        let player_class = &mut ctx.accounts.player_class;
        let player = &mut ctx.accounts.player;
        let receiver = &ctx.accounts.receiver;

        let DrainPlayerArgs {
            class_index,
            index,
            player_mint,
            update_permissiveness_to_use,
            ..
        } = args;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &update_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.update_permissiveness,
            index,
            class_index: Some(class_index),
            account_mint: Some(&player_mint.key()),
        })?;

        require!(player.tokens_staked == 0, UnstakeTokensFirst);
        require!(player.equipped_items.len() == 0, RemoveEquipmentFirst);
        require!(player.active_item_counter == 0, DeactivateAllItemsFirst);
        require!(
            player.items_in_backpack == 0,
            RemoveAllItemsFromBackpackFirst
        );

        if player_class.existing_children > 0 {
            player_class.existing_children = player_class
                .existing_children
                .checked_sub(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        let player_info = player.to_account_info();
        let snapshot: u64 = player_info.lamports();

        **player_info.lamports.borrow_mut() = 0;

        **receiver.lamports.borrow_mut() = receiver
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn update_player<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdatePlayer<'info>>,
        args: UpdatePlayerArgs,
    ) -> Result<()> {
        let player_class = &mut ctx.accounts.player_class;
        let player = &mut ctx.accounts.player;

        let UpdatePlayerArgs {
            index,
            class_index,
            player_mint,
            update_permissiveness_to_use,
            new_data,
            ..
        } = args;

        if let Some(data) = new_data {
            assert_permissiveness_access(AssertPermissivenessAccessArgs {
                program_id: ctx.program_id,
                given_account: &player.to_account_info(),
                remaining_accounts: ctx.remaining_accounts,
                permissiveness_to_use: &update_permissiveness_to_use,
                permissiveness_array: &player_class.data.settings.update_permissiveness,
                index,
                class_index: Some(class_index),
                account_mint: Some(&player_mint.key()),
            })?;

            map_new_stats_into_player(player_class, player, &data.basic_stats)?;
            player.data.stats_uri = data.stats_uri;
            player.data.category = data.category;
        }

        propagate_player_class_data_fields_to_player_data(player, player_class);

        Ok(())
    }

    pub fn build_player<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BuildPlayer<'info>>,
        args: BuildPlayerArgs,
    ) -> Result<()> {
        let player_class = &mut ctx.accounts.player_class;
        let new_player = &mut ctx.accounts.new_player;
        let new_player_mint = &ctx.accounts.new_player_mint;
        let new_player_token_holder = &ctx.accounts.new_player_token_holder;
        let metadata = &ctx.accounts.new_player_metadata;
        let edition = &ctx.accounts.new_player_edition;

        let BuildPlayerArgs {
            class_index,
            player_class_mint,
            build_permissiveness_to_use,
            store_mint,
            store_metadata_fields,
            parent_class_index,
            ..
        } = args;

        msg!("assert_metadata_valid");
        assert_metadata_valid(
            &metadata.to_account_info(),
            Some(&edition.to_account_info()),
            &new_player_mint.key(),
        )?;

        msg!("assert_builder_must_be_holder_check");
        assert_builder_must_be_holder_check(&player_class.data, new_player_token_holder)?;

        msg!("assert_permissiveness_access");
        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &build_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.build_permissiveness,
            index: class_index,
            class_index: parent_class_index,
            account_mint: Some(&player_class_mint),
        })?;

        new_player.bump = *ctx.bumps.get("new_player").unwrap();
        new_player.padding = 1;
        new_player.class_index = class_index;
        new_player.parent = player_class.key();

        if store_mint {
            new_player.mint = Some(new_player_mint.key());
        }

        if store_metadata_fields {
            new_player.metadata = Some(metadata.key());
            new_player.edition = Some(edition.key());
        }

        msg!("propagate_player_class_data_fields_to_player_data");
        propagate_player_class_data_fields_to_player_data(new_player, player_class);

        player_class.existing_children = player_class
            .existing_children
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn add_item<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, AddItem<'info>>,
        args: AddItemArgs,
    ) -> Result<()> {
        let AddItemArgs {
            amount,
            add_item_permissiveness_to_use,
            player_mint,
            index,
            ..
        } = args;

        let player = &mut ctx.accounts.player;
        let player_class = &ctx.accounts.player_class;
        let item = &ctx.accounts.item;
        let item_mint = &ctx.accounts.item_mint;
        let item_class = &ctx.accounts.item_class;
        let item_account = &ctx.accounts.item_account;
        let item_transfer_authority = &ctx.accounts.item_transfer_authority;
        let player_item_account = &ctx.accounts.player_item_account;
        let validation_program = &ctx.accounts.validation_program;
        let token_program = &ctx.accounts.token_program;
        let payer = &ctx.accounts.payer;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &add_item_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.add_item_permissiveness,
            index: index,
            class_index: Some(player.class_index),
            account_mint: Some(&player_mint),
        })?;

        run_item_validation(RunItemValidationArgs {
            player_class,
            item_class,
            item,
            item_account,
            player_item_account,
            player,
            item_mint,
            validation_program,
            player_mint: &player_mint,
            item_permissiveness_to_use: add_item_permissiveness_to_use,
            amount,
            add: true,
        })?;

        player.items_in_backpack = player
            .items_in_backpack
            .checked_add(amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        let new_amount = item_account
            .amount
            .checked_sub(amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        spl_token_transfer(TokenTransferParams {
            source: item_account.to_account_info(),
            destination: player_item_account.to_account_info(),
            amount,
            authority: item_transfer_authority.to_account_info(),
            authority_signer_seeds: &[],
            token_program: token_program.to_account_info(),
        })?;

        if new_amount == 0 && item_account.owner == payer.key() {
            let cpi_accounts = CloseAccount {
                account: item_account.to_account_info(),
                destination: payer.to_account_info(),
                authority: payer.to_account_info(),
            };
            let context = CpiContext::new(token_program.to_account_info(), cpi_accounts);

            close_account(context)?;
        }
        Ok(())
    }

    pub fn remove_item<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, RemoveItem<'info>>,
        args: RemoveItemArgs,
    ) -> Result<()> {
        let RemoveItemArgs {
            amount,
            remove_item_permissiveness_to_use,
            player_mint,
            index,
            ..
        } = args;

        let player = &mut ctx.accounts.player;
        let player_class = &ctx.accounts.player_class;
        let item = &ctx.accounts.item;
        let item_mint = &ctx.accounts.item_mint;
        let item_class = &ctx.accounts.item_class;
        let item_account = &ctx.accounts.item_account;
        let player_item_account = &ctx.accounts.player_item_account;
        let validation_program = &ctx.accounts.validation_program;
        let token_program = &ctx.accounts.token_program;
        let payer = &ctx.accounts.payer;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &remove_item_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.remove_item_permissiveness,
            index: index,
            class_index: Some(player.class_index),
            account_mint: Some(&player_mint),
        })?;

        run_item_validation(RunItemValidationArgs {
            player_class,
            item_class,
            item,
            item_account,
            player_item_account,
            player,
            item_mint,
            validation_program,
            player_mint: &player_mint,
            item_permissiveness_to_use: remove_item_permissiveness_to_use,
            amount,
            add: false,
        })?;

        player.items_in_backpack = player
            .items_in_backpack
            .checked_sub(amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        let mut residual_amount = player_item_account
            .amount
            .checked_sub(amount)
            .ok_or(ErrorCode::CannotRemoveThisMuch)?;

        for equipped_item in &player.equipped_items {
            if equipped_item.item == item.key() {
                residual_amount = residual_amount
                    .checked_sub(equipped_item.amount)
                    .ok_or(ErrorCode::CannotRemoveThisMuch)?;
            }
        }

        let player_seeds = &[
            PREFIX.as_bytes(),
            player_mint.as_ref(),
            &index.to_le_bytes(),
            &[player.bump],
        ];

        let new_amount = player_item_account
            .amount
            .checked_sub(amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        spl_token_transfer(TokenTransferParams {
            source: player_item_account.to_account_info(),
            destination: item_account.to_account_info(),
            amount,
            authority: player.to_account_info(),
            authority_signer_seeds: player_seeds,
            token_program: token_program.to_account_info(),
        })?;

        if new_amount == 0 {
            let cpi_accounts = CloseAccount {
                account: player_item_account.to_account_info(),
                destination: payer.to_account_info(),
                authority: player.to_account_info(),
            };
            let context = CpiContext::new(token_program.to_account_info(), cpi_accounts);

            close_account(context.with_signer(&[&player_seeds[..]]))?;
        }
        Ok(())
    }

    pub fn use_item<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UseItem<'info>>,
        args: UseItemArgs,
    ) -> Result<()> {
        let player_class = &ctx.accounts.player_class;
        let player = &ctx.accounts.player;
        let item = &ctx.accounts.item;
        let item_class = &ctx.accounts.item_class;
        let item_activation_marker = &ctx.accounts.item_activation_marker;
        let player_item_account = &ctx.accounts.player_item_account;
        let payer = &ctx.accounts.payer;
        let item_program = &ctx.accounts.item_program;
        let system_program = &ctx.accounts.system_program;
        let clock = &ctx.accounts.clock;
        let rent = &ctx.accounts.rent;
        let validation_program = &ctx.accounts.validation_program;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &args.use_item_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.use_item_permissiveness,
            index: args.index,
            class_index: Some(player.class_index),
            account_mint: Some(&args.player_mint),
        })?;

        begin_item_activation(BeginItemActivationArgs {
            item,
            item_class,
            item_activation_marker,
            player_item_account,
            payer,
            item_program,
            system_program,
            clock,
            rent,
            validation_program,
            player,
            use_item_args: args,
        })?;

        Ok(())
    }

    pub fn update_valid_for_use_if_warmup_passed_on_item<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateValidForUseIfWarmupPassedOnItem<'info>>,
        args: UpdateValidForUseIfWarmupPassedOnItemArgs,
    ) -> Result<()> {
        let player_class = &ctx.accounts.player_class;
        let player = &ctx.accounts.player;
        let item = &ctx.accounts.item;
        let item_class = &ctx.accounts.item_class;
        let item_account = &ctx.accounts.player_item_account;
        let item_activation_marker = &ctx.accounts.item_activation_marker;
        let item_program = &ctx.accounts.item_program;
        let clock = &ctx.accounts.clock;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &args.usage_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.use_item_permissiveness,
            index: args.index,
            class_index: Some(player.class_index),
            account_mint: Some(&args.player_mint),
        })?;

        update_valid_for_use_if_warmup_passed(UpdateValidForUseIfWarmupPassedArgs {
            item,
            item_class,
            item_activation_marker,
            item_account,
            item_program,
            clock,
            player,
            update_args: args,
        })?;

        Ok(())
    }

    pub fn subtract_item_effect<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SubtractItemEffect<'info>>,
    ) -> Result<()> {
        let player = &mut ctx.accounts.player;
        let player_class = &ctx.accounts.player_class;
        let player_item_activation_marker = &mut ctx.accounts.player_item_activation_marker;
        let item = &ctx.accounts.item;
        let receiver = &ctx.accounts.receiver;
        let clock = &ctx.accounts.clock;

        let act_at = player_item_activation_marker.activated_at.clone() as i64;

        // how do we know if item should have effect removed yet? we have it on the item act
        // marker and duration on the item usage...check and throw error.
        let no_more_waiting = toggle_item_to_basic_stats(ToggleItemToBasicStatsArgs {
            player,
            player_class,
            item,
            basic_item_effects: &player_item_activation_marker.basic_item_effects.clone(),
            amount_change: player_item_activation_marker.amount,
            adding: false,
            stat_diff_type: StatDiffType::Consumable,
            bie_bitmap: &mut player_item_activation_marker.removed_bie_bitmap,
            unix_timestamp: clock.unix_timestamp,
            activated_at: act_at,
        })?;

        if no_more_waiting {
            let player_item_activation_marker_info =
                player_item_activation_marker.to_account_info();
            let snapshot: u64 = player_item_activation_marker_info.lamports();
            **player_item_activation_marker_info.lamports.borrow_mut() = 0;

            **receiver.lamports.borrow_mut() = receiver
                .lamports()
                .checked_add(snapshot)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }
        Ok(())
    }

    pub fn add_item_effect<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, AddItemEffect<'info>>,
        args: AddItemEffectArgs,
    ) -> Result<()> {
        let AddItemEffectArgs {
            index,
            player_mint,
            item_usage_index,
            usage_info,
            use_item_permissiveness_to_use,
            item_index,
            item_class_mint,
            item_class_index,
            ..
        } = args;

        let player = &mut ctx.accounts.player;
        let player_class = &ctx.accounts.player_class;
        let player_item_activation_marker = &mut ctx.accounts.player_item_activation_marker;
        let item_activation_marker = &ctx.accounts.item_activation_marker;
        let item = &ctx.accounts.item;
        let item_mint = &ctx.accounts.item_mint;
        let item_class = &ctx.accounts.item_class;
        let player_item_account = &ctx.accounts.player_item_account;
        let callback_program = &ctx.accounts.callback_program;
        let item_program = &ctx.accounts.item_program;
        let payer = &ctx.accounts.payer;
        let token_program = &ctx.accounts.token_program;

        require!(item_activation_marker.valid_for_use, NotValidForUseYet);

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &use_item_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.use_item_permissiveness,
            index,
            class_index: Some(player.class_index),
            account_mint: Some(&player_mint.key()),
        })?;

        player_item_activation_marker.activated_at = item_activation_marker.unix_timestamp;
        player_item_activation_marker.active_item_counter = player
            .active_item_counter
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;
        player.active_item_counter = player_item_activation_marker.active_item_counter;
        player_item_activation_marker.amount = item_activation_marker.amount;
        player_item_activation_marker.bump =
            *ctx.bumps.get("player_item_activation_marker").unwrap();
        player_item_activation_marker.player = player.key();
        player_item_activation_marker.item = item.key();

        let item_usage_to_use = get_item_usage(GetItemUsageArgs {
            item_class,
            usage_index: item_usage_index,
            usage_proof: if let Some(u) = &usage_info {
                Some(u.usage_proof.clone())
            } else {
                None
            },
            usage: if let Some(u2) = &usage_info {
                Some(raindrops_item::ItemUsage::try_from_slice(&u2.usage)?)
            } else {
                None
            },
        })?;

        player_item_activation_marker.usage_index = item_usage_index;
        player_item_activation_marker.basic_item_effects =
            if let Some(v) = &item_usage_to_use.basic_item_effects {
                let mut new_vec = vec![];
                for b in v {
                    // convert from item's version to player's version
                    // which should be identical but anchor sucks
                    // and wont let us import item's into IDL.
                    let as_bytes = b.try_to_vec()?;
                    new_vec.push(BasicItemEffect::try_from_slice(&as_bytes)?)
                }
                Some(new_vec)
            } else {
                None
            };
        if let Some(bie) = &item_usage_to_use.basic_item_effects {
            if bie.len() > 0 {
                let bie_size = 1 + bie
                    .len()
                    .checked_div(8)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
                player_item_activation_marker.removed_bie_bitmap = Some(vec![0u8; bie_size]);
            }
        }

        run_item_callback(RunItemCallbackArgs {
            player_class,
            item_class,
            item,
            player,
            callback_program,
            item_usage: &item_usage_to_use,
            amount: player_item_activation_marker.amount,
            class_index: item_class_index,
            index: item_index,
            item_class_mint,
            usage_permissiveness_to_use: use_item_permissiveness_to_use.clone(),
            usage_index: item_usage_index,
        })?;

        toggle_item_to_basic_stats(ToggleItemToBasicStatsArgs {
            player,
            player_class,
            item,
            basic_item_effects: &player_item_activation_marker.basic_item_effects.clone(),
            amount_change: player_item_activation_marker.amount,
            adding: true,
            stat_diff_type: StatDiffType::Consumable,
            bie_bitmap: &mut player_item_activation_marker.removed_bie_bitmap,
            unix_timestamp: 0,
            activated_at: 0,
        })?;

        end_item_activation(EndItemActivationArgs {
            item,
            item_class,
            item_activation_marker,
            receiver: payer,
            item_class_mint: &item_class_mint,
            item_mint,
            usage_permissiveness_to_use: use_item_permissiveness_to_use,
            item_usage_index,
            item_index,
            item_class_index,
            amount: player_item_activation_marker.amount,
            usage_info: if let Some(u3) = &usage_info {
                Some(raindrops_item::CraftUsageInfo {
                    craft_usage_state_proof: u3.usage_state_proof.clone(),
                    craft_usage_state: raindrops_item::ItemUsageState::try_from_slice(
                        &u3.usage_state,
                    )?,
                    craft_usage_proof: u3.usage_proof.clone(),
                    craft_usage: raindrops_item::ItemUsage::try_from_slice(&u3.usage)?,
                })
            } else {
                None
            },
            item_program,
            player,
            player_mint: &player_mint,
            player_item_account,
            index,
            token_program,
        })?;

        Ok(())
    }

    pub fn toggle_equip_item<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ToggleEquipItem<'info>>,
        args: ToggleEquipItemArgs,
    ) -> Result<()> {
        let ToggleEquipItemArgs {
            item_index,
            index,
            item_class_mint,
            amount,
            equipping,
            equip_item_permissiveness_to_use,
            player_mint,
            body_part_index,
            item_usage_index,
            item_usage,
            item_usage_proof,
            ..
        } = args;

        let player = &mut ctx.accounts.player;
        let player_class = &ctx.accounts.player_class;
        let item = &ctx.accounts.item;
        let item_class = &ctx.accounts.item_class;
        let player_item_account = &ctx.accounts.player_item_account;
        let validation_program = &ctx.accounts.validation_program;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &equip_item_permissiveness_to_use,
            permissiveness_array: if equipping {
                &player_class.data.settings.equip_item_permissiveness
            } else {
                &player_class.data.settings.unequip_item_permissiveness
            },
            index: index,
            class_index: Some(player.class_index),
            account_mint: Some(&player_mint),
        })?;

        let BuildNewEquippedItemsReturn {
            total_equipped_for_this_item,
            total_equipped_for_this_body_part_for_this_item,
            total_equipped_for_this_body_part,
            new_eq_items,
        } = build_new_equipped_items_and_provide_counts(
            BuildNewEquippedItemsAndProvideCountsArgs {
                player,
                item,
                body_part_index,
                amount,
                equipping,
            },
        )?;

        let used_body_part =
            find_used_body_part_from_index(player_class, body_part_index, equipping)?;

        let item_usage = verify_item_usage_appropriate_for_body_part(
            VerifyItemUsageAppropriateForBodyPartArgs {
                used_body_part: &used_body_part,
                item_usage_index,
                item_usage: if let Some(v) = item_usage {
                    Some(raindrops_item::ItemUsage::try_from_slice(&v)?)
                } else {
                    None
                },
                item_usage_proof,
                item_class,
                equipping,
                total_equipped_for_this_item,
                total_equipped_for_this_body_part_for_this_item,
                total_equipped_for_this_body_part,
                equipped_items: &new_eq_items,
            },
        )?;

        run_toggle_equip_item_validation(RunToggleEquipItemValidationArgs {
            item_class,
            item,
            player_item_account,
            validation_program,
            permissiveness_to_use: equip_item_permissiveness_to_use,
            amount,
            item_usage: &item_usage,
            item_index,
            item_class_index: item.class_index,
            usage_index: item_usage_index,
            item_class_mint: &item_class_mint,
        })?;

        player.equipped_items = new_eq_items;

        toggle_item_to_basic_stats(ToggleItemToBasicStatsArgs {
            player,
            player_class,
            item,
            basic_item_effects: &(if let Some(v) = &item_usage.basic_item_effects {
                let mut new_vec = vec![];
                for val in v {
                    let as_bytes = val.try_to_vec()?;
                    new_vec.push(BasicItemEffect::try_from_slice(&as_bytes)?);
                }
                Some(new_vec)
            } else {
                None
            }),
            amount_change: amount,
            adding: equipping,
            stat_diff_type: StatDiffType::Wearable,
            bie_bitmap: &mut None,
            unix_timestamp: 0,
            activated_at: 0,
        })?;

        Ok(())
    }

    // If the math in this early contract breaks and you need to reset things.
    pub fn reset_player_stats<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ResetPlayerStats<'info>>,
        args: ResetPlayerStatsArgs,
    ) -> Result<()> {
        let ResetPlayerStatsArgs {
            equip_item_permissiveness_to_use,
            player_mint,
            index,
        } = args;

        let player = &mut ctx.accounts.player;
        let player_class = &ctx.accounts.player_class;

        require!(
            player.active_item_counter == 0,
            CannotResetPlayerStatsUntilItemEffectsAreRemoved
        );

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &player.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &equip_item_permissiveness_to_use,
            permissiveness_array: &player_class.data.settings.equip_item_permissiveness,
            index: index,
            class_index: Some(player.class_index),
            account_mint: Some(&player_mint),
        })?;

        player.equipped_items = vec![];
        if let Some(stats) = &player.data.basic_stats {
            let mut new_stats = vec![];
            for stat in stats {
                let mut new_bs = stat.clone();
                match new_bs.state {
                    BasicStatState::Integer { base, .. } => {
                        new_bs.state = BasicStatState::Integer {
                            base: base,
                            with_temporary_changes: base,
                            finalized: base,
                            temporary_numerator: 1,
                            temporary_denominator: 1,
                        }
                    }
                    _ => {
                        // do nothing
                    }
                };
                new_stats.push(new_bs)
            }
            player.data.basic_stats = Some(new_stats);
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(args: CreatePlayerClassArgs)]
pub struct CreatePlayerClass<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(
        init,
        seeds=[PREFIX.as_bytes(), player_mint.key().as_ref(), &args.class_index.to_le_bytes()],
        bump,
        space=args.space as usize,
        payer=payer,
        constraint=args.space as usize >= MIN_PLAYER_CLASS_SIZE
    )]
    player_class: Box<Account<'info, PlayerClass>>,
    player_mint: Box<Account<'info, Mint>>,
    metadata: UncheckedAccount<'info>,
    edition: UncheckedAccount<'info>,
    // is the parent item class (if there is one.) Otherwise use same player class.
    ///CHECK: TODO
    #[account(mut)]
    parent: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // See create_item_class in item lib.rs for additional accounts required here. They follow same pattern.
}

#[derive(Accounts)]
#[instruction(args: UpdatePlayerClassArgs)]
pub struct UpdatePlayerClass<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            player_mint.key().as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Box<Account<'info, PlayerClass>>,
    player_mint: Box<Account<'info, Mint>>,
    // Pass up system if you dont have a parent
    parent: UncheckedAccount<'info>,
    // These below only needed if trying to do something other than permissionelss inheritance propagation
    // See the [COMMON REMAINING ACCOUNTS] in item's lib.rs for this
}

#[derive(Accounts)]
pub struct SubtractItemEffect<'info> {
    #[account(mut, constraint=player.key() == player_item_activation_marker.player)]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            player_item_activation_marker.item.as_ref(),
            player.key().as_ref(),
            &(player_item_activation_marker.usage_index as u64).to_le_bytes(),
            &(player_item_activation_marker.amount as u64).to_le_bytes(),
            raindrops_item::MARKER.as_bytes()
        ],
        bump=player_item_activation_marker.bump
    )]
    player_item_activation_marker: Box<Account<'info, PlayerItemActivationMarker>>,
    #[account(constraint=player_item_activation_marker.item == item.key())]
    item: Box<Account<'info, raindrops_item::Item>>,
    #[account(mut)]
    receiver: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(args: AddItemEffectArgs)]
pub struct AddItemEffect<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.key().as_ref(),
            &args.index.to_le_bytes()
        ],
        constraint=player.key() == item_activation_marker.target.unwrap(),
        bump=player.bump
    )]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    player_item_account: UncheckedAccount<'info>,
    // Will be checked by item contract
    #[account(mut)]
    item_mint: UncheckedAccount<'info>,
    #[account(
        init,
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref(),
            &(args.item_usage_index as u64).to_le_bytes(),
            &item_activation_marker.amount.to_le_bytes(),
            raindrops_item::MARKER.as_bytes()
        ],
        bump,
        payer=payer,
        constraint=(args.space as usize) >= PLAYER_ITEM_ACTIVATION_MARKER_MIN_SPACE,
        space=args.space as usize
    )]
    player_item_activation_marker: Box<Account<'info, PlayerItemActivationMarker>>,
    #[account(
        mut,
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            item_mint.key().as_ref(),
            player_item_account.key().as_ref(),
            &args.item_index.to_le_bytes(),
            &(args.item_usage_index as u64).to_le_bytes(),
            &item_activation_marker.amount.to_le_bytes(),
            raindrops_item::MARKER.as_bytes()
        ],
        seeds::program=raindrops_item::id(),
        bump=item_activation_marker.bump
    )]
    item_activation_marker: Box<Account<'info, raindrops_item::ItemActivationMarker>>,
    #[account(
        mut,
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            item_mint.key().as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        bump=item.bump
    )]
    item: Box<Account<'info, raindrops_item::Item>>,
    #[account(
        mut,
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            args.item_class_mint.as_ref(),
            &args.item_class_index.to_le_bytes(),
        ],
        constraint=item.parent == item_class.key(),
        seeds::program=raindrops_item::id(),
        bump=item_class.bump
    )]
    item_class: Box<Account<'info, raindrops_item::ItemClass>>,
    // Will use funds from item activation marker to seed player activation marker
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    #[account(constraint=item_program.key() == raindrops_item::id())]
    item_program: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    // System program if there is no callback to call
    // if there is, pass up the callback program
    callback_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after
    // These will be used to close the item activation marker once its been read into this program
}

#[derive(Accounts)]
#[instruction(args: UseItemArgs)]
pub struct UseItem<'info> {
    #[account(
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.key().as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(mut)]
    item: UncheckedAccount<'info>,
    item_class: UncheckedAccount<'info>,
    #[account(
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    player_item_account: UncheckedAccount<'info>,
    // Size needs to be >= 20 and <= 66
    #[account(mut)]
    item_activation_marker: UncheckedAccount<'info>,
    // payer required here as extra key to guarantee some paying entity for anchor
    // however this signer should match one of the signers in COMMON REMAINING ACCOUNTS
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    #[account(constraint=item_program.key() == raindrops_item::id())]
    item_program: UncheckedAccount<'info>,
    clock: Sysvar<'info, Clock>,
    rent: Sysvar<'info, Rent>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after
}

#[derive(Accounts)]
#[instruction(args: UpdateValidForUseIfWarmupPassedOnItemArgs)]
pub struct UpdateValidForUseIfWarmupPassedOnItem<'info> {
    #[account(
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.key().as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    player_item_account: UncheckedAccount<'info>,
    #[account(mut)]
    item: UncheckedAccount<'info>,
    item_class: UncheckedAccount<'info>,
    #[account(mut)]
    item_activation_marker: UncheckedAccount<'info>,
    #[account(constraint=item_program.key() == raindrops_item::id())]
    item_program: UncheckedAccount<'info>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after
}

#[derive(Accounts)]
#[instruction(args: AddItemArgs)]
pub struct AddItem<'info> {
    #[account(mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.key().as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            item_mint.key().as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        bump=item.bump
    )]
    item: Box<Account<'info, raindrops_item::Item>>,
    #[account(constraint=item.parent == item_class.key())]
    item_class: Box<Account<'info, raindrops_item::ItemClass>>,
    item_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint=item_account.mint == item_mint.key())]
    item_account: Box<Account<'info, TokenAccount>>,
    item_transfer_authority: Signer<'info>,
    #[account(
        init_if_needed,
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump,
        token::mint = item_mint,
        token::authority = player,
        payer=payer
    )]
    player_item_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after for add item permissiveness
}

#[derive(Accounts)]
#[instruction(args: RemoveItemArgs)]
pub struct RemoveItem<'info> {
    #[account(mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.key().as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            item_mint.key().as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        bump=item.bump
    )]
    item: Box<Account<'info, raindrops_item::Item>>,
    #[account(constraint=item.parent == item_class.key())]
    item_class: Box<Account<'info, raindrops_item::ItemClass>>,
    item_mint: Box<Account<'info, Mint>>,
    #[account(
        init_if_needed,
        associated_token::mint = item_mint,
        associated_token::authority = item_account_owner,
        payer=payer
    )]
    item_account: Box<Account<'info, TokenAccount>>,
    item_account_owner: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    player_item_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after for add item permissiveness
}

#[derive(Accounts)]
#[instruction(args: ResetPlayerStatsArgs)]
pub struct ResetPlayerStats<'info> {
    #[account(mut)]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after for add item permissiveness
}

#[derive(Accounts)]
#[instruction(args: ToggleEquipItemArgs)]
pub struct ToggleEquipItem<'info> {
    #[account(mut)]
    player: Box<Account<'info, Player>>,
    #[account(constraint=player.parent == player_class.key())]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            args.item_mint.as_ref(),
            &args.item_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        bump=item.bump
    )]
    item: Box<Account<'info, raindrops_item::Item>>,
    #[account(
        seeds=[
            raindrops_item::PREFIX.as_bytes(),
            args.item_class_mint.as_ref(),
            &item.class_index.to_le_bytes(),
        ],
        seeds::program=raindrops_item::id(),
        constraint=item.parent == item_class.key(),
        bump=item_class.bump
    )]
    item_class: Box<Account<'info, raindrops_item::ItemClass>>,
    #[account(
        seeds=[
            PREFIX.as_bytes(),
            item.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    player_item_account: Box<Account<'info, TokenAccount>>,
    // System program if there is no validation to call
    // if there is, pass up the validation program
    validation_program: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for accounts that come after for add item permissiveness
}

#[derive(Accounts)]
#[instruction(args: DrainPlayerClassArgs)]
pub struct DrainPlayerClass<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Account<'info, PlayerClass>,
    #[account(
        mut,
        constraint= (player_class.parent.is_none() && parent_class.key() == player_class.key()) || player_class.parent.unwrap() == parent_class.key()
    )]
    parent_class: UncheckedAccount<'info>,
    #[account(mut)]
    receiver: UncheckedAccount<'info>,
    // See the [COMMON REMAINING ACCOUNTS] in lib.rs of item for this
}

#[derive(Accounts)]
#[instruction(args: DrainPlayerArgs)]
pub struct DrainPlayer<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Box<Account<'info, Player>>,
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump,
        constraint=player.parent == player_class.key()
    )]
    player_class: Box<Account<'info, PlayerClass>>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: BuildPlayerArgs)]
pub struct BuildPlayer<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        init,
        seeds=[
            PREFIX.as_bytes(),
            new_player_mint.key().as_ref(),
            &args.new_player_index.to_le_bytes()
        ],
        bump,
        payer=payer,
        space=args.space as usize,
        constraint=args.space as usize >= MIN_PLAYER_SIZE
    )]
    new_player: Box<Account<'info, Player>>,
    new_player_mint: Box<Account<'info, Mint>>,
    new_player_metadata: UncheckedAccount<'info>,
    new_player_edition: UncheckedAccount<'info>,
    #[account(
        constraint=new_player_token.mint == new_player_mint.key() && new_player_token.owner == new_player_token_holder.key(),
    )]
    new_player_token: Box<Account<'info, TokenAccount>>,
    // may be required signer if builder must be holder in item class is true
    new_player_token_holder: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}
#[derive(Accounts)]
#[instruction(args: UpdatePlayerArgs)]
pub struct UpdatePlayer<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX.as_bytes(),
            args.player_class_mint.as_ref(),
            &args.class_index.to_le_bytes()
        ],
        bump=player_class.bump
    )]
    player_class: Box<Account<'info, PlayerClass>>,
    #[account(
        mut,
        constraint=player.parent == player_class.key(),
        seeds=[
            PREFIX.as_bytes(),
            args.player_mint.as_ref(),
            &args.index.to_le_bytes()
        ],
        bump=player.bump
    )]
    player: Box<Account<'info, Player>>,
    // These below only needed if trying to do something other than permissionless inheritance propagation
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EquippedItem {
    item: Pubkey,
    amount: u64,
    index: u16,
}

pub const MAX_NAMESPACES: usize = 10;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum PermissivenessType {
    TokenHolder,
    ParentTokenHolder,
    UpdateAuthority,
    Anybody,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug, Copy)]
pub enum InheritanceState {
    NotInherited,
    Inherited,
    Overridden,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    pub namespace: Pubkey,
    pub indexed: bool,
    pub inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ChildUpdatePropagationPermissiveness {
    pub overridable: bool,
    pub inherited: InheritanceState,
    pub child_update_propagation_permissiveness_type: ChildUpdatePropagationPermissivenessType,
}

pub trait Inherited: Clone {
    fn set_inherited(&mut self, i: InheritanceState);
    fn get_inherited(&self) -> &InheritanceState;
}

impl Inherited for ChildUpdatePropagationPermissiveness {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

impl Inherited for BasicStatTemplate {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

impl Inherited for BodyPart {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

impl Inherited for PlayerCategory {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

impl Inherited for StatsUri {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

impl Inherited for Permissiveness {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

impl Inherited for Boolean {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

impl Inherited for NamespaceAndIndex {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
    fn get_inherited(&self) -> &InheritanceState {
        &self.inherited
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum ChildUpdatePropagationPermissivenessType {
    UpdatePermissiveness,
    InstanceUpdatePermissiveness,
    BuildPermissiveness,
    ChildUpdatePropagationPermissiveness,
    ChildrenMustBeEditionsPermissiveness,
    BuilderMustBeHolderPermissiveness,
    StakingPermissiveness,
    Namespaces,
    EquipItemPermissiveness,
    AddItemPermissiveness,
    UseItemPermissiveness,
    BasicStatTemplates,
    DefaultCategory,
    BodyParts,
    StatsUri,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerCategory {
    category: String,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StatsUri {
    stats_uri: String,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BodyPart {
    pub index: u16,
    pub body_part: String,
    pub total_item_spots: Option<u64>,
    pub inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerClassData {
    pub settings: PlayerClassSettings,
    pub config: PlayerClassConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Boolean {
    pub inherited: InheritanceState,
    pub boolean: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub struct Permissiveness {
    pub inherited: InheritanceState,
    pub permissiveness_type: PermissivenessType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerClassSettings {
    pub default_category: Option<PlayerCategory>,
    pub children_must_be_editions: Option<Boolean>,
    pub builder_must_be_holder: Option<Boolean>,
    pub update_permissiveness: Option<Vec<Permissiveness>>,
    pub instance_update_permissiveness: Option<Vec<Permissiveness>>,
    pub build_permissiveness: Option<Vec<Permissiveness>>,
    pub equip_item_permissiveness: Option<Vec<Permissiveness>>,
    pub add_item_permissiveness: Option<Vec<Permissiveness>>,
    pub use_item_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use equip permissiveness
    pub unequip_item_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use remove item permissiveness
    pub remove_item_permissiveness: Option<Vec<Permissiveness>>,
    pub staking_warm_up_duration: Option<u64>,
    pub staking_cooldown_duration: Option<u64>,
    pub staking_permissiveness: Option<Vec<Permissiveness>>,
    // if not set, assumed to use staking permissiveness
    pub unstaking_permissiveness: Option<Vec<Permissiveness>>,
    pub child_update_propagation_permissiveness: Option<Vec<ChildUpdatePropagationPermissiveness>>,
}

pub const MIN_PLAYER_CLASS_SIZE: usize = 8 + // key
1 + // namespaces
1 + // parent
1 + // mint
1 + // metadata
1 + // edition
1 + // default category
1 + // children must be editions
1 + // builder must be holder
1 + // update permissiveness
1 + // instance update permissiveness
1 + // build permissiveness
1 + // equip item perm
1 + // add item
1 + // unequip
1 + // remove
1 + //staking warm up
1 + // staking cooldoiwn
1 + // staking perms
1 + // staking unperms
1 + // child update prop
1 + // starting stats
1 + // basic stats
1 + // body parts
1 + // equip callback
1 + // add to pack callback
8 + // existing children
1; //bump

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerClassConfig {
    pub starting_stats_uri: Option<StatsUri>,
    pub basic_stats: Option<Vec<BasicStatTemplate>>,
    pub body_parts: Option<Vec<BodyPart>>,
    pub equip_validation: Option<Callback>,
    pub add_to_pack_validation: Option<Callback>,
}

/// seed ['player', player program, mint, namespace]
#[account]
pub struct PlayerClass {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    pub parent: Option<Pubkey>,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    pub edition: Option<Pubkey>,
    pub data: PlayerClassData,
    pub existing_children: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Callback {
    pub key: Pubkey,
    pub code: u64,
}

pub const MIN_PLAYER_SIZE: usize = 8 + // key
1 + // namespaces
1 + // padding(?)
32 + // parent
8 + // class index,
1 + // mint,
1 + // metadata
1 + // edition
1 + // stats uri
1 + //bump
8 + // tokens staked
8 + // active items 
8 + // item types in backpack
1 + // category
4 + // equipped items
1; // basic stats

/// seed ['player', player program, mint, namespace] also
#[account]
pub struct Player {
    pub namespaces: Option<Vec<NamespaceAndIndex>>,
    // extra byte that is always 1 to simulate same structure as player class.
    pub padding: u8,
    pub parent: Pubkey,
    pub class_index: u64,
    pub mint: Option<Pubkey>,
    pub metadata: Option<Pubkey>,
    pub edition: Option<Pubkey>,
    pub bump: u8,
    pub tokens_staked: u64,
    pub active_item_counter: u64,
    pub items_in_backpack: u64,
    pub data: PlayerData,
    pub equipped_items: Vec<EquippedItem>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerData {
    pub stats_uri: Option<StatsUri>,
    pub category: Option<PlayerCategory>,
    pub basic_stats: Option<Vec<BasicStat>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicStatTemplate {
    pub index: u16,
    pub name: String,
    pub stat_type: BasicStatType,
    pub inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BasicStat {
    pub index: u16,
    pub state: BasicStatState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Threshold {
    name: String,
    value: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicStatType {
    Enum {
        starting: u8,
        values: Vec<Threshold>,
    },
    Integer {
        min: Option<i64>,
        max: Option<i64>,
        starting: i64,
        staking_amount_scaler: Option<u64>,
        staking_duration_scaler: Option<u64>,
    },
    Bool {
        starting: bool,
        staking_flip: Option<u64>,
    },
    String {
        starting: String,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum BasicStatState {
    Enum {
        current: u8,
    },
    Integer {
        base: i64,
        with_temporary_changes: i64,
        temporary_numerator: i64,
        temporary_denominator: i64,
        finalized: i64,
    },
    Bool {
        current: bool,
    },
    String {
        current: String,
    },
    Null,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Copy)]
pub enum StatDiffType {
    Wearable,
    Consumable,
}

const PLAYER_ITEM_ACTIVATION_MARKER_MIN_SPACE: usize = 8 + // key
1 + //bump
32 + //player
32 + //item
2 + // usage index
1 + // basic item effects option
1 + // bie bitmap option
8 + // amount
8 +  // activated_at
8; // active_item_coiunter

#[account]
pub struct PlayerItemActivationMarker {
    pub bump: u8,
    pub player: Pubkey,
    pub item: Pubkey,
    pub usage_index: u16,
    pub basic_item_effects: Option<Vec<BasicItemEffect>>,
    pub removed_bie_bitmap: Option<Vec<u8>>,
    pub amount: u64,
    pub activated_at: u64,
    pub active_item_counter: u64,
}

// Copied from Item class because Anchor sucks and can't do imports

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Copy)]
pub enum BasicItemEffectType {
    Increment,
    Decrement,
    IncrementPercent,
    DecrementPercent,
    IncrementPercentFromBase,
    DecrementPercentFromBase,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicItemEffect {
    pub amount: u64,
    pub stat: String,
    pub item_effect_type: BasicItemEffectType,
    pub active_duration: Option<u64>,
    pub staking_amount_numerator: Option<u64>,
    pub staking_amount_divisor: Option<u64>,
    pub staking_duration_numerator: Option<u64>,
    pub staking_duration_divisor: Option<u64>,
    // point where this effect no longer applies
    pub max_uses: Option<u64>,
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
    #[msg("No parent present")]
    NoParentPresent,
    #[msg("Expected parent")]
    ExpectedParent,
    #[msg("You need to kill the children before killing the parent")]
    ChildrenStillExist,
    #[msg("Unstake tokens first")]
    UnstakeTokensFirst,
    #[msg("Must be holder to build")]
    MustBeHolderToBuild,
    #[msg("Cannot remove this much of this item because there is not enough of it or too much of it is equipped")]
    CannotRemoveThisMuch,
    #[msg("This item lacks a usage root")]
    UsageRootNotPresent,
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("Item contains no usages")]
    ItemContainsNoUsages,
    #[msg("Found no item usage matching this index")]
    FoundNoMatchingUsage,
    #[msg("Cannot equip consumable")]
    CannotEquipConsumable,
    #[msg("This body part cannot equip this item")]
    BodyPartNotEligible,
    #[msg("Cannot unequip this much")]
    CannotUnequipThisMuch,
    #[msg("Body part contains too many items of this type on it")]
    BodyPartContainsTooManyOfThisType,
    #[msg("Body part contains too many items")]
    BodyPartContainsTooMany,
    #[msg("Cannot equip item without usage or merkle")]
    CannotEquipItemWithoutUsageOrMerkle,
    #[msg("No body parts to equip")]
    NoBodyPartsToEquip,
    #[msg("Unable to find body part with this index")]
    UnableToFindBodyPartByIndex,
    #[msg("Item cannot be paired with self")]
    ItemCannotBePairedWithSelf,
    #[msg("Item cannot be equipped because a DNP entry is also equipped")]
    ItemCannotBeEquippedWithDNPEntry,
    #[msg("Template stat type does not match stat of player, try updating player permissionlessly before running this command again")]
    BasicStatTemplateTypeDoesNotMatchBasicStatType,
    #[msg("Cannot numerically alter this type of stat")]
    CannotAlterThisTypeNumerically,
    #[msg("Unreachable code")]
    Unreachable,
    #[msg("Not valid for use yet")]
    NotValidForUseYet,
    #[msg("Remove equipped items first")]
    RemoveEquipmentFirst,
    #[msg("Deactivate all items first")]
    DeactivateAllItemsFirst,
    #[msg("Remove all items from backpack first")]
    RemoveAllItemsFromBackpackFirst,
    #[msg("Insufficient Balance")]
    InsufficientBalance,
    #[msg("Permissiveness Not Found")]
    PermissivenessNotFound,
    #[msg("Must specify permissiveness type")]
    MustSpecifyPermissivenessType,
    #[msg("Cannot use the same index in basic stats or body parts twice")]
    IndexAlreadyUsed,
    #[msg("Cannot use the same name in basic stats or body parts twice")]
    NameAlreadyUsed,
    #[msg("Cannot reset player until item effects removed")]
    CannotResetPlayerStatsUntilItemEffectsAreRemoved,
}
