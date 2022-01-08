pub mod utils;

use {
    crate::utils::{
        assert_builder_must_be_holder_check, assert_derivation, assert_initialized, assert_is_ata,
        assert_keys_equal, assert_metadata_valid, assert_mint_authority_matches_mint,
        assert_owned_by, assert_part_of_namespace, assert_permissiveness_access, assert_signer,
        assert_valid_item_settings_for_edition_type, close_token_account,
        create_or_allocate_account_raw, create_program_token_account_if_not_present,
        get_mask_and_index_for_seq, propagate_item_class_data_fields_to_item_data, spl_token_burn,
        spl_token_mint_to, spl_token_transfer, transfer_mint_authority,
        update_item_class_with_inherited_information, verify, verify_component, verify_cooldown,
        AssertPermissivenessAccessArgs, TokenBurnParams, TokenTransferParams,
        TransferMintAuthorityArgs, VerifyComponentArgs, VerifyCooldownArgs,
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
    arrayref::array_ref,
    metaplex_token_metadata::{
        instruction::{
            create_master_edition, create_metadata_accounts,
            mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
        },
        state::Metadata,
    },
    spl_token::instruction::{initialize_account2, mint_to},
    std::str::FromStr,
};
anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const PREFIX: &str = "item";
pub const STAKING_COUNTER: &str = "staking";
pub const MARKER: &str = "marker";
pub const PLAYER_ID: &str = "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateItemClassArgs {
    item_class_bump: u8,
    class_index: u64,
    parent_class_index: Option<u64>,
    space: usize,
    desired_namespace_array_size: usize,
    update_permissiveness_to_use: Option<Permissiveness>,
    store_mint: bool,
    store_metadata_fields: bool,
    item_class_data: ItemClassData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainItemClassArgs {
    class_index: u64,
    update_permissiveness_to_use: Option<Permissiveness>,
    item_class_mint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateItemClassArgs {
    class_index: u64,
    update_permissiveness_to_use: Option<Permissiveness>,
    item_class_data: Option<ItemClassData>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainItemArgs {
    index: u64,
    class_index: u64,
    item_mint: Pubkey,
    item_class_mint: Pubkey,
    update_permissiveness_to_use: Option<Permissiveness>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateItemEscrowArgs {
    craft_bump: u8,
    class_index: u64,
    index: u64,
    component_scope: String,
    amount_to_make: u64,
    namespace_index: Option<u64>,
    item_class_mint: Pubkey,
    build_permissiveness_to_use: Option<Permissiveness>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddCraftItemToEscrowArgs {
    token_bump: u8,
    class_index: u64,
    craft_item_index: u64,
    index: u64,
    component_scope: String,
    amount_to_make: u64,
    item_class_mint: Pubkey,
    new_item_mint: Pubkey,
    originator: Pubkey,
    build_permissiveness_to_use: Option<Permissiveness>,
    // These required if using roots
    component_proof: Option<Vec<[u8; 32]>>,
    component: Option<Component>,
    craft_usage_info: Option<CraftUsageInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StartItemEscrowBuildPhaseArgs {
    class_index: u64,
    index: u64,
    component_scope: String,
    amount_to_make: u64,
    item_class_mint: Pubkey,
    originator: Pubkey,
    new_item_mint: Pubkey,
    build_permissiveness_to_use: Option<Permissiveness>,
    // The following fields are optional for use with component roots.
    // Proof containing information on the total number of steps in the proof
    end_node_proof: Option<Vec<[u8; 32]>>,
    // Total steps you are claiming (to be proved by the end node proof) exist
    // Will be used with step field on item escrow to determine if you have
    // actually completed all steps in the proof.
    total_steps: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteItemEscrowBuildPhaseArgs {
    new_item_bump: u8,
    class_index: u64,
    index: u64,
    component_scope: String,
    amount_to_make: u64,
    space: u64,
    item_class_mint: Pubkey,
    originator: Pubkey,
    build_permissiveness_to_use: Option<Permissiveness>,
    store_mint: bool,
    store_metadata_fields: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeginItemStakeWarmupArgs {
    item_intermediary_staking_bump: u8,
    staking_counter_bump: u8,
    class_index: u64,
    index: u64,
    staking_index: u64,
    item_class_mint: Pubkey,
    staking_amount: u64,
    staking_permissiveness_to_use: Option<Permissiveness>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndItemStakeWarmupArgs {
    item_intermediary_staking_bump: u8,
    item_mint_staking_bump: u8,
    class_index: u64,
    index: u64,
    staking_index: u64,
    item_class_mint: Pubkey,
    staking_amount: u64,
    staking_permissiveness_to_use: Option<Permissiveness>,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DeactivateItemEscrowArgs {
    index: u64,
    component_scope: String,
    amount_to_make: u64,
    item_class_mint: Pubkey,
    new_item_mint: Pubkey,
    new_item_token: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DrainItemEscrowArgs {
    index: u64,
    component_scope: String,
    amount_to_make: u64,
    item_class_mint: Pubkey,
    new_item_mint: Pubkey,
    new_item_token: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RemoveCraftItemFromEscrowArgs {
    token_bump: u8,
    class_index: u64,
    craft_item_index: u64,
    index: u64,
    component_scope: String,
    amount_to_make: u64,
    item_class_mint: Pubkey,
    new_item_mint: Pubkey,
    originator: Pubkey,
    craft_item_token_mint: Pubkey,
    build_permissiveness_to_use: Option<Permissiveness>,
    // These required if using roots
    component_proof: Option<Vec<[u8; 32]>>,
    component: Option<Component>,
}

#[program]
pub mod item {

    use super::*;

    pub fn create_item_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateItemClass<'info>>,
        args: CreateItemClassArgs,
    ) -> ProgramResult {
        let CreateItemClassArgs {
            item_class_bump,
            class_index,
            parent_class_index,
            desired_namespace_array_size,
            update_permissiveness_to_use,
            store_mint,
            store_metadata_fields,
            item_class_data,
            ..
        } = args;
        let mut item_class = &mut ctx.accounts.item_class;
        let item_class_info = item_class.to_account_info();
        let item_mint = &ctx.accounts.item_mint;
        let metadata = &ctx.accounts.metadata;
        let edition = &ctx.accounts.edition;
        let parent = &ctx.accounts.parent;
        let ed = edition.to_account_info();

        let edition_option = if edition.data_len() > 0 {
            Some(&ed)
        } else {
            let mint_authority_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 2];
            let token_program_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 1];
            assert_keys_equal(*token_program_info.key, spl_token::id())?;
            assert_mint_authority_matches_mint(&item_mint.mint_authority, &mint_authority_info)?;
            if item_mint.mint_authority != COption::Some(item_class.key()) {
                transfer_mint_authority(TransferMintAuthorityArgs {
                    item_class_key: &item_class.key(),
                    item_class_info: &item_class_info,
                    mint_authority_info,
                    token_program_info: token_program_info,
                    mint: item_mint,
                })?;
            }
            None
        };

        assert_valid_item_settings_for_edition_type(edition_option, &item_class_data)?;

        assert_metadata_valid(
            &metadata.to_account_info(),
            edition_option,
            &item_mint.key(),
        )?;

        if !parent.data_is_empty() && parent.to_account_info().owner == ctx.program_id {
            let mut parent_deserialized: anchor_lang::Account<'_, ItemClass> =
                Account::try_from(&parent.to_account_info())?;
            if let Some(dc) = &parent_deserialized.data.update_permissiveness {
                assert_permissiveness_access(AssertPermissivenessAccessArgs {
                    program_id: ctx.program_id,
                    given_account: parent,
                    remaining_accounts: ctx.remaining_accounts,
                    permissiveness_to_use: &update_permissiveness_to_use,
                    permissiveness_array: &item_class.data.update_permissiveness,
                    index: parent_class_index.unwrap(),
                    account_mint: None,
                })?;
            } else {
                return Err(ErrorCode::PermissivenessNotFound.into());
            }
            item_class.parent = Some(parent.key());

            parent_deserialized.existing_children = parent_deserialized
                .existing_children
                .checked_add(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;

            update_item_class_with_inherited_information(&mut item_class, &parent_deserialized);
        } else {
            assert_permissiveness_access(AssertPermissivenessAccessArgs {
                program_id: ctx.program_id,
                given_account: &item_class_info,
                remaining_accounts: ctx.remaining_accounts,
                permissiveness_to_use: &Some(Permissiveness {
                    permissiveness_type: PermissivenessType::UpdateAuthority,
                    inherited: InheritanceState::NotInherited,
                }),
                permissiveness_array: &Some(vec![Permissiveness {
                    permissiveness_type: PermissivenessType::UpdateAuthority,
                    inherited: InheritanceState::NotInherited,
                }]),
                index: class_index,
                account_mint: Some(&item_mint.key()),
            })?;
        }

        item_class.data = item_class_data;
        item_class.bump = item_class_bump;
        if store_metadata_fields {
            item_class.metadata = Some(metadata.key());
            item_class.edition = if edition.data_is_empty() {
                Some(edition.key())
            } else {
                None
            }
        }

        if store_mint {
            item_class.mint = Some(item_mint.key());
        }
        if desired_namespace_array_size > 0 {
            let mut namespace_arr = vec![];

            for _n in 0..desired_namespace_array_size {
                namespace_arr.push(NamespaceAndIndex {
                    namespace: anchor_lang::solana_program::system_program::id(),
                    indexed: false,
                    inherited: InheritanceState::NotInherited,
                });
            }

            item_class.namespaces = Some(namespace_arr);
        } else {
            item_class.namespaces = None
        }

        Ok(())
    }

    pub fn update_item_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateItemClass<'info>>,
        args: UpdateItemClassArgs,
    ) -> ProgramResult {
        let UpdateItemClassArgs {
            class_index,
            update_permissiveness_to_use,
            item_class_data,
        } = args;

        let item_class = &mut ctx.accounts.item_class;
        let item_mint = &ctx.accounts.item_mint;
        // The only case where only one account is passed in is when you are just
        // requesting a permissionless inheritance update.
        if ctx.remaining_accounts.len() == 1 {
            let parent = &ctx.remaining_accounts[0];
            if let Some(ic_parent) = item_class.parent {
                assert_keys_equal(parent.key(), ic_parent)?;
            } else {
                return Err(ErrorCode::NoParentPresent.into());
            }
            let parent_deserialized: anchor_lang::Account<'_, ItemClass> =
                Account::try_from(parent)?;

            update_item_class_with_inherited_information(item_class, &parent_deserialized);
        } else if let Some(icd) = item_class_data {
            assert_permissiveness_access(AssertPermissivenessAccessArgs {
                program_id: ctx.program_id,
                given_account: &item_class.to_account_info(),
                remaining_accounts: ctx.remaining_accounts,
                permissiveness_to_use: &update_permissiveness_to_use,
                permissiveness_array: &item_class.data.update_permissiveness,
                index: class_index,
                account_mint: Some(&item_mint.key()),
            })?;

            item_class.data = icd;
        }
        Ok(())
    }

    pub fn drain_item_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainItemClass<'info>>,
        args: DrainItemClassArgs,
    ) -> ProgramResult {
        let DrainItemClassArgs {
            class_index,
            update_permissiveness_to_use,
            item_class_mint,
        } = args;
        let item_class = &mut ctx.accounts.item_class;
        let receiver = &ctx.accounts.receiver;
        let parent = &ctx.accounts.parent_class;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &update_permissiveness_to_use,
            permissiveness_array: &item_class.data.update_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint.key()),
        })?;

        require!(item_class.existing_children == 0, ChildrenStillExist);

        if !parent.data_is_empty() && parent.to_account_info().owner == ctx.program_id {
            let mut parent_deserialized: anchor_lang::Account<'_, ItemClass> =
                Account::try_from(&parent.to_account_info())?;

            parent_deserialized.existing_children = parent_deserialized
                .existing_children
                .checked_sub(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        let item_class_info = item_class.to_account_info();
        let snapshot: u64 = item_class_info.lamports();

        **item_class_info.lamports.borrow_mut() = 0;

        **receiver.lamports.borrow_mut() = receiver
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn drain_item<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainItem<'info>>,
        args: DrainItemArgs,
    ) -> ProgramResult {
        let item_class = &mut ctx.accounts.item_class;
        let item = &mut ctx.accounts.item;
        let receiver = &ctx.accounts.receiver;

        let DrainItemArgs {
            class_index,
            item_class_mint,
            update_permissiveness_to_use,
            ..
        } = args;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &update_permissiveness_to_use,
            permissiveness_array: &item_class.data.update_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint.key()),
        })?;

        require!(item.tokens_staked == 0, UnstakeTokensFirst);

        item_class.existing_children = item_class
            .existing_children
            .checked_sub(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        let item_info = item.to_account_info();
        let snapshot: u64 = item_info.lamports();

        **item_info.lamports.borrow_mut() = 0;

        **receiver.lamports.borrow_mut() = receiver
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn create_item_escrow<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateItemEscrow<'info>>,
        args: CreateItemEscrowArgs,
    ) -> ProgramResult {
        let item_class = &ctx.accounts.item_class;
        let item_escrow = &mut ctx.accounts.item_escrow;
        let new_item_mint = &ctx.accounts.new_item_mint;
        let new_item_metadata = &ctx.accounts.new_item_metadata;
        let new_item_edition = &ctx.accounts.new_item_edition;
        let new_item_token = &ctx.accounts.new_item_token;
        let new_item_token_holder = &ctx.accounts.new_item_token_holder;
        let ed = new_item_edition.to_account_info();

        let CreateItemEscrowArgs {
            craft_bump,
            class_index,
            amount_to_make,
            namespace_index,
            item_class_mint,
            build_permissiveness_to_use,
            ..
        } = args;

        if amount_to_make == 0 {
            return Err(ErrorCode::CannotMakeZero.into());
        }

        assert_builder_must_be_holder_check(item_class, new_item_token_holder)?;

        assert_is_ata(
            &new_item_token.to_account_info(),
            &new_item_token_holder.key(),
            &new_item_mint.key(),
        )?;

        let edition_option = if new_item_edition.data_len() > 0 {
            // we know already new item token holder is above 0, this is edition, so supply = 1.
            // amount to make better = 1.
            if amount_to_make != 1 || new_item_token.amount != 1 {
                return Err(ErrorCode::InsufficientBalance.into());
            }
            Some(&ed)
        } else {
            let mint_authority_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 2];
            let token_program_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 1];
            assert_keys_equal(*token_program_info.key, spl_token::id())?;
            assert_mint_authority_matches_mint(
                &new_item_mint.mint_authority,
                &mint_authority_info,
            )?;
            // give minting for the item to the item's class since we will need it
            // to produce the fungible tokens when completed. Can also then be reused.
            if mint_authority_info.key != &item_class.key() {
                transfer_mint_authority(TransferMintAuthorityArgs {
                    item_class_key: &item_class.key(),
                    item_class_info: &item_class.to_account_info(),
                    mint_authority_info,
                    token_program_info: token_program_info,
                    mint: new_item_mint,
                })?;
            }
            None
        };

        assert_metadata_valid(new_item_metadata, edition_option, &new_item_mint.key())?;

        item_escrow.bump = craft_bump;

        if let Some(namespaces) = &item_class.namespaces {
            if let Some(ns_index) = namespace_index {
                item_escrow.namespaces = Some(vec![NamespaceAndIndex {
                    namespace: namespaces[ns_index as usize].namespace,
                    indexed: false,
                    inherited: InheritanceState::Inherited,
                }]);
            }
        }

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &build_permissiveness_to_use,
            permissiveness_array: &item_class.data.build_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint),
        })?;
        Ok(())
    }

    pub fn add_craft_item_to_escrow<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, AddCraftItemToEscrow<'info>>,
        args: AddCraftItemToEscrowArgs,
    ) -> ProgramResult {
        let item_class = &ctx.accounts.item_class;
        let item_escrow = &mut ctx.accounts.item_escrow;
        let new_item_token_holder = &ctx.accounts.new_item_token_holder;
        let craft_item_token_mint = &ctx.accounts.craft_item_token_mint;
        let craft_item_token_account_escrow = &ctx.accounts.craft_item_token_account_escrow;
        let craft_item_transfer_authority = &ctx.accounts.craft_item_transfer_authority;
        let craft_item_token_account = &ctx.accounts.craft_item_token_account;
        let craft_item = &ctx.accounts.craft_item;
        let craft_item_class = &ctx.accounts.craft_item_class;
        let token_program = &ctx.accounts.token_program;

        let AddCraftItemToEscrowArgs {
            class_index,
            component_scope,
            amount_to_make,
            item_class_mint,
            build_permissiveness_to_use,
            component_proof,
            component,
            craft_usage_info,
            ..
        } = args;

        assert_builder_must_be_holder_check(item_class, new_item_token_holder)?;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &build_permissiveness_to_use,
            permissiveness_array: &item_class.data.build_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint),
        })?;

        require!(!item_escrow.deactivated, DeactivatedItemEscrow);

        require!(!item_escrow.build_began.is_some(), BuildPhaseAlreadyStarted);

        let chosen_component = verify_component(VerifyComponentArgs {
            item_class,
            component,
            component_proof,
            item_escrow,
            craft_item_token_mint: &craft_item_token_mint.key(),
            component_scope,
        })?;

        if let Some(time) = chosen_component.time_to_build {
            if let Some(already_set_time) = item_escrow.time_to_build {
                require!(time == already_set_time, TimeToBuildMismatch)
            } else {
                item_escrow.time_to_build = chosen_component.time_to_build;
            }
        }

        if chosen_component.condition == ComponentCondition::Cooldown
            || chosen_component.condition == ComponentCondition::CooldownAndConsume
        {
            verify_cooldown(VerifyCooldownArgs {
                craft_usage_info,
                craft_item_class,
                craft_item,
                chosen_component: &chosen_component,
            })?;
        }

        assert_keys_equal(chosen_component.mint, craft_item_token_mint.key())?;

        if chosen_component.condition != ComponentCondition::Absence {
            let amount_to_take = craft_item_token_account
                .amount
                .checked_mul(amount_to_make)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            require!(
                amount_to_take
                    < chosen_component
                        .amount
                        .checked_mul(amount_to_make)
                        .ok_or(ErrorCode::NumericalOverflowError)?,
                InsufficientBalance
            );

            if chosen_component.condition == ComponentCondition::Consumed
                || chosen_component.condition == ComponentCondition::CooldownAndConsume
            {
                spl_token_burn(TokenBurnParams {
                    mint: craft_item_token_mint.to_account_info(),
                    source: craft_item_token_account.to_account_info(),
                    amount: amount_to_take,
                    authority: craft_item_transfer_authority.to_account_info(),
                    authority_signer_seeds: None,
                    token_program: token_program.to_account_info(),
                })?;
            } else {
                spl_token_transfer(TokenTransferParams {
                    source: craft_item_token_account.to_account_info(),
                    destination: craft_item_token_account_escrow.to_account_info(),
                    amount: amount_to_take,
                    authority: craft_item_transfer_authority.to_account_info(),
                    authority_signer_seeds: &[],
                    token_program: token_program.to_account_info(),
                })?;
            }
        } else {
            // Absence works specifically as overall supply being 0 - only way
            // to truly make it work and avoid workarounds. This means while you can technically have a fungible
            // be absence, the user must find and burn all tokens to get this condition satisfied.
            require!(craft_item_token_mint.supply == 0, BalanceNeedsToBeZero)
        }

        item_escrow.step = item_escrow
            .step
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }

    pub fn remove_craft_item_from_escrow<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, RemoveCraftItemFromEscrow<'info>>,
        args: RemoveCraftItemFromEscrowArgs,
    ) -> ProgramResult {
        let item_class = &ctx.accounts.item_class;
        let item_escrow = &mut ctx.accounts.item_escrow;
        let new_item_token_holder = &ctx.accounts.new_item_token_holder;
        let craft_item_token_account_escrow = &ctx.accounts.craft_item_token_account_escrow;
        let craft_item_token_account = &ctx.accounts.craft_item_token_account;
        let token_program = &ctx.accounts.token_program;
        let receiver = &ctx.accounts.receiver;

        let RemoveCraftItemFromEscrowArgs {
            class_index,
            component_scope,
            item_class_mint,
            build_permissiveness_to_use,
            component_proof,
            component,
            craft_item_token_mint,
            ..
        } = args;

        assert_builder_must_be_holder_check(item_class, new_item_token_holder)?;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &build_permissiveness_to_use,
            permissiveness_array: &item_class.data.build_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint),
        })?;

        require!(item_escrow.deactivated, NotDeactivated);

        let chosen_component = verify_component(VerifyComponentArgs {
            item_class,
            component,
            component_proof,
            item_escrow,
            craft_item_token_mint: &craft_item_token_mint,
            component_scope,
        })?;

        assert_keys_equal(chosen_component.mint, craft_item_token_mint)?;

        let item_class_seeds = [
            PREFIX.as_bytes(),
            item_class_mint.as_ref(),
            &class_index.to_le_bytes(),
            &[item_class.bump],
        ];
        // Give back any in the escrow. Any that should have been burned will have been.
        spl_token_transfer(TokenTransferParams {
            source: craft_item_token_account_escrow.to_account_info(),
            destination: craft_item_token_account.to_account_info(),
            amount: craft_item_token_account_escrow.amount,
            authority: item_class.to_account_info(),
            authority_signer_seeds: &item_class_seeds,
            token_program: token_program.to_account_info(),
        })?;

        item_escrow.step = item_escrow
            .step
            .checked_sub(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        close_token_account(
            craft_item_token_account_escrow,
            receiver,
            token_program,
            &item_class.to_account_info(),
            &item_class_seeds,
        )?;
        Ok(())
    }

    pub fn start_item_escrow_build_phase<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, StartItemEscrowBuildPhase<'info>>,
        args: StartItemEscrowBuildPhaseArgs,
    ) -> ProgramResult {
        let item_class = &ctx.accounts.item_class;
        let item_escrow = &mut ctx.accounts.item_escrow;
        let new_item_token_holder = &ctx.accounts.new_item_token_holder;
        let clock = &ctx.accounts.clock;

        let StartItemEscrowBuildPhaseArgs {
            class_index,
            item_class_mint,
            build_permissiveness_to_use,
            end_node_proof,
            total_steps,
            ..
        } = args;

        assert_builder_must_be_holder_check(item_class, new_item_token_holder)?;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &build_permissiveness_to_use,
            permissiveness_array: &item_class.data.build_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint),
        })?;

        require!(!item_escrow.deactivated, DeactivatedItemEscrow);

        require!(!item_escrow.build_began.is_some(), BuildPhaseAlreadyStarted);

        if let Some(components) = &item_class.data.components {
            require!(
                components.len() == item_escrow.step as usize,
                StillMissingComponents
            );
        } else if let Some(component_root) = &item_class.data.component_root {
            if let Some(en_proof) = end_node_proof {
                if let Some(total_s) = total_steps {
                    // Verify the merkle proof.
                    let node = anchor_lang::solana_program::keccak::hashv(&[
                        &[0x00],
                        &total_s.to_le_bytes(),
                    ]);
                    // Proof that the component root has as a leaf the number of steps,
                    // and that the one you sent up matches that
                    require!(verify(en_proof, component_root.root, node.0), InvalidProof);
                    require!(total_s == item_escrow.step, StillMissingComponents);
                } else {
                    return Err(ErrorCode::MissingMerkleInfo.into());
                }
            } else {
                return Err(ErrorCode::MissingMerkleInfo.into());
            }
        } else {
            return Err(ErrorCode::MustUseMerkleOrComponentList.into());
        };

        item_escrow.build_began = Some(clock.unix_timestamp);

        Ok(())
    }

    pub fn complete_item_escrow_build_phase<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CompleteItemEscrowBuildPhase<'info>>,
        args: CompleteItemEscrowBuildPhaseArgs,
    ) -> ProgramResult {
        let item_class = &mut ctx.accounts.item_class;
        let item_escrow = &mut ctx.accounts.item_escrow;
        let new_item = &mut ctx.accounts.new_item;
        let new_item_mint = &ctx.accounts.new_item_mint;
        let new_item_token_holder = &ctx.accounts.new_item_token_holder;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let metadata = &ctx.accounts.new_item_metadata;
        let edition = &ctx.accounts.new_item_edition;
        let ed = edition.to_account_info();

        let CompleteItemEscrowBuildPhaseArgs {
            new_item_bump,
            class_index,
            amount_to_make,
            item_class_mint,
            build_permissiveness_to_use,
            store_mint,
            store_metadata_fields,
            ..
        } = args;

        let edition_option = if edition.data_len() > 0 {
            Some(&ed)
        } else {
            None
        };

        assert_metadata_valid(
            &metadata.to_account_info(),
            edition_option,
            &new_item_mint.key(),
        )?;

        assert_builder_must_be_holder_check(item_class, new_item_token_holder)?;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &build_permissiveness_to_use,
            permissiveness_array: &item_class.data.build_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint),
        })?;

        require!(!item_escrow.deactivated, DeactivatedItemEscrow);

        if let Some(build_began) = item_escrow.build_began {
            if let Some(time_to_build) = item_escrow.time_to_build {
                let finish = (build_began)
                    .checked_add(time_to_build as i64)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
                if clock.unix_timestamp < finish as i64 {
                    msg!(
                        "Unix ts is {} but build won't finish till {}",
                        clock.unix_timestamp,
                        finish
                    );
                    return Err(ErrorCode::BuildPhaseNotFinished.into());
                }
            }
        } else {
            return Err(ErrorCode::BuildPhaseNotStarted.into());
        }

        new_item.bump = new_item_bump;
        new_item.parent = item_class.key();

        if store_mint {
            new_item.mint = Some(new_item_mint.key());
        }

        if store_metadata_fields {
            new_item.metadata = Some(metadata.key());
            new_item.edition = if let Some(ed) = edition_option {
                Some(ed.key())
            } else {
                None
            };
        }

        propagate_item_class_data_fields_to_item_data(new_item, item_class);

        if new_item_mint.supply <= 1 {
            item_class.existing_children = item_class
                .existing_children
                .checked_add(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        if amount_to_make > 1 {
            // means it's a fungible mint, so we are minting the tokens, vs
            // an NFT which has been pre-minted already due to constraints on token metadata
            // time to mint!

            let signer_seeds = [
                PREFIX.as_bytes(),
                item_class_mint.as_ref(),
                &class_index.to_le_bytes(),
                &[item_class.bump],
            ];

            spl_token_mint_to(
                new_item_mint.to_account_info(),
                new_item_token_holder.to_account_info(),
                amount_to_make,
                item_class.to_account_info(),
                &signer_seeds,
                token_program.to_account_info(),
            )?;
        }

        item_escrow.deactivated = true;

        Ok(())
    }

    pub fn begin_item_stake_warmup<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BeginItemStakeWarmup<'info>>,
        args: BeginItemStakeWarmupArgs,
    ) -> ProgramResult {
        let namespace = &ctx.accounts.namespace;
        let item = &ctx.accounts.item;
        let item_class = &ctx.accounts.item_class;
        let staking_escrow = &mut ctx.accounts.item_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.item_intermediary_staking_counter;
        let staking_mint = &ctx.accounts.staking_mint;
        let staking_account = &ctx.accounts.staking_token_account;
        let staking_transfer_authority = &ctx.accounts.staking_transfer_authority;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        let BeginItemStakeWarmupArgs {
            staking_counter_bump,
            class_index,
            item_class_mint,
            staking_amount,
            staking_permissiveness_to_use,
            ..
        } = args;

        staking_counter.bump = staking_counter_bump;
        staking_counter.staking_start = clock.unix_timestamp;

        let namespace = assert_part_of_namespace(&item.to_account_info(), namespace)?;

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &staking_permissiveness_to_use,
            permissiveness_array: &item_class.data.staking_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint),
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
                return Ok(());
            }
        }
        return Err(ErrorCode::StakingMintNotWhitelisted.into());
    }

    pub fn end_item_stake_warmup<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EndItemStakeWarmup<'info>>,
        args: EndItemStakeWarmupArgs,
    ) -> ProgramResult {
        let item = &mut ctx.accounts.item;
        let item_class = &ctx.accounts.item_class;
        let item_mint = &ctx.accounts.item_mint;
        let staking_escrow = &mut ctx.accounts.item_intermediary_staking_account;
        let staking_counter = &mut ctx.accounts.item_intermediary_staking_counter;
        let staking_mint = &ctx.accounts.staking_mint;
        let item_mint_staking_account = &ctx.accounts.item_mint_staking_account;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let system = &ctx.accounts.system_program;
        let payer = &ctx.accounts.payer;
        let rent = &ctx.accounts.rent;

        let EndItemStakeWarmupArgs {
            class_index,
            index,
            item_class_mint,
            staking_amount,
            staking_permissiveness_to_use,
            ..
        } = args;

        require!(staking_counter.staking_start > 0, StakingWarmupNotStarted);
        if let Some(duration) = item_class.data.staking_warm_up_duration {
            require!(
                staking_counter
                    .staking_start
                    .checked_add(duration as i64)
                    .ok_or(ErrorCode::NumericalOverflowError)?
                    <= clock.unix_timestamp,
                StakingWarmupNotFinished
            )
        }

        assert_permissiveness_access(AssertPermissivenessAccessArgs {
            program_id: ctx.program_id,
            given_account: &item_class.to_account_info(),
            remaining_accounts: ctx.remaining_accounts,
            permissiveness_to_use: &staking_permissiveness_to_use,
            permissiveness_array: &item_class.data.staking_permissiveness,
            index: class_index,
            account_mint: Some(&item_class_mint),
        })?;

        let item_mint_key = item_mint.key();

        let signer_seeds = [
            PREFIX.as_bytes(),
            item_mint_key.as_ref(),
            &index.to_le_bytes(),
            &[item.bump],
        ];

        let item_info = item.to_account_info();

        create_program_token_account_if_not_present(
            item_mint_staking_account,
            system,
            &payer.to_account_info(),
            token_program,
            staking_mint,
            &item_info,
            rent,
            &signer_seeds,
        )?;

        spl_token_transfer(TokenTransferParams {
            source: staking_escrow.to_account_info(),
            destination: item_mint_staking_account.to_account_info(),
            amount: staking_amount,
            authority: item_info,
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
            &item.to_account_info(),
            &signer_seeds,
        )?;

        item.tokens_staked = item
            .tokens_staked
            .checked_add(staking_amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        return Ok(());
    }

    pub fn deactivate_item_escrow<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DeactivateItemEscrow<'info>>,
        _args: DeactivateItemEscrowArgs,
    ) -> ProgramResult {
        let item_escrow = &mut ctx.accounts.item_escrow;

        require!(!item_escrow.deactivated, AlreadyDeactivated);

        item_escrow.build_began = None;
        item_escrow.deactivated = true;

        Ok(())
    }

    pub fn drain_item_escrow<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DrainItemEscrow<'info>>,
        _args: DrainItemEscrowArgs,
    ) -> ProgramResult {
        let item_escrow = &mut ctx.accounts.item_escrow;
        let originator = &ctx.accounts.originator;

        require!(item_escrow.deactivated, NotDeactivated);

        require!(item_escrow.step == 0, NotEmptied);

        let item_escrow_info = item_escrow.to_account_info();
        let snapshot: u64 = item_escrow_info.lamports();

        **item_escrow_info.lamports.borrow_mut() = 0;

        **originator.lamports.borrow_mut() = originator
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
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
#[instruction(args: CreateItemClassArgs)]
pub struct CreateItemClass<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(init, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &args.class_index.to_le_bytes()], bump=args.item_class_bump, space=args.space, payer=payer, constraint=args.space >= MIN_ITEM_CLASS_SIZE)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    metadata: UncheckedAccount<'info>,
    edition: UncheckedAccount<'info>,
    // is the parent item class (if there is one.) Otherwise use system.
    #[account(mut)]
    parent: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // If parent is unset, need to provide:
    // metadata_update_authority [signer]
    // metadata [readable]
    // If parent is set, and update permissiveness is token holder can update:
    // parent token_account [readable]
    // parent token_holder [signer]
    // parent mint [readable]
    // If parent is set, and update permissiveness is class holder can update
    // parent's class token_account [readable]
    // parent's class token_holder [signer]
    // parent's class [readable]
    // parent's class's mint [readable]
    // If parent is set and update permissiveness is update authority can update
    // parent's metadata_update_authority [signer]
    // parent's metadata [readable]
    // parent's mint [readable]
    // If parent is set and update permissiveness is anybody can update, nothing further is required.

    // Furthermore, if edition is not present (ie you are creating a Fungible token mint, not an NFT)
    // you need to pass up:
    // mint_authority [signer] for minting authority to be handed over
    // token program [readable]
}

