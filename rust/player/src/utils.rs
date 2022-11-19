use std::{convert::TryInto, str::FromStr};

use crate::{
    AddOrRemoveItemValidationArgs, BasicItemEffect, BasicItemEffectType, BasicStat, BasicStatState,
    BasicStatTemplate, BasicStatType, BodyPart, ChildUpdatePropagationPermissivenessType,
    CopyBeginItemActivationBecauseAnchorSucksSometimesArgs,
    CopyEndItemActivationBecauseAnchorSucksSometimesArgs,
    CopyUpdateValidForUseIfWarmupPassedBecauseAnchorSucksSometimesArgs, EquippedItem, ErrorCode,
    InheritanceState, Inherited, ItemCallbackArgs, NamespaceAndIndex, Permissiveness,
    PermissivenessType, Player, PlayerClass, PlayerClassData, StatDiffType,
    UpdateValidForUseIfWarmupPassedOnItemArgs, UseItemArgs, NAMESPACE_ID, PREFIX,
};
use anchor_lang::{
    error,
    prelude::{
        Account, AccountInfo, AccountMeta, Clock, Program, Pubkey, Rent, Result, Signer, System,
        Sysvar, UncheckedAccount,
    },
    require,
    solana_program::{
        instruction::Instruction,
        msg,
        program::{invoke, invoke_signed},
        system_instruction,
    },
    AnchorDeserialize, AnchorSerialize, Key, ToAccountInfo,
};
use anchor_spl::token::{Mint, Token, TokenAccount};
use raindrops_item::{
    utils::{
        assert_derivation, assert_is_ata, assert_keys_equal, assert_metadata_valid, assert_signer,
        get_item_usage, grab_parent, grab_update_authority, sighash, GetItemUsageArgs,
    },
    Item, ItemActivationMarker, ItemClass, ItemUsage,
};

