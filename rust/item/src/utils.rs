use {
    crate::{
        ChildUpdatePropagationPermissivenessType, Component, CraftUsageInfo, ErrorCode,
        InheritanceState, Inherited, Item, ItemActivationMarker, ItemActivationMarkerProofCounter,
        ItemClass, ItemClassData, ItemClassType, ItemEscrow, ItemUsage, ItemUsageState,
        ItemUsageType, Permissiveness, PermissivenessType, UsageInfo, PREFIX,
    },
    anchor_lang::{
        error,
        prelude::{
            msg, Account, AccountInfo, AnchorDeserialize, AnchorSerialize, Program, ProgramError,
            Pubkey, Rent, Result, SolanaSysvar, System, Sysvar, UncheckedAccount,
        },
        require,
        solana_program::{
            hash,
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
        Key, ToAccountInfo,
    },
    anchor_spl::token::{Mint, Token},
    arrayref::array_ref,
    spl_associated_token_account::get_associated_token_address,
    spl_token::instruction::{close_account, initialize_account2, set_authority, AuthorityType},
    std::cell::RefCell,
    std::convert::TryInto,
};

impl ItemClass {
    pub fn item_class_data(&self, data: &RefCell<&mut [u8]>) -> Result<ItemClassData> {
        let (ctr, end_ctr) = get_class_write_offsets(self, data);

        //  msg!("Ctr {}->{} {:?}", ctr, end_ctr, &data.borrow());
        let item_class_data: ItemClassData =
            AnchorDeserialize::try_from_slice(&data.borrow()[ctr as usize..end_ctr as usize])?;

        Ok(item_class_data)
    }
}

pub fn assert_initialized<T: Pack + IsInitialized>(account_info: &AccountInfo) -> Result<T> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(error!(ErrorCode::Uninitialized))
    } else {
        Ok(account)
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> Result<()> {
    if account.owner != owner {
        Err(error!(ErrorCode::IncorrectOwner))
    } else {
        Ok(())
    }
}
///TokenTransferParams
pub struct TokenTransferParams<'a: 'b, 'b> {
    /// source
    pub source: AccountInfo<'a>,
    /// destination
    pub destination: AccountInfo<'a>,
    /// amount
    pub amount: u64,
    /// authority
    pub authority: AccountInfo<'a>,
    /// authority_signer_seeds
    pub authority_signer_seeds: &'b [&'b [u8]],
    /// token_program
    pub token_program: AccountInfo<'a>,
}