#[derive(Accounts)]
#[instruction(args: CreateItemEscrowArgs)]
pub struct CreateItemEscrow<'info> {
    #[account(seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    new_item_mint: Account<'info, Mint>,
    new_item_metadata: UncheckedAccount<'info>,
    new_item_edition: UncheckedAccount<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), payer.key().as_ref(), new_item_mint.key().as_ref(), new_item_token.key().as_ref(), &args.index.to_le_bytes(), &args.amount_to_make.to_le_bytes(), &args.component_scope.as_bytes()], bump=args.craft_bump, space=if args.namespace_index.is_none() { 18 } else { 4 + 1 + raindrops_namespace::NAMESPACE_AND_INDEX_SIZE + 18} , payer=payer)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: AddCraftItemToEscrowArgs)]
pub struct AddCraftItemToEscrow<'info> {
    #[account(seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    // payer is in seed so that draining funds can only be done by original payer
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), args.originator.as_ref(), args.new_item_mint.as_ref(),new_item_token.key().as_ref(), &args.index.to_le_bytes(), &args.amount_to_make.to_le_bytes(), &args.component_scope.as_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == args.new_item_mint && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    // cant be stolen to a different craft item token account due to seed by token key
    #[account(init, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), args.new_item_mint.as_ref(), payer.key().as_ref(), craft_item_token_account.key().as_ref(), &args.index.to_le_bytes(), craft_item_token_account.mint.as_ref()], bump=args.token_bump, token::mint = craft_item_token_mint, token::authority = item_class, payer=payer)]
    craft_item_token_account_escrow: Account<'info, TokenAccount>,
    craft_item_token_mint: Account<'info, Mint>,
    #[account(mut, constraint=craft_item_token_account.mint == craft_item_token_mint.key())]
    craft_item_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), craft_item_token_mint.key().as_ref(), &args.craft_item_index.to_le_bytes()], bump=craft_item.bump)]
    craft_item: Account<'info, Item>,
    #[account(constraint=craft_item.parent == craft_item_class.key())]
    craft_item_class: Account<'info, ItemClass>,
    craft_item_transfer_authority: Signer<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: RemoveCraftItemFromEscrowArgs)]