pub fn update_player_class_with_inherited_information(
    player: &mut Account<PlayerClass>,
    player_class_data: &mut PlayerClassData,
    parent_item: &Account<PlayerClass>,
    parent_item_data: &PlayerClassData,
) {
    match &parent_item_data
        .settings
        .child_update_propagation_permissiveness
    {
        Some(cupp) => {
            for update_perm in cupp {
                match update_perm.child_update_propagation_permissiveness_type {
                    ChildUpdatePropagationPermissivenessType::StakingPermissiveness => {
                        player_class_data.settings.staking_permissiveness = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.settings.staking_permissiveness,
                            child_items: &player_class_data.settings.staking_permissiveness,
                            overridable: update_perm.overridable,
                        });

                        player_class_data.settings.unstaking_permissiveness = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.settings.unstaking_permissiveness,
                            child_items: &player_class_data.settings.unstaking_permissiveness,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::UpdatePermissiveness => {
                        player_class_data.settings.update_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.update_permissiveness,
                                child_items: &player_class_data.settings.update_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::BuildPermissiveness => {
                        player_class_data.settings.build_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.build_permissiveness,
                                child_items: &player_class_data.settings.build_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::ChildUpdatePropagationPermissiveness => {
                        player_class_data.settings.child_update_propagation_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.child_update_propagation_permissiveness,
                                child_items: &player_class_data.settings.child_update_propagation_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::ChildrenMustBeEditionsPermissiveness => {
                        player_class_data.settings.children_must_be_editions = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.settings.children_must_be_editions,
                            child: &player_class_data.settings.children_must_be_editions,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::BuilderMustBeHolderPermissiveness => {
                        player_class_data.settings.builder_must_be_holder = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.settings.builder_must_be_holder,
                            child: &player_class_data.settings.builder_must_be_holder,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::Namespaces => {
                        player.namespaces = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item.namespaces,
                            child_items: &player.namespaces,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::InstanceUpdatePermissiveness => {
                        player_class_data.settings.instance_update_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.instance_update_permissiveness,
                                child_items: &player_class_data.settings.instance_update_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    },
                    ChildUpdatePropagationPermissivenessType::EquipItemPermissiveness => {
                        player_class_data.settings.equip_item_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.equip_item_permissiveness,
                                child_items: &player_class_data.settings.equip_item_permissiveness,
                                overridable: update_perm.overridable,
                            });
                        player_class_data.settings.unequip_item_permissiveness =
                        propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.settings.unequip_item_permissiveness,
                            child_items: &player_class_data.settings.unequip_item_permissiveness,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::UseItemPermissiveness => {
                        player_class_data.settings.use_item_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.use_item_permissiveness,
                                child_items: &player_class_data.settings.use_item_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    },
                    ChildUpdatePropagationPermissivenessType::AddItemPermissiveness =>  {
                        player_class_data.settings.add_item_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.add_item_permissiveness,
                                child_items: &player_class_data.settings.add_item_permissiveness,
                                overridable: update_perm.overridable,
                            });
                        player_class_data.settings.remove_item_permissiveness =
                        propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.settings.remove_item_permissiveness,
                            child_items: &player_class_data.settings.remove_item_permissiveness,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::BasicStatTemplates => {
                        player_class_data.config.basic_stats = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.config.basic_stats,
                            child_items: &player_class_data.config.basic_stats,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::DefaultCategory => {
                        player_class_data.settings.default_category = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.settings.default_category,
                            child: &player_class_data.settings.default_category,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::StatsUri => {
                        player_class_data.config.starting_stats_uri = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.config.starting_stats_uri,
                            child: &player_class_data.config.starting_stats_uri,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::BodyParts => {
                        player_class_data.config.body_parts = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.config.body_parts,
                            child_items: &player_class_data.config.body_parts,
                            overridable: update_perm.overridable,
                        });
                    },
                }
            }
        }
        None => {
            // do nothing
        }
    }
}

pub fn assert_builder_must_be_holder_check(
    player_class_data: &PlayerClassData,
    new_player_token_holder: &UncheckedAccount,
) -> Result<()> {
    if let Some(b) = &player_class_data.settings.builder_must_be_holder {
        if b.boolean {
            require!(new_player_token_holder.is_signer, MustBeHolderToBuild)
        }
    }

    Ok(())
}

pub struct RunItemCallbackArgs<'b, 'c, 'info> {
    pub player_class: &'b Account<'info, PlayerClass>,
    pub item_class: &'b Account<'info, ItemClass>,
    pub item: &'b Account<'info, Item>,
    pub player: &'b Account<'info, Player>,
    pub callback_program: &'c UncheckedAccount<'info>,
    pub item_usage: &'b raindrops_item::ItemUsage,
    pub amount: u64,
    pub class_index: u64,
    pub index: u64,
    pub item_class_mint: Pubkey,
    pub usage_permissiveness_to_use: Option<PermissivenessType>,
    pub usage_index: u16,
}

pub fn run_item_callback<'b, 'c, 'info>(args: RunItemCallbackArgs<'b, 'c, 'info>) -> Result<()> {
    let RunItemCallbackArgs {
        player_class,
        item_class,
        item,
        player,
        amount,
        callback_program,
        item_usage,
        class_index,
        index,
        item_class_mint,
        usage_permissiveness_to_use,
        usage_index,
    } = args;

    if let Some(callback) = &item_usage.callback {
        let item_class_info = item_class.to_account_info();
        let item_info = item.to_account_info();
        let player_info = player.to_account_info();
        let player_class_info = player_class.to_account_info();
        let accounts = vec![
            item_info,
            item_class_info,
            player_info,
            player_class_info,
            callback_program.to_account_info(),
        ];
        assert_keys_equal(callback_program.key(), callback.key)?;

        let keys = vec![
            AccountMeta::new_readonly(item_class.key(), false),
            AccountMeta::new_readonly(item.key(), false),
            AccountMeta::new_readonly(player.key(), false),
            AccountMeta::new_readonly(player_class.key(), false),
        ];

        invoke(
            &Instruction {
                program_id: callback.key,
                accounts: keys,
                data: AnchorSerialize::try_to_vec(&ItemCallbackArgs {
                    instruction: raindrops_item::utils::sighash("global", "use_item_callback"),
                    extra_identifier: callback.code,
                    amount,
                    class_index,
                    index,
                    item_class_mint,
                    usage_permissiveness_to_use,
                    usage_index,
                    usage_info: None,
                })?,
            },
            &accounts,
        )?;
    }

    Ok(())
}

pub struct RunItemValidationArgs<'a, 'b, 'c, 'info> {
    pub player_class: &'b Account<'info, PlayerClass>,
    pub item_class: &'b Account<'info, ItemClass>,
    pub item: &'b Account<'info, Item>,
    pub item_account: &'b Account<'info, TokenAccount>,
    pub player_item_account: &'b Account<'info, TokenAccount>,
    pub player: &'b mut Account<'info, Player>,
    pub item_mint: &'b Account<'info, Mint>,
    pub validation_program: &'c UncheckedAccount<'info>,
    pub player_mint: &'a Pubkey,
    pub item_permissiveness_to_use: Option<PermissivenessType>,
    pub amount: u64,
    pub add: bool,
}

pub fn run_item_validation<'a, 'b, 'c, 'info>(
    args: RunItemValidationArgs<'a, 'b, 'c, 'info>,
) -> Result<()> {
    let RunItemValidationArgs {
        player_class,
        item_class,
        item,
        item_account,
        player_item_account,
        player,
        item_mint,
        validation_program,
        player_mint,
        item_permissiveness_to_use,
        amount,
        add,
    } = args;

    if let Some(validation) = &player_class.data.config.add_to_pack_validation {
        let item_class_info = item_class.to_account_info();
        let item_info = item.to_account_info();
        let item_account_info = item_account.to_account_info();
        let player_item_account_info = player_item_account.to_account_info();
        let player_info = player.to_account_info();
        let player_class_info = player_class.to_account_info();
        let item_mint_info = item_mint.to_account_info();
        let accounts = vec![
            item_info,
            item_class_info,
            player_info,
            player_class_info,
            item_account_info,
            player_item_account_info,
            item_mint_info,
            validation_program.to_account_info(),
        ];
        assert_keys_equal(validation_program.key(), validation.key)?;

        let keys = vec![
            AccountMeta::new_readonly(item.key(), false),
            AccountMeta::new_readonly(item_class.key(), false),
            AccountMeta::new_readonly(player.key(), false),
            AccountMeta::new_readonly(player_class.key(), false),
            AccountMeta::new_readonly(item_account.key(), false),
            AccountMeta::new_readonly(player_item_account.key(), false),
            AccountMeta::new_readonly(item_mint.key(), false),
        ];

        let name = if add {
            "add_item_validation"
        } else {
            "remove_item_validation"
        };
        invoke(
            &Instruction {
                program_id: validation.key,
                accounts: keys,
                data: AnchorSerialize::try_to_vec(&AddOrRemoveItemValidationArgs {
                    instruction: raindrops_item::utils::sighash("global", name),
                    extra_identifier: validation.code,
                    player_mint: *player_mint,
                    item_permissiveness_to_use,
                    amount,
                })?,
            },
            &accounts,
        )?;
    }

    Ok(())
}

pub fn propagate_player_class_data_fields_to_player_data(
    player: &mut Account<Player>,
    player_class: &Account<PlayerClass>,
) {
    msg!("Setting namespaces");
    player.namespaces = player_class.namespaces.clone();

    msg!("Setting stats uri");
    if player.data.stats_uri.is_none() {
        player.data.stats_uri = player_class.data.config.starting_stats_uri.clone()
    }

    msg!("Setting category");
    if player.data.category.is_none() {
        player.data.category = player_class.data.settings.default_category.clone()
    }

    msg!("Building basic stats array");
    if let Some(player_stats) = &player_class.data.config.basic_stats {
        let mut states_length = 0;
        if let Some(states) = &player.data.basic_stats {
            states_length = states.len();
        }

        let mut existing_values: Vec<&BasicStat> =
            vec![
                &BasicStat {
                    index: 0,
                    state: BasicStatState::Null,
                };
                std::cmp::max(player_stats.len(), states_length)
            ];

        if let Some(states) = &player.data.basic_stats {
            for i in 0..states.len() {
                existing_values[states[i].index as usize] = &states[i];
            }
        }

        let mut new_values: Vec<BasicStat> = vec![
            BasicStat {
                index: 0,
                state: BasicStatState::Null,
            };
            std::cmp::max(player_stats.len(), states_length)
        ];

        for i in 0..player_stats.len() {
            let existing = existing_values[player_stats[i].index as usize];
            new_values[player_stats[i].index as usize] = BasicStat {
                index: player_stats[i].index,
                state: match &player_stats[i].stat_type {
                    BasicStatType::Enum { starting, values } => match existing.state {
                        BasicStatState::Enum { current } => {
                            let mut found = false;
                            for val in values {
                                if val.value == current {
                                    found = true;
                                }
                            }
                            BasicStatState::Enum {
                                current: if found { current } else { *starting },
                            }
                        }
                        _ => BasicStatState::Enum { current: *starting },
                    },
                    BasicStatType::Integer {
                        min, max, starting, ..
                    } => match existing.state {
                        BasicStatState::Integer {
                            finalized,
                            with_temporary_changes,
                            temporary_numerator,
                            temporary_denominator,
                            base,
                        } => {
                            let mut new_finalized = finalized;
                            let mut new_base = base;

                            if let Some(m) = max {
                                if new_finalized > *m {
                                    new_finalized = *m;
                                }
                                if new_base > *m {
                                    new_base = *m;
                                }
                            }

                            if let Some(m) = min {
                                if new_finalized < *m {
                                    new_finalized = *m;
                                }
                                if new_base < *m {
                                    new_base = *m;
                                }
                            }

                            BasicStatState::Integer {
                                finalized: new_finalized,
                                with_temporary_changes,
                                temporary_numerator,
                                temporary_denominator,
                                base: new_base,
                            }
                        }
                        _ => BasicStatState::Integer {
                            finalized: *starting,
                            with_temporary_changes: *starting,
                            temporary_numerator: 1,
                            temporary_denominator: 1,
                            base: *starting,
                        },
                    },
                    BasicStatType::Bool { starting, .. } => match existing.state {
                        BasicStatState::Bool { current, .. } => BasicStatState::Bool { current },
                        _ => BasicStatState::Bool { current: *starting },
                    },
                    BasicStatType::String { starting } => match &existing.state {
                        BasicStatState::String { current, .. } => BasicStatState::String {
                            current: current.clone(),
                        },
                        _ => BasicStatState::String {
                            current: starting.clone(),
                        },
                    },
                },
            }
        }

        msg!("Assigning basic stats");
        player.data.basic_stats = Some(new_values);
    }
}

pub struct VerifyItemUsageAppropriateForBodyPartArgs<'a, 'b, 'info> {
    pub used_body_part: &'a BodyPart,
    pub item_usage_index: u16,
    pub item_usage_proof: Option<Vec<[u8; 32]>>,
    pub item_usage: Option<ItemUsage>,
    pub item_class: &'b Account<'info, ItemClass>,
    pub equipping: bool,
    pub total_equipped_for_this_item: u64,
    pub total_equipped_for_this_body_part_for_this_item: u64,
    pub total_equipped_for_this_body_part: u64,
    pub equipped_items: &'a Vec<EquippedItem>,
}

pub fn verify_item_usage_appropriate_for_body_part<'a, 'b, 'info>(
    args: VerifyItemUsageAppropriateForBodyPartArgs<'a, 'b, 'info>,
) -> Result<ItemUsage> {
    let VerifyItemUsageAppropriateForBodyPartArgs {
        used_body_part,
        item_usage_index,
        item_usage,
        item_usage_proof,
        item_class,
        equipping,
        total_equipped_for_this_item,
        total_equipped_for_this_body_part_for_this_item,
        total_equipped_for_this_body_part,
        equipped_items,
    } = args;

    if let Some(tis) = used_body_part.total_item_spots {
        if total_equipped_for_this_body_part > tis && equipping {
            return Err(ErrorCode::BodyPartContainsTooMany.into());
        }
    }

    let usage_to_check = get_item_usage(GetItemUsageArgs {
        item_class,
        usage_index: item_usage_index,
        usage_proof: item_usage_proof,
        usage: item_usage,
    })?;

    if usage_to_check.do_not_pair_with_self && equipping && total_equipped_for_this_item > 0 {
        return Err(ErrorCode::ItemCannotBePairedWithSelf.into());
    }

    if let Some(dnp_list) = &usage_to_check.dnp {
        if equipping {
            for dnp_item in dnp_list {
                for equipped_item in equipped_items {
                    if equipped_item.item == dnp_item.key {
                        return Err(ErrorCode::ItemCannotBeEquippedWithDNPEntry.into());
                    }
                }
            }
        }
    }

    match &usage_to_check.item_class_type {
        raindrops_item::ItemClassType::Wearable {
            body_part,
            limit_per_part,
        } => {
            let mut found = false;
            for part in body_part {
                if &used_body_part.body_part == part {
                    found = true;
                    if let Some(lpp) = limit_per_part {
                        if total_equipped_for_this_body_part_for_this_item > *lpp && equipping {
                            return Err(ErrorCode::BodyPartContainsTooManyOfThisType.into());
                        }
                    }
                    break;
                }
            }
            if !found && equipping {
                return Err(ErrorCode::BodyPartNotEligible.into());
            }
        }
        raindrops_item::ItemClassType::Consumable { .. } => {
            return Err(ErrorCode::CannotEquipConsumable.into())
        }
    }

    Ok(usage_to_check)
}