pub fn get_class_write_offsets(
    item_class: &ItemClass,
    item_data: &RefCell<&mut [u8]>,
) -> (u64, u64) {
    let mut ctr: usize = 8;
    let data = item_data.borrow();
    if let Some(ns) = &item_class.namespaces {
        ctr += 1 + 4 + 34 * ns.len();
    } else {
        ctr += 1;
    }

    if item_class.parent.is_some() {
        ctr += 33;
    } else {
        ctr += 1;
    }

    if item_class.mint.is_some() {
        ctr += 33;
    } else {
        ctr += 1;
    }

    if item_class.metadata.is_some() {
        ctr += 33;
    } else {
        ctr += 1;
    }

    if item_class.edition.is_some() {
        ctr += 33;
    } else {
        ctr += 1;
    }

    ctr += 9; // bump and existing childern (1 + 8)

    let mut end_ctr = ctr;

    // Item Class Settings
    // free_build
    if data[end_ctr] == 1 {
        end_ctr += 3
    } else {
        end_ctr += 1;
    }

    // children_must_be_editions
    if data[end_ctr] == 1 {
        end_ctr += 3
    } else {
        end_ctr += 1;
    }

    // builder_must_be_holder
    if data[end_ctr] == 1 {
        end_ctr += 3
    } else {
        end_ctr += 1;
    }

    // update_permissiveness
    if data[end_ctr] == 1 {
        let sub = &data[end_ctr + 1..end_ctr + 5];
        end_ctr += 1 + 4 + u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]) as usize * 2;
    } else {
        end_ctr += 1;
    }

    // build_permissiveness
    if data[end_ctr] == 1 {
        let sub = &data[end_ctr + 1..end_ctr + 5];
        end_ctr += 1 + 4 + u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]) as usize * 2;
    } else {
        end_ctr += 1;
    }

    // staking_warm_up_duration
    if data[end_ctr] == 1 {
        end_ctr += 9;
    } else {
        end_ctr += 1;
    }

    // staking_cooldown_duration
    if data[end_ctr] == 1 {
        end_ctr += 9;
    } else {
        end_ctr += 1;
    }

    // staking_permissiveness
    if data[end_ctr] == 1 {
        let sub = &data[end_ctr + 1..end_ctr + 5];
        end_ctr += 1 + 4 + u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]) as usize * 2;
    } else {
        end_ctr += 1;
    }

    // unstaking_permissiveness
    if data[end_ctr] == 1 {
        let sub = &data[end_ctr + 1..end_ctr + 5];
        end_ctr += 1 + 4 + u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]) as usize * 2;
    } else {
        end_ctr += 1;
    }

    // child_update_propagation_permissiveness
    if data[end_ctr] == 1 {
        let sub = &data[end_ctr + 1..end_ctr + 5];
        end_ctr += 1 + 4 + u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]) as usize * 3;
    } else {
        end_ctr += 1;
    }

    // ItemClassConfig
    // usage_root
    if data[end_ctr] == 1 {
        end_ctr += 33;
    } else {
        end_ctr += 1;
    }

    // usage_state_root
    if data[end_ctr] == 1 {
        end_ctr += 33;
    } else {
        end_ctr += 1;
    }

    // component_root
    if data[end_ctr] == 1 {
        end_ctr += 33;
    } else {
        end_ctr += 1;
    }

    //usages
    if data[end_ctr] == 1 {
        let sub = &data[end_ctr + 1..end_ctr + 5];
        let num_of_usages = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);
        end_ctr += 5;

        for _ in 0..num_of_usages {
            end_ctr += 2; // index

            // basic_item_effects
            if data[end_ctr] == 1 {
                let sub = &data[end_ctr + 1..end_ctr + 5];
                let num_of_effects = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);
                end_ctr += 5;

                for _ in 0..num_of_effects {
                    end_ctr += 8; // amount

                    // stat string
                    let sub = &data[end_ctr..end_ctr + 4];
                    let stat_length = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);
                    end_ctr += 4 + stat_length as usize;
                    // item_effect_type
                    end_ctr += 1;

                    //active_duration
                    if data[end_ctr] == 1 {
                        end_ctr += 9;
                    } else {
                        end_ctr += 1;
                    }

                    //staking_amount_numerator
                    if data[end_ctr] == 1 {
                        end_ctr += 9;
                    } else {
                        end_ctr += 1;
                    }

                    //staking_amount_divisor
                    if data[end_ctr] == 1 {
                        end_ctr += 9;
                    } else {
                        end_ctr += 1;
                    }

                    //staking_duration_numerator
                    if data[end_ctr] == 1 {
                        end_ctr += 9;
                    } else {
                        end_ctr += 1;
                    }

                    //staking_duration_divisor
                    if data[end_ctr] == 1 {
                        end_ctr += 9;
                    } else {
                        end_ctr += 1;
                    }

                    //max_uses
                    if data[end_ctr] == 1 {
                        end_ctr += 9;
                    } else {
                        end_ctr += 1;
                    }
                }
            } else {
                end_ctr += 1;
            }

            // usage_permissiveness type
            let sub = &data[end_ctr..end_ctr + 4];

            end_ctr += 4 + u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]) as usize;

            //inherited
            end_ctr += 1;

            // item_class_type
            if data[end_ctr] == 0 {
                // wearable
                let sub = &data[end_ctr + 1..end_ctr + 5];
                let num_of_body_parts = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);
                end_ctr += 4;
                for _ in 0..num_of_body_parts {
                    // body part string
                    let sub = &data[end_ctr..end_ctr + 4];
                    let body_part_length = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);
                    end_ctr += 4 + body_part_length as usize;
                }

                // limit_per_part
                if data[end_ctr] == 1 {
                    end_ctr += 9;
                } else {
                    end_ctr += 1;
                }
            } else if data[end_ctr] == 1 {
                end_ctr += 1;
                // consumable

                // max_uses
                if data[end_ctr] == 1 {
                    end_ctr += 9;
                } else {
                    end_ctr += 1;
                }

                // max_players_per_use
                if data[end_ctr] == 1 {
                    end_ctr += 9;
                } else {
                    end_ctr += 1;
                }

                // item_usage_type
                end_ctr += 1;

                // cooldown_duration
                if data[end_ctr] == 1 {
                    end_ctr += 9;
                } else {
                    end_ctr += 1;
                }

                // warmup_duration
                if data[end_ctr] == 1 {
                    end_ctr += 9;
                } else {
                    end_ctr += 1;
                }
            }

            // callback
            if data[end_ctr] == 1 {
                end_ctr += 41;
            } else {
                end_ctr += 1;
            }

            // validation
            if data[end_ctr] == 1 {
                end_ctr += 41;
            } else {
                end_ctr += 1;
            }

            // do_not_pair_with_self
            end_ctr += 1;

            // dnp
            if data[end_ctr] == 1 {
                let sub = &data[end_ctr + 1..end_ctr + 5];
                let num_of_pubkeys = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);

                end_ctr += 1 + 4 + num_of_pubkeys as usize * 33;
            } else {
                end_ctr += 1;
            }
        }
    } else {
        end_ctr += 1;
    }

    // Components
    if data[end_ctr] == 1 {
        let sub = &data[end_ctr + 1..end_ctr + 5];
        let num_of_components = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);
        end_ctr += 5;
        for _ in 0..num_of_components {
            // mint + amount + class index
            end_ctr += 48;
            // time_to_build
            if data[end_ctr] == 1 {
                end_ctr += 9;
            } else {
                end_ctr += 1;
            }

            // component_scope string
            let sub = &data[end_ctr..end_ctr + 4];
            let scope_length = u32::from_le_bytes([sub[0], sub[1], sub[2], sub[3]]);
            end_ctr += 4 + scope_length as usize;

            // use_usage_index + condition + inherited
            end_ctr += 4;
        }
    } else {
        end_ctr += 1;
    }

    (ctr as u64, end_ctr as u64)
}

pub fn write_data(
    item_class: &mut Account<ItemClass>,
    item_class_data: &ItemClassData,
) -> Result<()> {
    let item_class_info = item_class.to_account_info();
    let (ctr, _) = get_class_write_offsets(item_class, &item_class_info.data);
    let mut data = item_class_info.try_borrow_mut_data()?;
    let dst: &mut [u8] = &mut data;
    let mut cursor = std::io::Cursor::new(dst);
    msg!("Cursor is at {}", ctr);
    cursor.set_position(ctr);
    AnchorSerialize::serialize(&item_class_data.settings, &mut cursor)?;
    AnchorSerialize::serialize(&item_class_data.config, &mut cursor)?;

    Ok(())
}