pub struct RemoveCraftItemFromEscrow<'info> {
    #[account(seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), args.originator.as_ref(), args.new_item_mint.as_ref(), new_item_token.key().as_ref(),&args.index.to_le_bytes(), &args.amount_to_make.to_le_bytes(), &args.component_scope.as_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == args.new_item_mint && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    // cant be stolen to a different craft item token account due to seed by token key
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), args.new_item_mint.as_ref(),receiver.key().as_ref(), craft_item_token_account.key().as_ref(), &args.index.to_le_bytes()], bump=args.token_bump)]
    craft_item_token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    craft_item_token_account: Account<'info, TokenAccount>,
    // account funds will be drained here from craft_item_token_account_escrow
    receiver: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: DeactivateItemEscrowArgs)]
pub struct DeactivateItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), originator.key().as_ref(), args.new_item_mint.as_ref(),args.new_item_token.as_ref(), &args.index.to_le_bytes(), &args.amount_to_make.to_le_bytes(), &args.component_scope.as_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    originator: Signer<'info>,
}
#[derive(Accounts)]
#[instruction(args: DrainItemEscrowArgs)]
pub struct DrainItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), originator.key().as_ref(), args.new_item_mint.as_ref(),args.new_item_token.as_ref(), &args.index.to_le_bytes(), &args.amount_to_make.to_le_bytes(), &args.component_scope.as_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    originator: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(args: StartItemEscrowBuildPhaseArgs)]
pub struct StartItemEscrowBuildPhase<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), args.originator.as_ref(), args.new_item_mint.key().as_ref(), new_item_token.key().as_ref(),&args.index.to_le_bytes(), &args.amount_to_make.to_le_bytes(), &args.component_scope.as_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == args.new_item_mint && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: CompleteItemEscrowBuildPhaseArgs)]
pub struct CompleteItemEscrowBuildPhase<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    #[account(init, seeds=[PREFIX.as_bytes(), new_item_mint.key().as_ref(), &args.index.to_le_bytes()], bump=args.new_item_bump, payer=payer, space=args.space as usize, constraint= args.space as usize >= MIN_ITEM_SIZE)]
    new_item: Account<'info, Item>,
    new_item_mint: Account<'info, Mint>,
    new_item_metadata: UncheckedAccount<'info>,
    new_item_edition: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), args.originator.as_ref(), new_item_mint.key().as_ref(), new_item_token.key().as_ref(),&args.index.to_le_bytes(), &args.amount_to_make.to_le_bytes(), &args.component_scope.as_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: BeginItemStakeWarmupArgs)]