pub struct RunToggleEquipItemValidationArgs<'a, 'b, 'c, 'info> {
    pub item_class: &'b Account<'info, ItemClass>,
    pub item: &'b Account<'info, Item>,
    pub player_item_account: &'b Account<'info, TokenAccount>,
    pub validation_program: &'c UncheckedAccount<'info>,
    pub permissiveness_to_use: Option<PermissivenessType>,
    pub amount: u64,
    pub item_usage: &'a ItemUsage,
    pub item_index: u64,
    pub item_class_index: u64,
    pub usage_index: u16,
    pub item_class_mint: &'a Pubkey,
}

pub fn run_toggle_equip_item_validation<'a, 'b, 'c, 'info>(
    args: RunToggleEquipItemValidationArgs<'a, 'b, 'c, 'info>,
) -> Result<()> {
    let RunToggleEquipItemValidationArgs {
        item_class,
        item,
        player_item_account,
        validation_program,
        permissiveness_to_use,
        amount,
        item_usage,
        item_index,
        item_class_index,
        usage_index,
        item_class_mint,
    } = args;

    if let Some(validation) = &item_usage.validation {
        let item_class_info = item_class.to_account_info();
        let item_info = item.to_account_info();
        let item_account_info = player_item_account.to_account_info();
        let accounts = vec![
            item_class_info,
            item_info,
            item_account_info,
            validation_program.to_account_info(),
        ];
        assert_keys_equal(validation_program.key(), validation.key)?;

        let keys = vec![
            AccountMeta::new_readonly(item_class.key(), false),
            AccountMeta::new_readonly(item.key(), false),
            AccountMeta::new_readonly(player_item_account.key(), false),
        ];

        invoke(
            &Instruction {
                program_id: validation.key,
                accounts: keys,
                data: AnchorSerialize::try_to_vec(&raindrops_item::ValidationArgs {
                    instruction: raindrops_item::utils::sighash("global", "item_validation"),
                    extra_identifier: validation.code,
                    usage_permissiveness_to_use: match permissiveness_to_use {
                        Some(v) => match v {
                            PermissivenessType::TokenHolder => {
                                Some(raindrops_item::PermissivenessType::TokenHolder)
                            }
                            PermissivenessType::ParentTokenHolder => {
                                Some(raindrops_item::PermissivenessType::ParentTokenHolder)
                            }
                            PermissivenessType::UpdateAuthority => {
                                Some(raindrops_item::PermissivenessType::UpdateAuthority)
                            }
                            PermissivenessType::Anybody => {
                                Some(raindrops_item::PermissivenessType::Anybody)
                            }
                        },
                        None => None,
                    },
                    index: item_index,
                    amount,
                    usage_info: None,
                    usage_index,
                    class_index: item_class_index,
                    item_class_mint: *item_class_mint,
                })?,
            },
            &accounts,
        )?;
    }

    Ok(())
}

pub struct BuildNewEquippedItemsAndProvideCountsArgs<'b, 'info> {
    pub player: &'b Account<'info, Player>,
    pub item: &'b Account<'info, Item>,
    pub body_part_index: u16,
    pub amount: u64,
    pub equipping: bool,
}

pub struct BuildNewEquippedItemsReturn {
    pub total_equipped_for_this_item: u64,
    pub total_equipped_for_this_body_part_for_this_item: u64,
    pub total_equipped_for_this_body_part: u64,
    pub new_eq_items: Vec<EquippedItem>,
}

pub fn build_new_equipped_items_and_provide_counts<'b, 'info>(
    args: BuildNewEquippedItemsAndProvideCountsArgs,
) -> Result<BuildNewEquippedItemsReturn> {
    let BuildNewEquippedItemsAndProvideCountsArgs {
        player,
        item,
        body_part_index,
        amount,
        equipping,
    } = args;
    let mut new_eq_items = vec![];
    let mut moving_amount = amount;
    let mut total_equipped_for_this_item: u64 = 0;
    let mut total_equipped_for_this_body_part_for_this_item: u64 = 0;
    let mut total_equipped_for_this_body_part: u64 = 0;
    for ei in &player.equipped_items {
        if ei.item == item.key() {
            total_equipped_for_this_item = total_equipped_for_this_item
                .checked_add(ei.amount)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        if ei.index == body_part_index {
            total_equipped_for_this_body_part = total_equipped_for_this_body_part
                .checked_add(ei.amount)
                .ok_or(ErrorCode::NumericalOverflowError)?;

            if ei.item == item.key() {
                let new_item = EquippedItem {
                    index: ei.index,
                    item: ei.item,
                    amount: if equipping {
                        moving_amount = 0;
                        ei.amount
                            .checked_add(moving_amount)
                            .ok_or(ErrorCode::NumericalOverflowError)?
                    } else if ei.amount < moving_amount {
                        moving_amount = moving_amount
                            .checked_sub(ei.amount)
                            .ok_or(ErrorCode::NumericalOverflowError)?;
                        0
                    } else {
                        let old_moving = moving_amount;
                        moving_amount = 0;
                        ei.amount
                            .checked_sub(old_moving)
                            .ok_or(ErrorCode::NumericalOverflowError)?
                    },
                };
                total_equipped_for_this_body_part_for_this_item =
                    total_equipped_for_this_body_part_for_this_item
                        .checked_add(new_item.amount)
                        .ok_or(ErrorCode::NumericalOverflowError)?;
                if new_item.amount > 0 {
                    new_eq_items.push(new_item);
                }
            } else {
                new_eq_items.push(EquippedItem {
                    index: ei.index,
                    item: ei.item,
                    amount: ei.amount,
                })
            }
        } else {
            new_eq_items.push(EquippedItem {
                index: ei.index,
                item: ei.item,
                amount: ei.amount,
            })
        }
    }

    if moving_amount > 0 {
        if equipping {
            new_eq_items.push(EquippedItem {
                index: body_part_index,
                item: item.key(),
                amount: moving_amount,
            });
            total_equipped_for_this_body_part_for_this_item =
                total_equipped_for_this_body_part_for_this_item
                    .checked_add(moving_amount)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
            total_equipped_for_this_body_part = total_equipped_for_this_body_part
                .checked_add(moving_amount)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            total_equipped_for_this_item = total_equipped_for_this_item
                .checked_add(moving_amount)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        } else {
            return Err(ErrorCode::CannotUnequipThisMuch.into());
        }
    }

    Ok(BuildNewEquippedItemsReturn {
        new_eq_items,
        total_equipped_for_this_body_part,
        total_equipped_for_this_item,
        total_equipped_for_this_body_part_for_this_item,
    })
}

pub fn find_used_body_part_from_index(
    player_class: &Account<PlayerClass>,
    body_part_index: u16,
    equipping: bool,
) -> Result<BodyPart> {
    if let Some(bp) = &player_class.data.config.body_parts {
        if bp.is_empty() {
            if !equipping {
                return Ok(BodyPart {
                    index: body_part_index,
                    body_part: "".to_owned(),
                    total_item_spots: None,
                    inherited: InheritanceState::NotInherited,
                });
            } else {
                return Err(ErrorCode::NoBodyPartsToEquip.into());
            }
        } else {
            let mut body_part = &bp[0];
            let mut found = false;
            for b in bp {
                if b.index == body_part_index {
                    body_part = b;
                    found = true;
                    break;
                }
            }

            if !found {
                if !equipping {
                    // So you can unequip even if bp has been removed.
                    return Ok(BodyPart {
                        index: body_part_index,
                        body_part: "".to_owned(),
                        total_item_spots: None,
                        inherited: InheritanceState::NotInherited,
                    });
                } else {
                    return Err(ErrorCode::NoBodyPartsToEquip.into());
                }
            }

            return Ok(body_part.clone());
        }
    };
    Err(ErrorCode::NoBodyPartsToEquip.into())
}

pub struct ToggleItemToBasicStatsArgs<'b, 'c, 'info> {
    pub player: &'b mut Account<'info, Player>,
    pub player_class: &'b Account<'info, PlayerClass>,
    pub item: &'b Account<'info, Item>,
    pub basic_item_effects: &'c Option<Vec<BasicItemEffect>>,
    pub amount_change: u64,
    pub adding: bool,
    pub stat_diff_type: StatDiffType,
    pub bie_bitmap: &'c mut Option<Vec<u8>>,
    pub unix_timestamp: i64,
    pub activated_at: i64,
}
pub fn toggle_item_to_basic_stats<'b, 'c, 'info>(
    args: ToggleItemToBasicStatsArgs<'b, 'c, 'info>,
) -> Result<bool> {
    let ToggleItemToBasicStatsArgs {
        player,
        player_class,
        item,
        basic_item_effects,
        adding,
        amount_change,
        stat_diff_type,
        bie_bitmap,
        unix_timestamp,
        activated_at,
    } = args;
    // for an item without active duration, is permanent increase
    // for an equipment, no active duration, is temporary until removal
    // for item with active duration, is by definition an NFT, so wont be more than one
    // for equipment, can be SFT, but then nothing can be staked on it, and if it isnt SFT, it can be staked
    // so staking issues only an issue when one of ones being used, which means if you are adding or removing
    // you can treat as having no staking adjusters because is an SFT (and thus each contributes equally)
    // or you can treat as having only one so staking adjuster will be 100% added or 100% wiped out.
    // therefore, this works.

    let mut no_more_waiting = true;
    if let Some(bies) = basic_item_effects {
        if let Some(bsts) = &player_class.data.config.basic_stats {
            if let Some(bss) = &mut player.data.basic_stats {
                for bst in bsts {
                    // guaranteed to be at this index due to way player is created or updated

                    let bs = &mut bss[bst.index as usize];
                    let mut i: usize = 0;
                    for bie in bies {
                        if bie.stat == bst.name {
                            let modded_amount = get_modded_amount_given_tokens_staked_on_item(
                                GetModdedAmountGivenTokensStakedOnItemArgs {
                                    amount: amount_change,
                                    item,
                                    bie,
                                    adding,
                                },
                            )?;

                            if bie.active_duration.is_none()
                                && stat_diff_type == StatDiffType::Consumable
                            {
                                if adding {
                                    rebalance_stat_permanently(RebalanceStatPermanentlyArgs {
                                        bie,
                                        bs,
                                        bst,
                                        modded_amount,
                                    })?;
                                } // there is no removing a consumable with no active duration, it is permanent...
                            } else if !adding && stat_diff_type == StatDiffType::Consumable {
                                no_more_waiting = no_more_waiting
                                    && rebalance_stat_for_consumable_with_duration(
                                        RebalanceStatForConsumableWithDurationArgs {
                                            bie_bitmap,
                                            unix_timestamp,
                                            bs,
                                            bie,
                                            bst,
                                            modded_amount,
                                            adding,
                                            item,
                                            i,
                                            activated_at,
                                        },
                                    )?
                            } else {
                                rebalance_stat_temporarily(RebalanceStatTemporarilyArgs {
                                    bie,
                                    bs,
                                    bst,
                                    modded_amount,
                                    adding,
                                })?;
                            }
                        }
                        i += 1;
                    }
                }
            }
        }
    }
    Ok(no_more_waiting)
}