#[inline(always)]
pub fn spl_token_transfer(params: TokenTransferParams<'_, '_>) -> Result<()> {
    let TokenTransferParams {
        source,
        destination,
        authority,
        token_program,
        amount,
        authority_signer_seeds,
    } = params;

    let val = &[authority_signer_seeds];

    let result = invoke_signed(
        &spl_token::instruction::transfer(
            token_program.key,
            source.key,
            destination.key,
            authority.key,
            &[],
            amount,
        )?,
        &[source, destination, authority, token_program],
        if authority_signer_seeds.is_empty() {
            &[]
        } else {
            val
        },
    );

    result.map_err(|_| error!(ErrorCode::TokenTransferFailed))
}

pub fn get_mask_and_index_for_seq(seq: u64) -> Result<(u8, usize)> {
    let my_position_in_index = seq
        .checked_div(8)
        .ok_or(ErrorCode::NumericalOverflowError)?;
    let my_position_from_right = 7 - seq
        .checked_rem(8)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    let mask = u8::pow(2, my_position_from_right as u32);
    Ok((mask, my_position_in_index as usize))
}

pub fn assert_derivation(program_id: &Pubkey, account: &AccountInfo, path: &[&[u8]]) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(path, program_id);
    if key != *account.key {
        return Err(error!(ErrorCode::DerivedKeyInvalid));
    }
    Ok(bump)
}

pub fn assert_derivation_by_key(
    program_id: &Pubkey,
    account: &Pubkey,
    path: &[&[u8]],
) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(path, program_id);
    if key != *account {
        return Err(error!(ErrorCode::DerivedKeyInvalid));
    }
    Ok(bump)
}

pub fn assert_derivation_with_bump(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<()> {
    let key = Pubkey::create_program_address(path, program_id).unwrap();
    if key != *account.key {
        return Err(error!(ErrorCode::DerivedKeyInvalid));
    }
    Ok(())
}

/// Create account almost from scratch, lifted from
/// https://github.com/solana-labs/solana-program-library/blob/7d4873c61721aca25464d42cc5ef651a7923ca79/associated-token-account/program/src/processor.rs#L51-L98
#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent_sysvar_info: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let rent = &Rent::from_account_info(rent_sysvar_info)?;
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
                system_program_info.clone(),
            ],
        )?;
    }

    let accounts = &[new_account_info.clone(), system_program_info.clone()];

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
    msg!("Completed assignation!");

    Ok(())
}

pub fn spl_token_mint_to<'a: 'b, 'b>(
    mint: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    amount: u64,
    authority: AccountInfo<'a>,
    authority_signer_seeds: &'b [&'b [u8]],
    token_program: AccountInfo<'a>,
) -> Result<()> {
    let result = invoke_signed(
        &spl_token::instruction::mint_to(
            token_program.key,
            mint.key,
            destination.key,
            authority.key,
            &[],
            amount,
        )?,
        &[mint, destination, authority, token_program],
        &[authority_signer_seeds],
    );
    result.map_err(|_| error!(ErrorCode::TokenMintToFailed))
}

/// TokenBurnParams
pub struct TokenBurnParams<'a: 'b, 'b> {
    /// mint
    pub mint: AccountInfo<'a>,
    /// source
    pub source: AccountInfo<'a>,
    /// amount
    pub amount: u64,
    /// authority
    pub authority: AccountInfo<'a>,
    /// authority_signer_seeds
    pub authority_signer_seeds: Option<&'b [&'b [u8]]>,
    /// token_program
    pub token_program: AccountInfo<'a>,
}

pub fn spl_token_burn(params: TokenBurnParams<'_, '_>) -> Result<()> {
    let TokenBurnParams {
        mint,
        source,
        authority,
        token_program,
        amount,
        authority_signer_seeds,
    } = params;
    let mut seeds: Vec<&[&[u8]]> = vec![];
    if let Some(seed) = authority_signer_seeds {
        seeds.push(seed);
    }
    let result = invoke_signed(
        &spl_token::instruction::burn(
            token_program.key,
            source.key,
            mint.key,
            authority.key,
            &[],
            amount,
        )?,
        &[source, mint, authority, token_program],
        seeds.as_slice(),
    );
    result.map_err(|_| error!(ErrorCode::TokenBurnFailed))
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

pub fn assert_builder_must_be_holder_check(
    item_class_data: &ItemClassData,
    new_item_token_holder: &UncheckedAccount,
) -> Result<()> {
    if let Some(b) = &item_class_data.settings.builder_must_be_holder {
        if b.boolean {
            require!(new_item_token_holder.is_signer, MustBeHolderToBuild)
        }
    }

    Ok(())
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

                        let acct = assert_is_ata(token_account, token_holder.key, &mint)?;

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

                        let metadata_update_authority = &remaining_accounts[0];
                        let metadata = &remaining_accounts[1];
                        let mint = if let Some(m) = account_mint {
                            *m
                        } else {
                            remaining_accounts[2].key()
                        };

                        assert_signer(metadata_update_authority)?;

                        assert_metadata_valid(metadata, None, &mint)?;

                        let update_authority = grab_update_authority(metadata)?;

                        assert_keys_equal(update_authority, *metadata_update_authority.key)?;
                    }
                    PermissivenessType::Anybody => {
                        // nothing
                    }
                }
            } else {
                // Default is metadata update authority.
                // metadata_update_authority [signer]
                // metadata [readable]
                // mint [readable] OR none if already present in the main array
                let metadata_update_authority = &remaining_accounts[0];
                let metadata = &remaining_accounts[1];
                let mint = if let Some(m) = account_mint {
                    *m
                } else {
                    remaining_accounts[2].key()
                };

                assert_signer(metadata_update_authority)?;

                assert_metadata_valid(metadata, None, &mint)?;

                let update_authority = grab_update_authority(metadata)?;

                assert_keys_equal(update_authority, *metadata_update_authority.key)?;
            }
        }
        None => return Err(error!(ErrorCode::MustSpecifyPermissivenessType)),
    }

    Ok(())
}