pub struct BeginItemStakeWarmup<'info> {
    #[account(seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    #[account(seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &args.index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    #[account(init, seeds=[PREFIX.as_bytes(),args.item_class_mint.as_ref(), item_mint.key().as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes()], bump=args.item_intermediary_staking_bump, token::mint = staking_mint, token::authority = item, payer=payer)]
    item_intermediary_staking_account: Account<'info, TokenAccount>,
    #[account(init, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(),item_mint.key().as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes(), STAKING_COUNTER.as_bytes()], bump=args.staking_counter_bump, space=8+1+8, payer=payer)]
    item_intermediary_staking_counter: Account<'info, StakingCounter>,
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
#[instruction(args: EndItemStakeWarmupArgs)]
pub struct EndItemStakeWarmup<'info> {
    #[account(seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &args.index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    #[account(mut, seeds=[PREFIX.as_bytes(),args.item_class_mint.as_ref(), item_mint.key().as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes()], bump=args.item_intermediary_staking_bump)]
    item_intermediary_staking_account: Account<'info, TokenAccount>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(),item_mint.key().as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref(), &args.staking_index.to_le_bytes(), STAKING_COUNTER.as_bytes()], bump=item_intermediary_staking_counter.bump)]
    item_intermediary_staking_counter: Account<'info, StakingCounter>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.as_ref(), item_mint.key().as_ref(), &args.index.to_le_bytes(), &staking_mint.key().as_ref()], bump=args.item_mint_staking_bump)]
    item_mint_staking_account: UncheckedAccount<'info>,
    staking_mint: Account<'info, Mint>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: UpdateItemClassArgs)]