struct RebalanceStatForConsumableWithDurationArgs<'b, 'c, 'info> {
    pub bie_bitmap: &'c mut Option<Vec<u8>>,
    pub unix_timestamp: i64,
    pub bs: &'c mut BasicStat,
    pub bie: &'c BasicItemEffect,
    pub bst: &'c BasicStatTemplate,
    pub modded_amount: i64,
    pub adding: bool,
    pub item: &'b Account<'info, Item>,
    pub i: usize,
    pub activated_at: i64,
}

fn rebalance_stat_for_consumable_with_duration<'b, 'c, 'info>(
    args: RebalanceStatForConsumableWithDurationArgs<'b, 'c, 'info>,
) -> Result<bool> {
    let RebalanceStatForConsumableWithDurationArgs {
        bie_bitmap,
        unix_timestamp,
        bs,
        bie,
        bst,
        modded_amount,
        adding,
        item,
        i,
        activated_at,
    } = args;
    if let Some(arr) = bie_bitmap {
        // check to see if we have removed already.
        let (index_in_bie, mask) = get_index_and_mask_for_bie(i)?;
        if arr.len() > index_in_bie {
            let entry = arr[index_in_bie];
            let applied_mask = entry & mask;

            if applied_mask == 0 {
                // ok it has not been taken, we can remove IF the date is right. do that next.
                if let Some(active) = bie.active_duration {
                    let modded_duration = get_modded_duration(active, item, bie)?;
                    msg!(
                        "Unix ts is {:?}, act_at is {:?}, check is is {:?}",
                        unix_timestamp,
                        activated_at,
                        activated_at + modded_duration
                    );
                    if unix_timestamp
                        > activated_at
                            .checked_add(modded_duration)
                            .ok_or(ErrorCode::NumericalOverflowError)?
                    {
                        arr[index_in_bie] |= mask;
                        rebalance_stat_temporarily(RebalanceStatTemporarilyArgs {
                            bie,
                            bs,
                            bst,
                            modded_amount,
                            adding,
                        })?;
                    } else {
                        return Ok(false);
                    }
                }
            }
        } else {
            return Ok(true);
        }
    }

    Ok(true)
}

pub fn get_modded_duration(
    active: u64,
    item: &Account<Item>,
    bie: &BasicItemEffect,
) -> Result<i64> {
    let mut modded_duration = active;

    if item.tokens_staked > 0 {
        let mut to_add: u64 = item.tokens_staked;
        if let Some(san) = bie.staking_duration_numerator {
            to_add = to_add
                .checked_mul(san)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }
        if let Some(sad) = bie.staking_duration_divisor {
            to_add = to_add
                .checked_div(sad)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        modded_duration = modded_duration
            .checked_add(to_add)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    Ok(modded_duration as i64)
}

pub fn get_index_and_mask_for_bie(i: usize) -> Result<(usize, u8)> {
    let index_in_bie_arr = i.checked_div(8).ok_or(ErrorCode::NumericalOverflowError)?;
    let offset_from_right = 7 - i.checked_rem(8).ok_or(ErrorCode::NumericalOverflowError)?;
    let mask = u8::pow(2, offset_from_right as u32);
    Ok((index_in_bie_arr, mask))
}
pub struct RebalanceStatPermanentlyArgs<'a> {
    pub bie: &'a BasicItemEffect,
    pub bs: &'a mut BasicStat,
    pub bst: &'a BasicStatTemplate,
    pub modded_amount: i64,
}

pub fn rebalance_stat_permanently(args: RebalanceStatPermanentlyArgs) -> Result<()> {
    let RebalanceStatPermanentlyArgs {
        bie,
        bs,
        bst,
        modded_amount,
    } = args;
    match bie.item_effect_type {
        BasicItemEffectType::Increment | BasicItemEffectType::Decrement => {
            rebalance_basic_stat(RebalanceBasicStatArgs {
                basic_stat: bs,
                basic_stat_template: bst,
                base_change: modded_amount,
                temp_change: 0,
                new_denominator: 1,
                new_numerator: 1,
                remove_numerator: None,
                remove_denominator: None,
            })?
        }
        BasicItemEffectType::IncrementPercent | BasicItemEffectType::DecrementPercent => {
            match bs.state {
                BasicStatState::Integer { finalized, .. } => {
                    rebalance_basic_stat(RebalanceBasicStatArgs {
                        basic_stat: bs,
                        basic_stat_template: bst,
                        base_change: finalized
                            .checked_mul(
                                100i64
                                    .checked_add(modded_amount)
                                    .ok_or(ErrorCode::NumericalOverflowError)?,
                            )
                            .ok_or(ErrorCode::NumericalOverflowError)?
                            .checked_div(100)
                            .ok_or(ErrorCode::NumericalOverflowError)?
                            .checked_sub(finalized)
                            .ok_or(ErrorCode::NumericalOverflowError)?,
                        temp_change: 0,
                        new_denominator: 1,
                        new_numerator: 1,
                        remove_numerator: None,
                        remove_denominator: None,
                    })?
                }
                _ => return Err(ErrorCode::CannotAlterThisTypeNumerically.into()),
            }
        }
        BasicItemEffectType::IncrementPercentFromBase
        | BasicItemEffectType::DecrementPercentFromBase => match bs.state {
            BasicStatState::Integer { base, .. } => rebalance_basic_stat(RebalanceBasicStatArgs {
                basic_stat: bs,
                basic_stat_template: bst,
                base_change: base
                    .checked_mul(
                        100i64
                            .checked_add(modded_amount)
                            .ok_or(ErrorCode::NumericalOverflowError)?,
                    )
                    .ok_or(ErrorCode::NumericalOverflowError)?
                    .checked_div(100)
                    .ok_or(ErrorCode::NumericalOverflowError)?
                    .checked_sub(base)
                    .ok_or(ErrorCode::NumericalOverflowError)?,
                temp_change: 0,
                new_denominator: 1,
                new_numerator: 1,
                remove_numerator: None,
                remove_denominator: None,
            })?,
            _ => return Err(ErrorCode::CannotAlterThisTypeNumerically.into()),
        },
    }
    Ok(())
}

pub struct RebalanceStatTemporarilyArgs<'a> {
    pub bie: &'a BasicItemEffect,
    pub bs: &'a mut BasicStat,
    pub bst: &'a BasicStatTemplate,
    pub modded_amount: i64,
    pub adding: bool,
}

