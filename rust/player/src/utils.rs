
use {
    crate::{ChildUpdatePropagationPermissivenessType, BasicStatType, PlayerClass, Player, BasicStatState, BasicStat, PlayerClassData},
    anchor_lang::{
        error,
        prelude::{msg, Account, AccountInfo, Pubkey, Rent, Result, SolanaSysvar},
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
    },
    std::convert::TryInto,
    raindrops_item::utils::{propagate_parent_array, propagate_parent, PropagateParentArgs, PropagateParentArrayArgs}
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
                    ChildUpdatePropagationPermissivenessType::EquippingItemsPermissiveness => {
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
                    ChildUpdatePropagationPermissivenessType::AddingItemsPermissiveness =>  {
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



pub fn propagate_player_class_data_fields_to_player_data(
    player: &mut Account<Player>,
    player_class: &Account<PlayerClass>,
) {
    player.namespaces = player_class.namespaces.clone();

    if player.data.stats_uri.is_none() {
        player.data.stats_uri = player_class.data.config.starting_stats_uri.clone()
    }

    if player.data.category.is_none() {
        player.data.category = player_class.data.settings.default_category.clone()
    }

    if let Some(player_stats) = &player_class.data.config.basic_stats {

        let mut states_length = 0;
        if let Some(states) = &player.data.basic_stats {
            states_length = states.len();
        }

        let mut existing_values: Vec<&BasicStat> =
            vec![&BasicStat { index: 0, state: BasicStatState::Null }; std::cmp::max(player_stats.len(), states_length)];

        if let Some(states) = &player.data.basic_stats {
            for i in 0..states.len() { 
                existing_values[states[i].index as usize] = &states[i];
            } 
        }
        
        let mut new_values: Vec<BasicStat> =
            vec![BasicStat { index: 0, state: BasicStatState::Null }; std::cmp::max(player_stats.len(), states_length)];

        for i in 0..player_stats.len() {
            let existing = existing_values[player_stats[i].index as usize];
            new_values[player_stats[i].index as usize] = BasicStat {
                index: player_stats[i].index,
                state: match &player_stats[i].stat_type {
                    BasicStatType::Enum { starting, values } => {
                        match existing.state {
                            BasicStatState::Enum { default, current } =>{ 
                                let mut found = false;
                                let mut found_default = false;
                                for val in values {
                                    if val.1 == current {
                                        found = true;
                                    }
                                    if val.1 == default {
                                        found_default = true;
                                    }
                                }    
                                BasicStatState::Enum { 
                                    default: if found_default {
                                        default
                                    } else {
                                        *starting
                                    }, current: if found {
                                        current
                                    } else {
                                        *starting
                                    } 
                                }
                                
                            },
                            _ => BasicStatState::Enum { default: *starting, current: *starting }
                        }
                        
                    },
                    BasicStatType::Integer { min, max, starting, .. } => {
                        match existing.state {
                            BasicStatState::Integer { default, current } =>{ 
                                let mut new_default = default;
                                let mut new_current = current;
                                if let Some(m) = max {
                                    if current > *m {
                                        new_current = *m;
                                    } 
                                    if default > *m {
                                        new_default = *m;
                                    }
                                }

                                if let Some(m) = min {
                                    if current < *m {
                                        new_current = *m;
                                    } 
                                    if default < *m {
                                        new_default = *m;
                                    }
                                }

                                BasicStatState::Integer { default: new_default, current: new_current }
                                
                            },
                            _ => BasicStatState::Integer { default: *starting, current: *starting }
                        }
                    },
                    BasicStatType::Bool { starting, .. } => {
                        match existing.state {
                            BasicStatState::Bool {  current, .. } =>{ 
                                BasicStatState::Bool { default: *starting, current } 
                            },
                            _ => BasicStatState::Bool { default: *starting, current: *starting }
                        }
                    },
                    BasicStatType::String { starting } =>{
                        match &existing.state {
                            BasicStatState::String {  current, ..} => { 
                                BasicStatState::String { default: starting.clone(), current: current.clone() } 
                            },
                            _ => BasicStatState::String { default: starting.clone(), current: starting.clone() }
                        }
                    },
                }
            }
        }
    

        player.data.basic_stats = Some(new_values);
    }
}