pub struct UpdateItemClass<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
    // also if you JUST pass up the parent key as the third account, with NO item data to update,
    // this command will permissionlessly enforce inheritance rules on the item class from it's parent.
}

#[derive(Accounts)]
#[instruction(args: DrainItemClassArgs)]
pub struct DrainItemClass<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.key().as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    #[account(mut)]
    parent_class: UncheckedAccount<'info>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(args: DrainItemArgs)]
pub struct DrainItem<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_mint.key().as_ref(), &args.index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    #[account(mut, seeds=[PREFIX.as_bytes(), args.item_class_mint.key().as_ref(), &args.class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(item_activation_bump: u8, index: u64, item_class_mint: Pubkey)]
pub struct BeginItemActivation<'info> {
    #[account( seeds=[PREFIX.as_bytes(), item_class_mint.as_ref(),item_mint.key().as_ref(), &index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    #[account(init, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &index.to_le_bytes(), MARKER.as_bytes()], bump=item_activation_bump, space=9, payer=payer)]
    item_activation_marker: UncheckedAccount<'info>,
    item_mint: Account<'info, Mint>,
    // payer required here as extra key to guarantee some paying entity for anchor
    // however this signer should match one of the signers in COMMON REMAINING ACCOUNTS
    payer: Signer<'info>,
    #[account(constraint = player_program.key() == Pubkey::from_str(PLAYER_ID).unwrap())]
    player_program: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(item_activation_bump: u8, index: u64, item_class_mint: Pubkey)]