pub fn rebalance_stat_temporarily(args: RebalanceStatTemporarilyArgs) -> Result<()> {
    let RebalanceStatTemporarilyArgs {
        bie,
        bs,
        bst,
        modded_amount,
        adding,
    } = args;
    match bie.item_effect_type {
        BasicItemEffectType::Increment | BasicItemEffectType::Decrement => {
            rebalance_basic_stat(RebalanceBasicStatArgs {
                basic_stat: bs,
                basic_stat_template: bst,
                base_change: 0,
                temp_change: modded_amount,
                new_denominator: 1,
                new_numerator: 1,
                remove_numerator: None,
                remove_denominator: None,
            })?
        }
        BasicItemEffectType::IncrementPercent | BasicItemEffectType::DecrementPercent => {
            let mut adjusted_modded = modded_amount;
            if !adding {
                // we dont need the negative sign here, since we're dividing
                adjusted_modded = modded_amount
                    .checked_mul(-1)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
            }

            rebalance_basic_stat(RebalanceBasicStatArgs {
                basic_stat: bs,
                basic_stat_template: bst,
                base_change: 0,
                temp_change: 0,
                new_numerator: if adding {
                    100i64
                        .checked_add(adjusted_modded)
                        .ok_or(ErrorCode::NumericalOverflowError)?
                } else {
                    1
                },
                new_denominator: if adding { 100 } else { 1 },
                remove_numerator: if adding {
                    None
                } else {
                    Some(
                        100i64
                            .checked_add(adjusted_modded)
                            .ok_or(ErrorCode::NumericalOverflowError)?,
                    )
                },
                remove_denominator: if adding { None } else { Some(100) },
            })?
        }
        BasicItemEffectType::IncrementPercentFromBase
        | BasicItemEffectType::DecrementPercentFromBase => match bs.state {
            BasicStatState::Integer { base, .. } => rebalance_basic_stat(RebalanceBasicStatArgs {
                basic_stat: bs,
                basic_stat_template: bst,
                base_change: 0,
                temp_change: modded_amount
                    .checked_mul(base)
                    .ok_or(ErrorCode::NumericalOverflowError)?
                    .checked_div(100)
                    .ok_or(ErrorCode::NumericalOverflowError)?,
                new_denominator: 1,
                new_numerator: 1,
                remove_numerator: None,
                remove_denominator: None,
            })?,
            _ => return Err(ErrorCode::CannotAlterThisTypeNumerically.into()),
        },
    }

    Ok(())
}

pub struct RebalanceBasicStatArgs<'a> {
    basic_stat: &'a mut BasicStat,
    basic_stat_template: &'a BasicStatTemplate,
    base_change: i64,
    temp_change: i64,
    new_numerator: i64,
    new_denominator: i64,
    remove_numerator: Option<i64>,
    remove_denominator: Option<i64>,
}
pub fn rebalance_basic_stat(args: RebalanceBasicStatArgs) -> Result<()> {
    let RebalanceBasicStatArgs {
        basic_stat,
        basic_stat_template,
        base_change,
        temp_change,
        new_numerator,
        new_denominator,
        remove_numerator,
        remove_denominator,
    } = args;
    match basic_stat.state {
        BasicStatState::Integer {
            base,
            with_temporary_changes,
            temporary_numerator,
            temporary_denominator,
            ..
        } => {
            match basic_stat_template.stat_type {
                BasicStatType::Integer { min, max, .. } => {
                    let mut new_base = base
                        .checked_add(base_change)
                        .ok_or(ErrorCode::NumericalOverflowError)?;

                    if let Some(m) = max {
                        new_base = std::cmp::min(m, new_base);
                    }

                    if let Some(m) = min {
                        new_base = std::cmp::max(m, new_base);
                    }

                    let actual_new_base_change = new_base
                        .checked_sub(base)
                        .ok_or(ErrorCode::NumericalOverflowError)?;

                    let mut new_temp = with_temporary_changes
                        .checked_add(temp_change)
                        .ok_or(ErrorCode::NumericalOverflowError)?;

                    new_temp = new_temp
                        .checked_add(actual_new_base_change)
                        .ok_or(ErrorCode::NumericalOverflowError)?;

                    msg!("Temp change is {:?}", temp_change);

                    let mut new_temporary_numerator = temporary_numerator
                        .checked_mul(new_numerator)
                        .ok_or(ErrorCode::NumericalOverflowError)?;
                    let mut new_temporary_denominator = temporary_denominator
                        .checked_mul(new_denominator)
                        .ok_or(ErrorCode::NumericalOverflowError)?;

                    if let Some(remove) = remove_numerator {
                        new_temporary_numerator = new_temporary_numerator
                            .checked_div(remove)
                            .ok_or(ErrorCode::NumericalOverflowError)?;
                    }

                    if let Some(remove) = remove_denominator {
                        new_temporary_denominator = new_temporary_denominator
                            .checked_div(remove)
                            .ok_or(ErrorCode::NumericalOverflowError)?;
                    }

                    if new_temporary_denominator == 0 {
                        new_temporary_denominator = 1;
                    }

                    let mut new_finalized = new_temp
                        .checked_mul(new_temporary_numerator)
                        .ok_or(ErrorCode::NumericalOverflowError)?;

                    new_finalized = new_finalized
                        .checked_div(new_temporary_denominator)
                        .ok_or(ErrorCode::NumericalOverflowError)?;

                    if let Some(m) = max {
                        new_finalized = std::cmp::min(m, new_finalized);
                    }

                    if let Some(m) = min {
                        new_finalized = std::cmp::max(m, new_finalized);
                    }

                    msg!("New base {:?}", new_base);
                    basic_stat.state = BasicStatState::Integer {
                        base: new_base,
                        with_temporary_changes: new_temp,
                        temporary_numerator: new_temporary_numerator,
                        temporary_denominator: new_temporary_denominator,
                        finalized: new_finalized,
                    };
                }
                _ => {
                    // Skip, will never be true
                }
            }
        }
        _ => {
            // Do nothing
        }
    }
    Ok(())
}