pub fn add_to_new_array_from_parent<T: Inherited>(
    inheritance: InheritanceState,
    parent_items: &[T],
    new_items: &mut Vec<T>,
) {
    for item in parent_items {
        let mut new_copy = item.clone();
        new_copy.set_inherited(inheritance.clone());
        new_items.push(new_copy);
    }
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
                    for item in c_items {
                        if item.get_inherited() == &InheritanceState::NotInherited {
                            new_items.push(item.clone())
                        }
                    }

                    add_to_new_array_from_parent(
                        InheritanceState::Inherited,
                        p_items,
                        &mut new_items,
                    );
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

pub fn update_item_class_with_inherited_information(
    item: &mut Account<ItemClass>,
    item_class_data: &mut ItemClassData,
    parent_item: &Account<ItemClass>,
    parent_item_data: &ItemClassData,
) {
    match &parent_item_data
        .settings
        .child_update_propagation_permissiveness
    {
        Some(cupp) => {
            for update_perm in cupp {
                match update_perm.child_update_propagation_permissiveness_type {
                    ChildUpdatePropagationPermissivenessType::Usages => {
                        item_class_data.config.usages = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.config.usages,
                            child_items: &item_class_data.config.usages,
                            overridable: update_perm.overridable,
                        });
                        item_class_data.config.usage_root = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.config.usage_root,
                            child: &item_class_data.config.usage_root,
                            overridable: update_perm.overridable,
                        });

                        item_class_data.config.usage_state_root = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.config.usage_state_root,
                            child: &item_class_data.config.usage_state_root,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::StakingPermissiveness => {
                        item_class_data.settings.staking_permissiveness = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.settings.staking_permissiveness,
                            child_items: &item_class_data.settings.staking_permissiveness,
                            overridable: update_perm.overridable,
                        });

                        item_class_data.settings.unstaking_permissiveness = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.settings.unstaking_permissiveness,
                            child_items: &item_class_data.settings.unstaking_permissiveness,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::Components => {
                        item_class_data.config.components = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.config.components,
                            child_items: &item_class_data.config.components,
                            overridable: update_perm.overridable,
                        });
                        item_class_data.config.component_root = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.config.component_root,
                            child: &item_class_data.config.component_root,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::UpdatePermissiveness => {
                        item_class_data.settings.update_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.update_permissiveness,
                                child_items: &item_class_data.settings.update_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::BuildPermissiveness => {
                        item_class_data.settings.build_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.build_permissiveness,
                                child_items: &item_class_data.settings.build_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::ChildUpdatePropagationPermissiveness => {
                        item_class_data.settings.child_update_propagation_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.settings.child_update_propagation_permissiveness,
                                child_items: &item_class_data.settings.child_update_propagation_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::FreeBuildPermissiveness => {
                        item_class_data.settings.free_build = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.settings.free_build,
                            child: &item_class_data.settings.free_build,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::ChildrenMustBeEditionsPermissiveness => {
                        item_class_data.settings.children_must_be_editions = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.settings.children_must_be_editions,
                            child: &item_class_data.settings.children_must_be_editions,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::BuilderMustBeHolderPermissiveness => {
                        item_class_data.settings.builder_must_be_holder = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.settings.builder_must_be_holder,
                            child: &item_class_data.settings.builder_must_be_holder,
                            overridable: update_perm.overridable,
                        });
                    },
                    ChildUpdatePropagationPermissivenessType::Namespaces => {
                        item.namespaces = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item.namespaces,
                            child_items: &item.namespaces,
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

pub fn assert_valid_item_settings_for_edition_type(
    edition: Option<&AccountInfo>,
    item_data: &ItemClassData,
) -> Result<()> {
    if edition.is_none() {
        if let Some(usages) = &item_data.config.usages {
            for usage in usages {
                if let Some(basic_item_effects) = &usage.basic_item_effects {
                    for item_effects in basic_item_effects {
                        if item_effects.active_duration.is_some()
                            || item_effects.staking_amount_numerator.is_some()
                            || item_effects.staking_duration_numerator.is_some()
                            || item_effects.staking_amount_divisor.is_some()
                            || item_effects.staking_duration_divisor.is_some()
                        {
                            return Err(error!(ErrorCode::InvalidConfigForFungibleMints));
                        }
                    }
                }

                if let ItemClassType::Consumable {
                    max_uses,
                    item_usage_type,
                    cooldown_duration,
                    ..
                } = &usage.item_class_type {
                    if let Some(max) = max_uses {
                        if max > &1 {
                            // cant have a fungible mint with more than one use. Impossible to track state per token.
                            return Err(error!(ErrorCode::InvalidConfigForFungibleMints));
                        }
                    }

                    if cooldown_duration.is_some() {
                        return Err(error!(ErrorCode::InvalidConfigForFungibleMints));
                    }

                    if item_usage_type != &ItemUsageType::Destruction
                        && item_usage_type != &ItemUsageType::Infinite
                    {
                        return Err(error!(ErrorCode::InvalidConfigForFungibleMints));
                    }
                }
            }
        }
    }
    Ok(())
}

pub fn grab_parent(artifact: &AccountInfo) -> Result<Pubkey> {
    let data = artifact.data.borrow();

    let number = if data[8] == 1 {
        u32::from_le_bytes(*array_ref![data, 9, 4]) as usize
    } else {
        0
    };
    let offset = 8_usize + number * 34 + if data[8] == 1 { 4 } else { 0 } + 1;

    if data[offset] == 1 {
        let key_bytes = array_ref![data, offset + 1, 32];
        let key = Pubkey::new_from_array(*key_bytes);
        Ok(key)
    } else {
        Err(error!(ErrorCode::NoParentPresent))
    }
}

pub fn grab_update_authority(metadata: &AccountInfo) -> Result<Pubkey> {
    let data = metadata.data.borrow();
    let key_bytes = array_ref![data, 1, 32];
    let key = Pubkey::new_from_array(*key_bytes);
    Ok(key)
}

pub fn assert_is_ata(
    ata: &AccountInfo,
    wallet: &Pubkey,
    mint: &Pubkey,
) -> Result<spl_token::state::Account> {
    assert_owned_by(ata, &spl_token::id())?;
    let ata_account: spl_token::state::Account = assert_initialized(ata)?;
    assert_keys_equal(ata_account.owner, *wallet)?;
    assert_keys_equal(ata_account.mint, mint.key())?;
    assert_keys_equal(get_associated_token_address(wallet, mint), *ata.key)?;
    require!(ata_account.delegate.is_none(), AtaShouldNotHaveDelegate);
    Ok(ata_account)
}

pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> Result<()> {
    if key1 != key2 {
        Err(error!(ErrorCode::PublicKeyMismatch))
    } else {
        Ok(())
    }
}

pub fn assert_signer(account: &AccountInfo) -> Result<()> {
    if !account.is_signer {
        Err(ProgramError::MissingRequiredSignature.into())
    } else {
        Ok(())
    }
}

pub fn assert_metadata_valid(
    metadata: &AccountInfo,
    edition: Option<&AccountInfo>,
    mint: &Pubkey,
) -> Result<()> {
    assert_derivation(
        &metaplex_token_metadata::id(),
        metadata,
        &[
            metaplex_token_metadata::state::PREFIX.as_bytes(),
            metaplex_token_metadata::id().as_ref(),
            mint.as_ref(),
        ],
    )?;
    if metadata.data_is_empty() {
        return Err(error!(ErrorCode::MetadataDoesntExist));
    }

    if let Some(ed) = edition {
        assert_derivation(
            &metaplex_token_metadata::id(),
            ed,
            &[
                metaplex_token_metadata::state::PREFIX.as_bytes(),
                metaplex_token_metadata::id().as_ref(),
                mint.as_ref(),
                metaplex_token_metadata::state::EDITION.as_bytes(),
            ],
        )?;
        if ed.data_is_empty() {
            return Err(error!(ErrorCode::EditionDoesntExist));
        }
    }

    Ok(())
}

pub fn assert_mint_authority_matches_mint(
    mint_authority: &COption<Pubkey>,
    mint_authority_info: &AccountInfo,
) -> Result<()> {
    match mint_authority {
        COption::None => {
            return Err(error!(ErrorCode::InvalidMintAuthority));
        }
        COption::Some(key) => {
            if mint_authority_info.key != key {
                return Err(error!(ErrorCode::InvalidMintAuthority));
            }
        }
    }

    if !mint_authority_info.is_signer {
        return Err(error!(ErrorCode::NotMintAuthority));
    }

    Ok(())
}

pub fn assert_part_of_namespace<'a, 'b>(
    artifact: &'b AccountInfo<'a>,
    namespace: &'b AccountInfo<'a>,
) -> Result<Account<'a, raindrops_namespace::Namespace>> {
    assert_owned_by(namespace, &raindrops_namespace::id())?;

    let deserialized: Account<raindrops_namespace::Namespace> = Account::try_from(namespace)?;

    assert_derivation(
        &raindrops_namespace::id(),
        namespace,
        &[
            raindrops_namespace::PREFIX.as_bytes(),
            deserialized.mint.key().as_ref(),
        ],
    )?;

    raindrops_namespace::utils::assert_part_of_namespace(artifact, &deserialized)?;

    Ok(deserialized)
}

pub struct TransferMintAuthorityArgs<'b, 'info> {
    pub item_class_key: &'b Pubkey,
    pub item_class_info: &'b AccountInfo<'info>,
    pub mint_authority_info: &'b AccountInfo<'info>,
    pub token_program_info: &'b AccountInfo<'info>,
    pub mint: &'b Account<'info, Mint>,
}

pub fn transfer_mint_authority(
    args: TransferMintAuthorityArgs,
) -> Result<()> {
    let TransferMintAuthorityArgs {
        item_class_key,
        item_class_info,
        mint_authority_info,
        token_program_info,
        mint,
    } = args;

    msg!("Setting mint authority");
    let mint_info = mint.to_account_info();
    let accounts = &[
        mint_authority_info.clone(),
        mint_info.clone(),
        token_program_info.clone(),
        item_class_info.clone(),
    ];
    invoke_signed(
        &set_authority(
            token_program_info.key,
            mint_info.key,
            Some(item_class_key),
            AuthorityType::MintTokens,
            mint_authority_info.key,
            &[mint_authority_info.key],
        )
        .unwrap(),
        accounts,
        &[],
    )?;
    msg!("Setting freeze authority");

    if mint.freeze_authority.is_some() {
        invoke_signed(
            &set_authority(
                token_program_info.key,
                mint_info.key,
                Some(item_class_key),
                AuthorityType::FreezeAccount,
                mint_authority_info.key,
                &[mint_authority_info.key],
            )
            .unwrap(),
            accounts,
            &[],
        )?;
        msg!("Finished setting freeze authority");
    } else {
        msg!("Skipping freeze authority because this mint has none")
    }

    Ok(())
}

/// Returns true if a `leaf` can be proved to be a part of a Merkle tree
/// defined by `root`. For this, a `proof` must be provided, containing
/// sibling hashes on the branch from the leaf to the root of the tree. Each
/// pair of leaves and each pair of pre-images are assumed to be sorted.
pub fn verify(proof: &[[u8; 32]], root: &[u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed_hash = leaf;
    for proof_element in proof.iter() {
        if computed_hash <= *proof_element {
            // Hash(current computed hash + current element of the proof)
            computed_hash = anchor_lang::solana_program::keccak::hashv(&[
                &[0x01],
                &computed_hash,
                proof_element,
            ])
            .0;
        } else {
            // Hash(current element of the proof + current computed hash)
            computed_hash = anchor_lang::solana_program::keccak::hashv(&[
                &[0x01],
                proof_element,
                &computed_hash,
            ])
            .0;
        }
    }
    // Check if the computed hash (root) is equal to the provided root
    computed_hash == *root
}

pub struct VerifyCooldownArgs<'a, 'info> {
    pub craft_usage_info: Option<CraftUsageInfo>,
    pub craft_item_class: &'a Account<'info, ItemClass>,
    pub craft_item: &'a Account<'info, Item>,
    pub chosen_component: &'a Component,
    pub unix_timestamp: u64,
}

pub fn verify_cooldown(args: VerifyCooldownArgs) -> Result<()> {
    let VerifyCooldownArgs {
        craft_usage_info,
        craft_item_class,
        craft_item,
        chosen_component,
        unix_timestamp,
    } = args;

    let craft_item_class_data =
        craft_item_class.item_class_data(&craft_item_class.to_account_info().data)?;

    if let Some(csi) = craft_usage_info {
        let CraftUsageInfo {
            craft_usage_state_proof,
            craft_usage_state,
            craft_usage_proof,
            craft_usage,
        } = csi;

        // Verify the merkle proof.
        let node = anchor_lang::solana_program::keccak::hashv(&[
            &[0x00],
            &craft_item.key().to_bytes(),
            &AnchorSerialize::try_to_vec(&craft_usage_state)?,
        ]);
        if let Some(craft_usage_state_root) = &craft_item.data.usage_state_root {
            require!(
                verify(
                    &craft_usage_state_proof,
                    &craft_usage_state_root.root,
                    node.0
                ),
                InvalidProof
            );
        } else {
            return Err(error!(ErrorCode::MissingMerkleInfo));
        }

        let class_node = anchor_lang::solana_program::keccak::hashv(&[
            &[0x00],
            &craft_item_class.key().to_bytes(),
            &AnchorSerialize::try_to_vec(&craft_usage)?,
        ]);

        if let Some(craft_usage_root) = &craft_item_class_data.config.usage_root {
            require!(
                verify(&craft_usage_proof, &craft_usage_root.root, class_node.0),
                InvalidProof
            );
        } else {
            return Err(error!(ErrorCode::MissingMerkleInfo));
        }

        require!(
            craft_usage.index == chosen_component.use_usage_index,
            UnableToFindValidCooldownState
        );

        require!(
            craft_usage_state.index == chosen_component.use_usage_index,
            UnableToFindValidCooldownState
        );

        if let Some(activated_at) = craft_usage_state.activated_at {
            match craft_usage.item_class_type {
                ItemClassType::Wearable { .. } => return Ok(()),
                ItemClassType::Consumable {
                    cooldown_duration, ..
                } => {
                    if let Some(cooldown) = cooldown_duration {
                        let cooldown_over = activated_at
                            .checked_add(cooldown)
                            .ok_or(ErrorCode::NumericalOverflowError)?;
                        if cooldown_over < unix_timestamp {
                            return Err(error!(ErrorCode::UnableToFindValidCooldownState));
                        }
                    }
                }
            }
            return Ok(());
        }
    } else if let Some(usages) = &craft_item_class_data.config.usages {
        for i in 0..usages.len() {
            let usage = &usages[i];
            if usage.index == chosen_component.use_usage_index {
                if let Some(states) = &craft_item.data.usage_states {
                    if let Some(activated_at) = states[i].activated_at {
                        match usage.item_class_type {
                            ItemClassType::Wearable { .. } => return Ok(()),
                            ItemClassType::Consumable {
                                cooldown_duration, ..
                            } => {
                                if let Some(cooldown) = cooldown_duration {
                                    let cooldown_over = activated_at
                                        .checked_add(cooldown)
                                        .ok_or(ErrorCode::NumericalOverflowError)?;
                                    if cooldown_over < unix_timestamp {
                                        return Err(
                                            ErrorCode::UnableToFindValidCooldownState.into()
                                        );
                                    } else {
                                        return Ok(());
                                    }
                                }
                            }
                        }
                    }
                } else {
                    break;
                }
            }
        }

        return Err(error!(ErrorCode::UnableToFindValidCooldownState));
    } else {
        return Err(error!(ErrorCode::MissingMerkleInfo));
    };

    Ok(())
}

pub fn sighash(namespace: &str, name: &str) -> [u8; 8] {
    let preimage = format!("{}:{}", namespace, name);

    let mut sighash = [0u8; 8];
    sighash.copy_from_slice(&hash::hash(preimage.as_bytes()).to_bytes()[..8]);
    sighash
}

pub struct VerifyComponentArgs<'a, 'info> {
    pub item_class: &'a Account<'info, ItemClass>,
    pub component: Option<Component>,
    pub component_proof: Option<Vec<[u8; 32]>>,
    pub item_escrow: &'a Account<'info, ItemEscrow>,
    pub craft_item_token_mint: &'a Pubkey,
    pub component_scope: String,
    pub count_check: bool,
}

pub fn verify_component(args: VerifyComponentArgs) -> Result<Component> {
    let VerifyComponentArgs {
        item_class,
        component,
        component_proof,
        item_escrow,
        craft_item_token_mint,
        component_scope,
        count_check,
    } = args;

    let item_class_data = item_class.item_class_data(&item_class.to_account_info().data)?;
    let chosen_component = if let Some(component_root) = &item_class_data.config.component_root {
        if let Some(p) = component_proof {
            if let Some(c) = component {
                // Verify the merkle proof.
                let node = anchor_lang::solana_program::keccak::hashv(&[
                    &[0x00],
                    &item_escrow.step.to_le_bytes(),
                    &craft_item_token_mint.to_bytes(),
                    &AnchorSerialize::try_to_vec(&c)?,
                ]);
                require!(verify(&p, &component_root.root, node.0), InvalidProof);
                c
            } else {
                return Err(error!(ErrorCode::MissingMerkleInfo));
            }
        } else {
            return Err(error!(ErrorCode::MissingMerkleInfo));
        }
    } else if let Some(components) = &item_class_data.config.components {
        let mut counter: usize = 0;
        let mut comp = components[0].clone();
        let step = item_escrow.step as usize;
        for c in components {
            if c.component_scope == component_scope {
                if counter == step {
                    comp = c.clone();
                }
                counter += 1;
            }
        }

        if count_check {
            require!(
                (item_escrow.step as usize) < counter,
                ErrorCode::ItemReadyForCompletion
            );
        }

        comp
    } else {
        return Err(error!(ErrorCode::MustUseMerkleOrComponentList));
    };

    require!(
        chosen_component.component_scope == component_scope,
        NotPartOfComponentScope
    );

    Ok(chosen_component)
}

pub fn propagate_item_class_data_fields_to_item_data(
    item: &mut Account<Item>,
    item_class: &Account<ItemClass>,
    item_class_data: &ItemClassData,
) {
    item.namespaces = item_class.namespaces.clone();

    item.data.usage_state_root = item_class_data.config.usage_state_root.clone();

    if let Some(item_usage) = &item_class_data.config.usages {
        let mut new_states: Vec<ItemUsageState> = vec![];

        let mut states_length = 0;
        if let Some(states) = &item.data.usage_states {
            states_length = states.len();
        }

        let mut existing_values: Vec<(Option<u64>, u64)> =
            vec![(None, 0); std::cmp::max(item_usage.len(), states_length)];

        if let Some(states) = &item.data.usage_states {
            for i in 0..states.len() {
                existing_values[states[i].index as usize] =
                    (states[i].activated_at, states[i].uses);
            }
        }

        for usage in item_usage {
            new_states.push(ItemUsageState {
                uses: existing_values[usage.index as usize].1,
                activated_at: existing_values[usage.index as usize].0,
                index: usage.index,
            })
        }

        item.data.usage_states = Some(new_states);
    }
}

pub fn create_program_token_account_if_not_present<'a>(
    program_account: &UncheckedAccount<'a>,
    system_program: &Program<'a, System>,
    fee_payer: &AccountInfo<'a>,
    token_program: &Program<'a, Token>,
    mint: &Account<'a, Mint>,
    owner: &AccountInfo<'a>,
    rent: &Sysvar<'a, Rent>,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    assert_owned_by(&mint.to_account_info(), &token_program.key())?;

    if program_account.data_is_empty() {
        create_or_allocate_account_raw(
            *token_program.key,
            &program_account.to_account_info(),
            &rent.to_account_info(),
            system_program,
            fee_payer,
            spl_token::state::Account::LEN,
            signer_seeds,
        )?;

        invoke_signed(
            &initialize_account2(
                token_program.key,
                &program_account.key(),
                &mint.key(),
                &owner.key(),
            )
            .unwrap(),
            &[
                token_program.to_account_info(),
                mint.to_account_info(),
                program_account.to_account_info(),
                rent.to_account_info(),
                owner.clone(),
            ],
            &[signer_seeds],
        )?;
    }

    Ok(())
}

pub fn close_token_account<'a>(
    program_account: &AccountInfo<'a>,
    fee_payer: &AccountInfo<'a>,
    token_program: &Program<'a, Token>,
    owner: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    invoke_signed(
        &close_account(
            token_program.key,
            &program_account.key(),
            &fee_payer.key(),
            &owner.key(),
            &[],
        )
        .unwrap(),
        &[
            token_program.to_account_info(),
            fee_payer.clone(),
            program_account.to_account_info(),
            owner.clone(),
        ],
        &[signer_seeds],
    )?;

    Ok(())
}

pub fn enact_valid_state_change(
    item_usage_state: &mut ItemUsageState,
    item_usage: &ItemUsage,
    unix_timestamp: u64,
) -> Result<()> {
    item_usage_state.uses = item_usage_state
        .uses
        .checked_add(1)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    if let ItemClassType::Consumable {
        max_uses,
        cooldown_duration,
        ..
    } = item_usage.item_class_type {
        if let Some(max) = max_uses {
            require!(item_usage_state.uses <= max, MaxUsesReached)
        }

        if let Some(duration) = cooldown_duration {
            if let Some(activated_at) = item_usage_state.activated_at {
                let cooldown_ends = activated_at
                    .checked_add(duration)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
                if unix_timestamp < cooldown_ends {
                    return Err(error!(ErrorCode::CooldownNotOver));
                }
            }
        }
    }

    item_usage_state.activated_at = Some(unix_timestamp);

    Ok(())
}

pub struct VerifyAndAffectItemStateUpdateArgs<'a, 'info> {
    pub item: &'a mut Account<'info, Item>,
    pub item_class: &'a Account<'info, ItemClass>,
    pub item_activation_marker: &'a mut Account<'info, ItemActivationMarker>,
    pub usage_index: u16,
    pub usage_info: &'a mut Option<UsageInfo>,
    pub unix_timestamp: u64,
}

pub fn verify_and_affect_item_state_update(
    args: VerifyAndAffectItemStateUpdateArgs,
) -> Result<(ItemUsage, ItemUsageState)> {
    let VerifyAndAffectItemStateUpdateArgs {
        item,
        item_class,
        item_activation_marker,
        usage_index,
        usage_info,
        unix_timestamp,
    } = args;

    let mut get_item_args = GetItemUsageArgs {
        item_class,
        usage_index,
        usage: None,
        usage_proof: None,
    };

    if let Some(us_info) = usage_info {
        get_item_args.usage = Some(us_info.usage.clone());
        get_item_args.usage_proof = Some(us_info.usage_proof.clone())
    }

    let item_usage = get_item_usage(get_item_args)?;
    item_activation_marker.unix_timestamp = unix_timestamp;

    match &item_usage.item_class_type {
        ItemClassType::Wearable { .. } => return Err(error!(ErrorCode::CannotUseWearable)),
        ItemClassType::Consumable {
            warmup_duration, ..
        } => {
            if usage_info.is_none() && warmup_duration.is_none() {
                item_activation_marker.valid_for_use = true;
            }
        }
    };

    let usage_state = if let Some(usage_state_root) = &item.data.usage_state_root {
        if let Some(us_info) = &usage_info {
            let UsageInfo {
                usage_state_proof,
                usage_state,
                new_usage_state_root,
                new_usage_state_proof,
                total_states_proof,
                new_total_states_proof,
                total_states,
                ..
            } = us_info;

            // Verify the new state and old state are both part of their respective trees
            let chief_node = anchor_lang::solana_program::keccak::hashv(&[
                &[0x00],
                &AnchorSerialize::try_to_vec(usage_state)?,
            ]);
            require!(
                verify(usage_state_proof, &usage_state_root.root, chief_node.0),
                InvalidProof
            );

            require!(
                verify(new_usage_state_proof, new_usage_state_root, chief_node.0),
                InvalidProof
            );

            // Require that the index matches up to what you sent

            require!(usage_state.index == usage_index, UsageIndexMismatch);

            // Check that both states have the same total states
            let node =
                anchor_lang::solana_program::keccak::hashv(&[&[0x00], &total_states.to_le_bytes()]);
            require!(
                verify(total_states_proof, &usage_state_root.root, node.0),
                InvalidProof
            );

            require!(
                verify(new_total_states_proof, new_usage_state_root, node.0),
                InvalidProof
            );

            // Now mutate the usage ourselves to verify that it works out to the same
            // thing they sent up
            let verify_new_usage_state = &mut usage_state.clone();
            enact_valid_state_change(verify_new_usage_state, &item_usage, unix_timestamp)?;

            let node = anchor_lang::solana_program::keccak::hashv(&[
                &[0x00],
                &AnchorSerialize::try_to_vec(verify_new_usage_state)?,
            ]);
            require!(
                verify(new_usage_state_proof, new_usage_state_root, node.0),
                InvalidProof
            );
            item_activation_marker.proof_counter = Some(ItemActivationMarkerProofCounter {
                states_proven: 0,
                states_required: *total_states,
                ignore_index: usage_state.index,
                new_state_root: *new_usage_state_root,
            });
            usage_state
        } else {
            return Err(error!(ErrorCode::MissingMerkleInfo));
        }
    } else if let Some(usage_states) = &mut item.data.usage_states {
        if usage_states.is_empty() {
            return Err(error!(ErrorCode::CannotUseItemWithoutUsageOrMerkle));
        } else {
            let mut usage_state: Option<&mut ItemUsageState> = None;
            for n_usage_state in usage_states {
                if n_usage_state.index == usage_index {
                    let unwrapped_usage_state = n_usage_state;
                    enact_valid_state_change(unwrapped_usage_state, &item_usage, unix_timestamp)?;
                    usage_state = Some(unwrapped_usage_state);
                    break;
                }
            }

            if let Some(usage_state) = usage_state {
                usage_state
            } else {
                return Err(error!(ErrorCode::CannotUseItemWithoutUsageOrMerkle));
            }
        }
    } else {
        return Err(error!(ErrorCode::CannotUseItemWithoutUsageOrMerkle));
    };

    Ok((item_usage.clone(), usage_state.clone()))
}

pub struct GetItemUsageArgs<'a, 'info> {
    pub item_class: &'a Account<'info, ItemClass>,
    pub usage_index: u16,
    pub usage_proof: Option<Vec<[u8; 32]>>,
    pub usage: Option<ItemUsage>,
}

pub fn get_item_usage(args: GetItemUsageArgs) -> Result<ItemUsage> {
    let GetItemUsageArgs {
        item_class,
        usage_index,
        usage_proof,
        usage,
    } = args;

    let item_class_data = item_class.item_class_data(&item_class.to_account_info().data)?;
    let item_usage = if let Some(usage_root) = &item_class_data.config.usage_root {
        if let Some(usage_proof) = &usage_proof {
            if let Some(us) = &usage {
                // Verify the merkle proof.
                let node = anchor_lang::solana_program::keccak::hashv(&[
                    &[0x00],
                    &AnchorSerialize::try_to_vec(&usage)?,
                ]);
                require!(us.index == usage_index, UsageIndexMismatch);
                require!(verify(usage_proof, &usage_root.root, node.0), InvalidProof);
                us.clone()
            } else {
                return Err(error!(ErrorCode::MissingMerkleInfo));
            }
        } else {
            return Err(error!(ErrorCode::MissingMerkleInfo));
        }
    } else if let Some(usages) = &item_class_data.config.usages {
        if usages.is_empty() {
            return Err(error!(ErrorCode::CannotUseItemWithoutUsageOrMerkle));
        } else {
            let mut usage = &usages[0];
            for usage_n in usages {
                if usage_n.index == usage_index {
                    usage = usage_n;
                    break;
                }
            }
            usage.clone()
        }
    } else {
        return Err(error!(ErrorCode::CannotUseItemWithoutUsageOrMerkle));
    };

    Ok(item_usage)
}