pub struct EndItemActivation<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.as_ref(),item_mint.key().as_ref(), &index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    // funds from this will be drained to the signer in common remaining accounts for safety
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &index.to_le_bytes(), MARKER.as_bytes()], bump=item_activation_marker.data.borrow_mut()[0])]
    item_activation_marker: UncheckedAccount<'info>,
    item_mint: Account<'info, Mint>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Callback(pub Pubkey, pub u64);

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemUsage {
    index: u16,
    category: Vec<String>,
    basic_item_effects: Option<Vec<BasicItemEffect>>,
    usage_permissiveness: Vec<PermissivenessType>,
    inherited: InheritanceState,
    item_class_type: ItemClassType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemClassType {
    Wearable {
        body_part: Vec<String>,
        limit_per_part: Option<u64>,
        wearable_callback: Option<Callback>,
    },
    Consumable {
        max_uses: Option<u64>,
        // If none, is assumed to be 1 (to save space)
        max_players_per_use: Option<u64>,
        item_class_usage_type: ItemClassUsageType,
        consumption_callback: Option<Callback>,
        cooldown_duration: Option<i64>,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemUsageState {
    index: u16,
    item_type: ItemType,
    uses: u64,
    activated_at: Option<i64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemType {
    Wearable,
    Consumable { item_usage_type: ItemUsageType },
}

pub const ITEM_USAGE_TYPE_SIZE: usize = 9;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ItemClassUsageType {
    Exhaustion,
    Destruction,
    Infinite,
}

pub const ITEM_USAGE_TYPE_STATE_SIZE: usize = 9;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageType {
    Exhaustion,
    Destruction,
    Infinite,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
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
    amount: u64,
    stat: String,
    item_effect_type: BasicItemEffectType,
    active_duration: Option<i64>,
    staking_amount_numerator: Option<u64>,
    staking_amount_divisor: Option<u64>,
    staking_duration_numerator: Option<u64>,
    staking_duration_divisor: Option<u64>,
    // point where this effect no longer applies
    max_uses: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ComponentCondition {
    Consumed,
    Presence,
    // Specifically, mint.supply == 0.
    Absence,
    Cooldown,
    CooldownAndConsume,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Component {
    mint: Pubkey,
    amount: u64,
    // Should be a per-scope, but double layered arrays suck for inheritance
    // therefore we splat this out in duplicative fashion.
    // Only needs to be set on one component to get picked up by the builder.
    time_to_build: Option<u64>,
    // To have more than one way to craft a component, silo components like this
    component_scope: String,
    // used to find a valid cooldown state to check for cooldown status on the
    // crafting item
    use_category: String,
    condition: ComponentCondition,
    inherited: InheritanceState,
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
pub struct DefaultItemCategory {
    category: String,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
    inherited: InheritanceState,
}

pub const MIN_ITEM_CLASS_SIZE: usize = 8 + // key
1 + // mint
1 + // metadata
1 + // edition
1 + // default item category
4 + // number of namespaces
1 + // children must be editions
1 + // build permissiveness bool
1 + // staking permissiveness bool
1 + // number of default update permissivenesses
1 + // default update permissiveness minimum (could have no way to update)
1 + // child update propagation opt
1 + // parent
1 + // number of usages
1 +  // number of components
4 + // roots
2 + // staking durations
8 + // existing children
1; //bump

pub trait Inherited: Clone {
    fn set_inherited(&mut self, i: InheritanceState);
}

impl Inherited for Root {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for DefaultItemCategory {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for ItemUsage {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for Component {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for Permissiveness {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for ChildUpdatePropagationPermissiveness {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for Boolean {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for NamespaceAndIndex {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Root {
    inherited: InheritanceState,
    root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Boolean {
    inherited: InheritanceState,
    boolean: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemClassData {
    children_must_be_editions: Option<Boolean>,
    builder_must_be_holder: Option<Boolean>,
    default_category: Option<DefaultItemCategory>,
    update_permissiveness: Option<Vec<Permissiveness>>,
    build_permissiveness: Option<Vec<Permissiveness>>,
    staking_permissiveness: Option<Vec<Permissiveness>>,
    child_update_propagation_permissiveness: Option<Vec<ChildUpdatePropagationPermissiveness>>,
    // The roots are merkle roots, used to keep things cheap on chain (optional)
    // Tried to combine roots and vec into a single Option to keep it simple
    // but this led to a proliferation of trait code and dyn statements and I couldnt
    // get it to work. Sorry!
    usage_root: Option<Root>,
    staking_root: Option<Root>,
    // Used to seed the root for new items
    usage_state_root: Option<Root>,
    component_root: Option<Root>,
    // Note that both usages and components are mutually exclusive with usage_root and component_root - if those are set, these are considered
    // cached values, and root is source of truth. Up to you to keep them up to date.
    usages: Option<Vec<ItemUsage>>,
    components: Option<Vec<Component>>,
    staking_warm_up_duration: Option<u64>,
    staking_cooldown_duration: Option<u64>,
}

#[account]
pub struct ItemClass {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    parent: Option<Pubkey>,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    bump: u8,
    data: ItemClassData,
    existing_children: u64,
}

#[account]
pub struct ItemEscrow {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    bump: u8,
    deactivated: bool,
    step: u64,
    time_to_build: Option<u64>,
    build_began: Option<i64>,
}

#[account]
pub struct StakingCounter {
    bump: u8,
    staking_start: i64,
}

// can make this super cheap
pub const MIN_ITEM_SIZE: usize = 8 + // key
1 + // mint
1 + // metadata
32 + // parent
1 + // edition
1 + // item usage states
1 + // root
8 + // unique tokens staked
1; //bump

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemData {
    usage_state_root: Option<Root>,
    // if state root is set, usage states is considered a cache, not source of truth
    usage_states: Option<Vec<ItemUsageState>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CraftUsageInfo {
    // a specific usage state that is in the cooldown phase if the component condition is "Cooldown"
    pub craft_usage_state_proof: Vec<[u8; 32]>,
    pub craft_usage_state: ItemUsageState,
    pub craft_usage_proof: Vec<[u8; 32]>,
    pub craft_usage: ItemUsage,
}

#[account]
pub struct Item {
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
    data: ItemData,
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
    #[msg("Cannot make zero of an item")]
    CannotMakeZero,
    #[msg("Must be token holder to build against it")]
    MustBeHolderToBuild,
    #[msg("This config is invalid for fungible mints")]
    InvalidConfigForFungibleMints,
    #[msg("Missing the merkle fields")]
    MissingMerkleInfo,
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("Item ready for completion")]
    ItemReadyForCompletion,
    #[msg("In order for crafting to work there must be either a component list or a component merkle root")]
    MustUseMerkleOrComponentList,
    #[msg("In order for crafting to work there must be either a usage state list on the craft component or a usage merkle root")]
    MustUseMerkleOrUsageState,
    #[msg("Unable to find a valid cooldown state")]
    UnableToFindValidCooldownState,
    #[msg("Balance needs to be zero")]
    BalanceNeedsToBeZero,
    #[msg("This component is not part of this escrow's component scope")]
    NotPartOfComponentScope,
    #[msg("The time to build on two disparate components in the same scope is different. Either unset one or make them both the same.")]
    TimeToBuildMismatch,
    #[msg("This staking mint has not been whitelisted in this namespace")]
    StakingMintNotWhitelisted,
    #[msg("Build phase not started")]
    BuildPhaseNotStarted,
    #[msg("Build phase not finished")]
    BuildPhaseNotFinished,
    #[msg("Item escrow has been deactivated")]
    DeactivatedItemEscrow,
    #[msg("Build phase already started")]
    BuildPhaseAlreadyStarted,
    #[msg("You havent added all components to the escrow")]
    StillMissingComponents,
    #[msg("You havent started staking yet")]
    StakingWarmupNotStarted,
    #[msg("You havent finished your warm up period")]
    StakingWarmupNotFinished,
    #[msg("You cannot delete this class until all children are deleted")]
    ChildrenStillExist,
    #[msg("An item cannot be destroyed until all its staked tokens are unstaked")]
    UnstakeTokensFirst,
    #[msg("Already deactivated")]
    AlreadyDeactivated,
    #[msg("Escrow not deactivated")]
    NotDeactivated,
    #[msg("Item escrow not emptied")]
    NotEmptied,
}