pub fn map_new_stats_into_player(
    player_class: &Account<PlayerClass>,
    player: &mut Account<Player>,
    new_stats: &Option<Vec<BasicStat>>,
) -> Result<()> {
    if let Some(bsts) = &player_class.data.config.basic_stats {
        if let Some(bss) = &mut player.data.basic_stats {
            if let Some(new_bss) = new_stats {
                for bst in bsts {
                    let bs = &mut bss[bst.index as usize];

                    for new_bs in new_bss {
                        if new_bs.index == bs.index {
                            match bs.state {
                                BasicStatState::Integer { base: old_base, .. } => {
                                    match new_bs.state {
                                        BasicStatState::Integer { base: new_base, .. } => {
                                            rebalance_basic_stat(RebalanceBasicStatArgs {
                                                basic_stat: bs,
                                                basic_stat_template: bst,
                                                base_change: new_base
                                                    .checked_sub(old_base)
                                                    .ok_or(ErrorCode::NumericalOverflowError)?,
                                                temp_change: 0,
                                                new_denominator: 1,
                                                new_numerator: 1,
                                                remove_numerator: None,
                                                remove_denominator: None,
                                            })?;
                                        }
                                        _ => {
                                            // skip
                                        }
                                    }
                                    break;
                                }

                                _ => {
                                    bs.state = new_bs.state.clone();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

pub struct GetModdedAmountGivenTokensStakedOnItemArgs<'a, 'b, 'info> {
    pub amount: u64,
    pub item: &'b Account<'info, Item>,
    pub bie: &'a BasicItemEffect,
    pub adding: bool,
}
pub fn get_modded_amount_given_tokens_staked_on_item<'a, 'b, 'info>(
    args: GetModdedAmountGivenTokensStakedOnItemArgs<'a, 'b, 'info>,
) -> Result<i64> {
    let GetModdedAmountGivenTokensStakedOnItemArgs {
        amount,
        item,
        bie,
        adding,
    } = args;

    let mut modded_amount: i64 = (amount as i64)
        .checked_mul(bie.amount as i64)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    if item.tokens_staked > 0 {
        let mut to_add: u64 = item.tokens_staked;
        if let Some(san) = bie.staking_amount_numerator {
            to_add = to_add
                .checked_mul(san)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }
        if let Some(sad) = bie.staking_amount_divisor {
            to_add = to_add
                .checked_div(sad)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        modded_amount = modded_amount
            .checked_add(to_add as i64)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    if bie.item_effect_type == BasicItemEffectType::Decrement
        || bie.item_effect_type == BasicItemEffectType::DecrementPercent
        || bie.item_effect_type == BasicItemEffectType::DecrementPercentFromBase
    {
        modded_amount = modded_amount
            .checked_mul(-1)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    if !adding {
        modded_amount = modded_amount
            .checked_mul(-1)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    Ok(modded_amount)
}

pub struct EndItemActivationArgs<'b, 'c, 'info> {
    pub item: &'b Account<'info, Item>,
    pub item_class: &'b Account<'info, ItemClass>,
    pub item_activation_marker: &'b Account<'info, ItemActivationMarker>,
    pub receiver: &'c Signer<'info>,
    pub item_class_mint: &'c Pubkey,
    pub item_mint: &'c UncheckedAccount<'info>,
    pub usage_permissiveness_to_use: Option<PermissivenessType>,
    pub item_usage_index: u16,
    pub item_index: u64,
    pub item_class_index: u64,
    pub amount: u64,
    // Required if using roots
    pub usage_info: Option<raindrops_item::CraftUsageInfo>,
    pub item_program: &'c UncheckedAccount<'info>,
    pub token_program: &'c Program<'info, Token>,
    pub player: &'b Account<'info, Player>,
    pub player_item_account: &'c UncheckedAccount<'info>,

    pub player_mint: &'c Pubkey,
    pub index: u64,
}

pub fn end_item_activation<'b, 'c, 'info>(
    args: EndItemActivationArgs<'b, 'c, 'info>,
) -> Result<()> {
    let EndItemActivationArgs {
        item,
        item_class,
        item_activation_marker,
        receiver,
        item_class_mint,
        item_mint,
        usage_permissiveness_to_use,
        item_usage_index,
        item_index,
        item_class_index,
        amount,
        usage_info,
        item_program,
        player,
        player_mint,
        player_item_account,
        index,
        token_program,
    } = args;

    let mut keys = vec![
        AccountMeta::new(item.key(), false),
        AccountMeta::new(item_mint.key(), false),
        AccountMeta::new(player_item_account.key(), false),
        AccountMeta::new_readonly(player.key(), true),
        AccountMeta::new_readonly(item_class.key(), false),
        AccountMeta::new(item_activation_marker.key(), false),
        AccountMeta::new_readonly(token_program.key(), false),
        AccountMeta::new(receiver.key(), true),
    ];
    let account_infos = vec![
        item.to_account_info(),
        item_mint.to_account_info(),
        item_class.to_account_info(),
        item_activation_marker.to_account_info(),
        receiver.to_account_info(),
        player.to_account_info(),
        player_item_account.to_account_info(),
        token_program.to_account_info(),
    ];

    // According to common remaining accounts rules for token holder,
    // push
    // token_account [readable]
    // token_holder [signer]
    keys.push(AccountMeta::new_readonly(player_item_account.key(), false));
    keys.push(AccountMeta::new_readonly(player.key(), true));

    Ok(invoke_signed(
        &Instruction {
            program_id: item_program.key(),
            accounts: keys,
            data: AnchorSerialize::try_to_vec(
                &CopyEndItemActivationBecauseAnchorSucksSometimesArgs {
                    instruction: sighash("global", "end_item_activation"),
                    item_class_mint: *item_class_mint,
                    usage_permissiveness_to_use,
                    usage_index: item_usage_index,
                    index: item_index,
                    class_index: item_class_index,
                    amount,
                    usage_info,
                },
            )?,
        },
        &account_infos,
        &[&[
            PREFIX.as_bytes(),
            player_mint.as_ref(),
            &index.to_le_bytes(),
            &[player.bump],
        ]],
    )?)
}

pub struct BeginItemActivationArgs<'b, 'c, 'info> {
    pub item: &'c UncheckedAccount<'info>,
    pub item_class: &'c UncheckedAccount<'info>,
    pub item_activation_marker: &'c UncheckedAccount<'info>,
    pub player_item_account: &'c UncheckedAccount<'info>,
    pub payer: &'c Signer<'info>,
    pub item_program: &'c UncheckedAccount<'info>,
    pub system_program: &'c Program<'info, System>,
    pub clock: &'c Sysvar<'info, Clock>,
    pub rent: &'c Sysvar<'info, Rent>,
    pub validation_program: &'c UncheckedAccount<'info>,
    pub player: &'b Account<'info, Player>,
    pub use_item_args: UseItemArgs,
}

pub fn begin_item_activation<'b, 'c, 'info>(
    args: BeginItemActivationArgs<'b, 'c, 'info>,
) -> Result<()> {
    let BeginItemActivationArgs {
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
        use_item_args,
    } = args;

    let UseItemArgs {
        item_class_mint,
        use_item_permissiveness_to_use,
        item_usage_index,
        item_index,
        item_class_index,
        item_mint,
        amount,
        player_mint,
        index,
        item_marker_space,
        target,
        item_usage_info,
    } = use_item_args;

    let mut keys = vec![
        AccountMeta::new_readonly(item_class.key(), false),
        AccountMeta::new(item.key(), false),
        AccountMeta::new_readonly(player_item_account.key(), false),
        AccountMeta::new(item_activation_marker.key(), false),
        AccountMeta::new(payer.key(), true),
        AccountMeta::new_readonly(system_program.key(), false),
        AccountMeta::new_readonly(clock.key(), false),
        AccountMeta::new_readonly(rent.key(), false),
        AccountMeta::new_readonly(validation_program.key(), false),
    ];
    let account_infos = vec![
        item_class.to_account_info(),
        item.to_account_info(),
        player_item_account.to_account_info(),
        player.to_account_info(),
        item_activation_marker.to_account_info(),
        payer.to_account_info(),
        system_program.to_account_info(),
        clock.to_account_info(),
        rent.to_account_info(),
        validation_program.to_account_info(),
    ];

    // According to common remaining accounts rules for token holder,
    // push
    // token_account [readable]
    // token_holder [signer]
    keys.push(AccountMeta::new_readonly(player_item_account.key(), false));
    keys.push(AccountMeta::new_readonly(player.key(), true));

    Ok(invoke_signed(
        &Instruction {
            program_id: item_program.key(),
            accounts: keys,
            data: AnchorSerialize::try_to_vec(
                &CopyBeginItemActivationBecauseAnchorSucksSometimesArgs {
                    instruction: sighash("global", "begin_item_activation"),
                    item_class_mint,
                    item_mint,
                    usage_permissiveness_to_use: use_item_permissiveness_to_use,
                    usage_index: item_usage_index,
                    index: item_index,
                    class_index: item_class_index,
                    amount,
                    item_marker_space,
                    target,
                    usage_info: if let Some(v) = item_usage_info {
                        Some(raindrops_item::UsageInfo::try_from_slice(&v)?)
                    } else {
                        None
                    },
                },
            )?,
        },
        &account_infos,
        &[&[
            PREFIX.as_bytes(),
            player_mint.as_ref(),
            &index.to_le_bytes(),
            &[player.bump],
        ]],
    )?)
}

pub struct UpdateValidForUseIfWarmupPassedArgs<'b, 'c, 'info> {
    pub item: &'c UncheckedAccount<'info>,
    pub item_class: &'c UncheckedAccount<'info>,
    pub item_activation_marker: &'c UncheckedAccount<'info>,
    pub item_account: &'c UncheckedAccount<'info>,
    pub item_program: &'c UncheckedAccount<'info>,
    pub clock: &'c Sysvar<'info, Clock>,
    pub player: &'b Account<'info, Player>,
    pub update_args: UpdateValidForUseIfWarmupPassedOnItemArgs,
}

pub fn update_valid_for_use_if_warmup_passed<'b, 'c, 'info>(
    args: UpdateValidForUseIfWarmupPassedArgs<'b, 'c, 'info>,
) -> Result<()> {
    let UpdateValidForUseIfWarmupPassedArgs {
        item,
        item_class,
        item_activation_marker,
        item_account,
        item_program,
        clock,
        player,
        update_args,
    } = args;

    let UpdateValidForUseIfWarmupPassedOnItemArgs {
        item_mint,
        item_index,
        item_usage_index,
        item_class_index,
        amount,
        item_class_mint,
        index,
        player_mint,
        item_usage_proof,
        item_usage,
        ..
    } = update_args;

    let keys = vec![
        AccountMeta::new_readonly(item.key(), false),
        AccountMeta::new_readonly(item_class.key(), false),
        AccountMeta::new_readonly(item_account.key(), false),
        AccountMeta::new(item_activation_marker.key(), false),
        AccountMeta::new_readonly(clock.key(), false),
    ];
    let account_infos = vec![
        item.to_account_info(),
        item_class.to_account_info(),
        item_account.to_account_info(),
        item_activation_marker.to_account_info(),
        clock.to_account_info(),
    ];

    Ok(invoke_signed(
        &Instruction {
            program_id: item_program.key(),
            accounts: keys,
            data: AnchorSerialize::try_to_vec(
                &CopyUpdateValidForUseIfWarmupPassedBecauseAnchorSucksSometimesArgs {
                    instruction: sighash("global", "update_valid_for_use_if_warmup_passed"),
                    item_class_mint,
                    usage_index: item_usage_index,
                    index: item_index,
                    class_index: item_class_index,
                    amount,
                    item_mint,
                    usage_proof: item_usage_proof,
                    usage: if let Some(v) = item_usage {
                        Some(raindrops_item::ItemUsage::try_from_slice(&v)?)
                    } else {
                        None
                    },
                },
            )?,
        },
        &account_infos,
        &[&[
            PREFIX.as_bytes(),
            player_mint.as_ref(),
            &index.to_le_bytes(),
            &[player.bump],
        ]],
    )?)
}

pub fn assert_index_and_name_uniqueness_in_player_class_data(data: &PlayerClassData) -> Result<()> {
    assert_index_and_name_uniqueness_in_basic_stat_templates(&data.config.basic_stats)?;
    assert_index_and_name_uniqueness_in_body_parts(&data.config.body_parts)?;
    Ok(())
}

pub fn assert_index_and_name_uniqueness_in_basic_stat_templates(
    basic_stats: &Option<Vec<BasicStatTemplate>>,
) -> Result<()> {
    if let Some(stats) = basic_stats {
        let mut indices = vec![];
        let mut names = vec![];
        for stat in stats {
            indices.push(stat.index);
            names.push(&stat.name)
        }

        assert_index_uniqueness(indices)?;
        assert_name_uniqueness(names)?;
    }
    Ok(())
}

pub fn assert_index_and_name_uniqueness_in_body_parts(
    body_parts: &Option<Vec<BodyPart>>,
) -> Result<()> {
    if let Some(bp) = body_parts {
        let mut indices = vec![];
        let mut names = vec![];
        for body_part in bp {
            indices.push(body_part.index);
            names.push(&body_part.body_part)
        }

        assert_index_uniqueness(indices)?;
        assert_name_uniqueness(names)?;
    }
    Ok(())
}

pub fn assert_index_uniqueness(stats: Vec<u16>) -> Result<()> {
    let mut indices_seen: Vec<u8> = vec![];
    for stat in &stats {
        let my_index = *stat as usize;
        if indices_seen.len() > my_index {
            if indices_seen[my_index] > 0 {
                return Err(ErrorCode::IndexAlreadyUsed.into());
            } else {
                indices_seen[my_index] = 1
            }
        } else {
            while indices_seen.len() < my_index {
                indices_seen.push(0)
            }
        }
    }

    Ok(())
}

pub fn assert_name_uniqueness(stats: Vec<&String>) -> Result<()> {
    let mut i = 0;
    for stat in &stats {
        let mut j = 0;
        for other_stat in &stats {
            if stat == other_stat && j != i {
                return Err(ErrorCode::NameAlreadyUsed.into());
            }
            j += 1;
        }
        i += 1;
    }
    Ok(())
}

pub struct AssertPermissivenessAccessArgs<'a, 'b, 'c, 'info> {
    pub program_id: &'a Pubkey,
    pub given_account: &'b AccountInfo<'info>,
    pub remaining_accounts: &'c [AccountInfo<'info>],
    pub permissiveness_to_use: &'a Option<PermissivenessType>,
    pub permissiveness_array: &'a Option<Vec<Permissiveness>>,
    pub class_index: Option<u64>,
    pub index: u64,
    pub account_mint: Option<&'b Pubkey>,
}

pub fn assert_permissiveness_access(args: AssertPermissivenessAccessArgs) -> Result<()> {
    let AssertPermissivenessAccessArgs {
        program_id,
        given_account,
        remaining_accounts,
        permissiveness_to_use,
        permissiveness_array,
        index,
        class_index,
        account_mint,
    } = args;
    match permissiveness_to_use {
        Some(perm_to_use) => {
            if let Some(permissiveness_arr) = permissiveness_array {
                let mut found = false;
                for entry in permissiveness_arr {
                    if entry.permissiveness_type == *perm_to_use {
                        found = true;
                        break;
                    }
                }
                if !found {
                    return Err(error!(ErrorCode::PermissivenessNotFound));
                }
                match perm_to_use {
                    PermissivenessType::TokenHolder => {
                        //  token_account [readable]
                        //  token_holder [signer]
                        //  mint [readable] OR none if already present in the main array
                        let token_account = &remaining_accounts[0];
                        let token_holder = &remaining_accounts[1];
                        let mint = if let Some(m) = account_mint {
                            *m
                        } else {
                            remaining_accounts[2].key()
                        };
                        assert_signer(token_holder)?;

                        let acct = assert_is_ata(token_account, token_holder.key, &mint, None)?;

                        if acct.amount == 0 {
                            return Err(error!(ErrorCode::InsufficientBalance));
                        }
                        assert_derivation(
                            program_id,
                            given_account,
                            &[PREFIX.as_bytes(), mint.as_ref(), &index.to_le_bytes()],
                        )?;
                    }
                    PermissivenessType::ParentTokenHolder => {
                        // parent class token_account [readable]
                        // parent class token_holder [signer]
                        // parent class [readable]
                        // parent class mint [readable] OR none if already present in the main array

                        let class_token_account = &remaining_accounts[0];
                        let class_token_holder = &remaining_accounts[1];
                        let class = &remaining_accounts[2];
                        let class_mint = remaining_accounts[3].key();

                        assert_signer(class_token_holder)?;

                        let acct = assert_is_ata(
                            class_token_account,
                            class_token_holder.key,
                            &class_mint,
                            None,
                        )?;

                        if acct.amount == 0 {
                            return Err(error!(ErrorCode::InsufficientBalance));
                        }

                        assert_derivation(
                            program_id,
                            class,
                            &[
                                PREFIX.as_bytes(),
                                class_mint.as_ref(),
                                &class_index.unwrap().to_le_bytes(),
                            ],
                        )?;

                        assert_keys_equal(grab_parent(given_account)?, *class.key)?;
                    }
                    PermissivenessType::UpdateAuthority => {
                        // metadata_update_authority [signer]
                        // metadata [readable]
                        // mint [readable] OR none if already present in the main array
                        msg!("Beginning update authority check");
                        let metadata_update_authority = &remaining_accounts[0];
                        let metadata = &remaining_accounts[1];
                        let mint = if let Some(m) = account_mint {
                            *m
                        } else {
                            remaining_accounts[2].key()
                        };
                        msg!(
                            "Using update authority as a permission with {:?} as signer",
                            metadata_update_authority.key()
                        );
                        assert_signer(metadata_update_authority)?;

                        assert_metadata_valid(metadata, None, &mint)?;

                        let update_authority = grab_update_authority(metadata)?;
                        msg!("Checking if the update auth on the metadata {:?} is equal to the above..", update_authority);
                        assert_keys_equal(update_authority, *metadata_update_authority.key)?;
                    }
                    PermissivenessType::Anybody => {
                        // nothing
                    }
                }
            } else {
                //  default is token holder. most common usecase.
                //  token_account [readable]
                //  token_holder [signer]
                //  mint [readable] OR none if already present in the main array
                let token_account = &remaining_accounts[0];
                let token_holder = &remaining_accounts[1];
                let mint = if let Some(m) = account_mint {
                    *m
                } else {
                    remaining_accounts[2].key()
                };
                msg!("Asserting signer of token holder.");
                assert_signer(token_holder)?;

                let acct = assert_is_ata(token_account, token_holder.key, &mint, None)?;

                if acct.amount == 0 {
                    return Err(error!(ErrorCode::InsufficientBalance));
                }

                assert_derivation(
                    program_id,
                    given_account,
                    &[PREFIX.as_bytes(), mint.as_ref(), &index.to_le_bytes()],
                )?;
            }
        }
        None => return Err(error!(ErrorCode::MustSpecifyPermissivenessType)),
    }

    Ok(())
}

pub struct PropagateParentArrayArgs<'a, T: Inherited> {
    pub parent_items: &'a Option<Vec<T>>,
    pub child_items: &'a Option<Vec<T>>,
    pub overridable: bool,
}

pub fn propagate_parent_array<T: Inherited>(args: PropagateParentArrayArgs<T>) -> Option<Vec<T>> {
    let PropagateParentArrayArgs {
        parent_items,
        child_items,
        overridable,
    } = args;

    if let Some(p_items) = &parent_items {
        if overridable {
            let mut new_items: Vec<T> = vec![];
            add_to_new_array_from_parent(InheritanceState::Overridden, p_items, &mut new_items);
            return Some(new_items);
        } else {
            match &child_items {
                Some(c_items) => {
                    let mut new_items: Vec<T> = vec![];

                    add_to_new_array_from_parent(
                        InheritanceState::Inherited,
                        p_items,
                        &mut new_items,
                    );

                    for item in c_items {
                        if item.get_inherited() == &InheritanceState::NotInherited {
                            new_items.push(item.clone())
                        }
                    }
                    return Some(new_items);
                }
                None => {
                    let mut new_items: Vec<T> = vec![];
                    add_to_new_array_from_parent(
                        InheritanceState::Inherited,
                        p_items,
                        &mut new_items,
                    );
                    return Some(new_items);
                }
            }
        }
    } else if overridable {
        return None;
    }

    child_items.as_ref().map(|v| v.to_vec())
}

pub fn add_to_new_array_from_parent<T: Inherited>(
    inheritance: InheritanceState,
    parent_items: &[T],
    new_items: &mut Vec<T>,
) {
    for item in parent_items {
        let mut new_copy = item.clone();
        new_copy.set_inherited(inheritance);
        new_items.push(new_copy);
    }
}

pub struct PropagateParentArgs<'a, T: Inherited> {
    pub parent: &'a Option<T>,
    pub child: &'a Option<T>,
    pub overridable: bool,
}

pub fn propagate_parent<T: Inherited>(args: PropagateParentArgs<T>) -> Option<T> {
    let PropagateParentArgs {
        parent,
        child,
        overridable,
    } = args;
    if let Some(parent_val) = &parent {
        if overridable {
            let mut new_vers = parent_val.clone();
            new_vers.set_inherited(InheritanceState::Overridden);
            return Some(new_vers);
        } else if child.is_none() {
            let mut new_vers = parent_val.clone();
            new_vers.set_inherited(InheritanceState::Inherited);
            return Some(new_vers);
        }
    } else if overridable {
        return None;
    }

    child.as_ref().cloned()
}

pub fn join_to_namespace(
    current_namespaces: Vec<NamespaceAndIndex>,
    new_namespace: Pubkey,
) -> Result<Vec<NamespaceAndIndex>> {
    let mut joined = false;
    let mut new_namespaces = vec![];

    for mut ns in current_namespaces {
        if ns.namespace == anchor_lang::solana_program::system_program::id() && !joined {
            ns.namespace = new_namespace.key();
            ns.index = None;
            ns.inherited = InheritanceState::NotInherited;
            joined = true;
            new_namespaces.push(ns);
        } else {
            new_namespaces.push(ns);
        }
    }
    if !joined {
        return Err(error!(ErrorCode::FailedToJoinNamespace));
    }

    Ok(new_namespaces)
}

pub fn leave_namespace(
    current_namespaces: Vec<NamespaceAndIndex>,
    leave_namespace: Pubkey,
) -> Result<Vec<NamespaceAndIndex>> {
    let mut left = false;
    let mut new_namespaces = vec![];

    for mut ns in current_namespaces {
        if ns.namespace == leave_namespace.key() && !left {
            // if the artifact is still cached, error
            if ns.index != None {
                return Err(error!(ErrorCode::FailedToLeaveNamespace));
            };
            ns.namespace = anchor_lang::solana_program::system_program::id();
            ns.inherited = InheritanceState::NotInherited;
            left = true;
            new_namespaces.push(ns);
        } else {
            new_namespaces.push(ns);
        }
    }
    if !left {
        return Err(error!(ErrorCode::FailedToLeaveNamespace));
    }

    Ok(new_namespaces)
}

pub fn cache_namespace(
    current_namespaces: Vec<NamespaceAndIndex>,
    namespace: Pubkey,
    page: u64,
) -> Result<Vec<NamespaceAndIndex>> {
    let mut cached = false;
    let mut new_namespaces = vec![];
    for mut ns in current_namespaces {
        if ns.namespace == namespace && !cached {
            ns.index = Some(page);
            cached = true;
            new_namespaces.push(ns);
        } else {
            new_namespaces.push(ns);
        }
    }
    if !cached {
        return Err(error!(ErrorCode::FailedToCache));
    }

    Ok(new_namespaces)
}

pub fn uncache_namespace(
    current_namespaces: Vec<NamespaceAndIndex>,
    namespace: Pubkey,
) -> Result<Vec<NamespaceAndIndex>> {
    let mut uncached = false;
    let mut new_namespaces = vec![];
    for mut ns in current_namespaces {
        if ns.namespace == namespace && !uncached {
            ns.index = None;
            uncached = true;
            new_namespaces.push(ns);
        } else {
            new_namespaces.push(ns);
        }
    }
    if !uncached {
        return Err(error!(ErrorCode::FailedToUncache));
    }

    Ok(new_namespaces)
}

// returns true if the namespace program called the item program
pub fn is_namespace_program_caller(ixns: &AccountInfo) -> bool {
    let current_ix =
        anchor_lang::solana_program::sysvar::instructions::get_instruction_relative(0, ixns)
            .unwrap();

    if current_ix.program_id != Pubkey::from_str(NAMESPACE_ID).unwrap() {
        return false;
    };

    true
}

/// Create account almost from scratch, lifted from
/// https://github.com/solana-labs/solana-program-library/tree/master/associated-token-account/program/src/processor.rs#L51-L98
#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent: &Sysvar<'a, Rent>,
    system_program: &Program<'a, System>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let required_lamports = rent
        .minimum_balance(size)
        .max(1)
        .saturating_sub(new_account_info.lamports());

    if required_lamports > 0 {
        msg!("Transfer {} lamports to the new account", required_lamports);
        invoke(
            &system_instruction::transfer(payer_info.key, new_account_info.key, required_lamports),
            &[
                payer_info.clone(),
                new_account_info.clone(),
                system_program.to_account_info(),
            ],
        )?;
    }

    let accounts = &[new_account_info.clone(), system_program.to_account_info()];

    msg!("Allocate space for the account");
    invoke_signed(
        &system_instruction::allocate(new_account_info.key, size.try_into().unwrap()),
        accounts,
        &[signer_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        accounts,
        &[signer_seeds],
    )?;

    Ok(())
}
