use {
    crate::{
        ChildUpdatePropagationPermissiveness, ChildUpdatePropagationPermissivenessType, Component,
        CraftUsageInfo, DefaultItemCategory, ErrorCode, InheritanceState, Inherited, Item,
        ItemClass, ItemClassData, ItemEscrow, ItemUsage, ItemUsageSpecifics, ItemUsageState,
        ItemUsageType, Permissiveness, PermissivenessType, Root, PREFIX,
    },
    anchor_lang::{
        prelude::{
            msg, Account, AccountInfo, AnchorSerialize, ProgramError, ProgramResult, Pubkey, Rent,
            SolanaSysvar, UncheckedAccount,
        },
        require,
        solana_program::{
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
        Key, ToAccountInfo,
    },
    anchor_spl::token::Mint,
    arrayref::array_ref,
    spl_associated_token_account::get_associated_token_address,
    spl_token::instruction::{set_authority, AuthorityType},
    std::convert::TryInto,
};

pub fn assert_initialized<T: Pack + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(ErrorCode::Uninitialized.into())
    } else {
        Ok(account)
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(ErrorCode::IncorrectOwner.into())
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

#[inline(always)]
pub fn spl_token_transfer(params: TokenTransferParams<'_, '_>) -> ProgramResult {
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
        if authority_signer_seeds.len() == 0 {
            &[]
        } else {
            val
        },
    );

    result.map_err(|_| ErrorCode::TokenTransferFailed.into())
}

pub fn get_mask_and_index_for_seq(seq: u64) -> Result<(u8, usize), ProgramError> {
    let my_position_in_index = seq
        .checked_div(8)
        .ok_or(ErrorCode::NumericalOverflowError)?;
    let my_position_from_right = 7 - seq
        .checked_rem(8)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    let mask = u8::pow(2, my_position_from_right as u32);
    Ok((mask, my_position_in_index as usize))
}

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(ErrorCode::DerivedKeyInvalid.into());
    }
    Ok(bump)
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
) -> Result<(), ProgramError> {
    let rent = &Rent::from_account_info(rent_sysvar_info)?;
    let required_lamports = rent
        .minimum_balance(size)
        .max(1)
        .saturating_sub(new_account_info.lamports());

    if required_lamports > 0 {
        msg!("Transfer {} lamports to the new account", required_lamports);
        invoke(
            &system_instruction::transfer(&payer_info.key, new_account_info.key, required_lamports),
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
        &[&signer_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        accounts,
        &[&signer_seeds],
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
) -> ProgramResult {
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
    result.map_err(|_| ErrorCode::TokenMintToFailed.into())
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

pub fn spl_token_burn(params: TokenBurnParams<'_, '_>) -> ProgramResult {
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
    result.map_err(|_| ErrorCode::TokenBurnFailed.into())
}

pub struct AssertPermissivenessAccessArgs<'a, 'b, 'c, 'info> {
    pub program_id: &'a Pubkey,
    pub given_account: &'b AccountInfo<'info>,
    pub remaining_accounts: &'c [AccountInfo<'info>],
    pub permissiveness_to_use: &'a Permissiveness,
    pub permissiveness_array: &'a [Permissiveness],
    pub index: u64,
    pub account_mint: Option<&'b AccountInfo<'info>>,
}

pub fn assert_permissiveness_access(args: AssertPermissivenessAccessArgs) -> ProgramResult {
    let AssertPermissivenessAccessArgs {
        program_id,
        given_account,
        remaining_accounts,
        permissiveness_to_use,
        permissiveness_array,
        index,
        account_mint,
    } = args;
    let mut found = false;
    for entry in permissiveness_array {
        if entry == permissiveness_to_use {
            found = true;
            break;
        }
    }

    if !found {
        return Err(ErrorCode::PermissivenessNotFound.into());
    }

    match permissiveness_to_use.permissiveness_type {
        PermissivenessType::TokenHolder => {
            //  token_account [readable]
            //  token_holder [signer]
            //  mint [readable] OR none if already present in the main array
            let token_account = &remaining_accounts[0];
            let token_holder = &remaining_accounts[1];
            let mint = if let Some(m) = account_mint {
                m
            } else {
                &remaining_accounts[2]
            };

            assert_signer(token_holder)?;

            let acct = assert_is_ata(token_account, token_holder.key, mint.key)?;

            if acct.amount == 0 {
                return Err(ErrorCode::InsufficientBalance.into());
            }

            assert_derivation(
                program_id,
                given_account,
                &[PREFIX.as_bytes(), mint.key.as_ref(), &index.to_le_bytes()],
            )?;
        }
        PermissivenessType::ClassHolder => {
            // parent class token_account [readable]
            // parent class token_holder [signer]
            // parent class [readable]
            // parent class mint [readable] OR none if already present in the main array

            let class_token_account = &remaining_accounts[0];
            let class_token_holder = &remaining_accounts[1];
            let class = &remaining_accounts[2];
            let class_mint = if let Some(m) = account_mint {
                m
            } else {
                &remaining_accounts[3]
            };

            assert_signer(class_token_holder)?;

            let acct = assert_is_ata(class_token_account, class_token_holder.key, class_mint.key)?;

            if acct.amount == 0 {
                return Err(ErrorCode::InsufficientBalance.into());
            }

            assert_derivation(
                program_id,
                class,
                &[
                    PREFIX.as_bytes(),
                    class_mint.key.as_ref(),
                    &index.to_le_bytes(),
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
                m
            } else {
                &remaining_accounts[2]
            };

            assert_signer(metadata_update_authority)?;

            assert_metadata_valid(metadata, None, mint.key)?;

            let update_authority = grab_update_authority(metadata)?;

            assert_keys_equal(update_authority, *metadata_update_authority.key)?;
        }
        PermissivenessType::Anybody => {
            // nothing
        }
    }

    Ok(())
}

pub fn add_to_new_array_from_parent<T: Inherited>(
    inheritance: InheritanceState,
    parent_items: &Vec<T>,
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
                    let mut new_items: Vec<T> = c_items.to_vec();
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

    match child_items {
        Some(v) => Some(v.to_vec()),
        None => None,
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

    match child {
        Some(v) => Some(v.clone()),
        None => None,
    }
}

pub fn update_item_class_with_inherited_information(
    item: &mut Account<ItemClass>,
    parent_item: &Account<ItemClass>,
) {
    let parent_item_data = &parent_item.data;
    match &parent_item_data.child_update_propagation_permissiveness {
        Some(cupp) => {
            for update_perm in cupp {
                match update_perm.child_update_propagation_permissiveness_type {
                    ChildUpdatePropagationPermissivenessType::DefaultItemCategory => {
                        item.data.default_category = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.default_category,
                            child: &item.data.default_category,
                            overridable: update_perm.overridable,
                        })
                    }
                    ChildUpdatePropagationPermissivenessType::Usages => {
                        item.data.usages = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.usages,
                            child_items: &item.data.usages,
                            overridable: update_perm.overridable,
                        });
                        item.data.usage_root = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.usage_root,
                            child: &item.data.usage_root,
                            overridable: update_perm.overridable,
                        });

                        item.data.usage_state_root = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.usage_state_root,
                            child: &item.data.usage_state_root,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::Components => {
                        item.data.components = propagate_parent_array(PropagateParentArrayArgs {
                            parent_items: &parent_item_data.components,
                            child_items: &item.data.components,
                            overridable: update_perm.overridable,
                        });
                        item.data.component_root = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.component_root,
                            child: &item.data.component_root,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::UpdatePermissiveness => {
                        item.data.update_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.update_permissiveness,
                                child_items: &item.data.update_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::BuildPermissiveness => {
                        item.data.build_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.build_permissiveness,
                                child_items: &item.data.build_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::ChildUpdatePropagationPermissiveness => {
                        item.data.child_update_propagation_permissiveness =
                            propagate_parent_array(PropagateParentArrayArgs {
                                parent_items: &parent_item_data.child_update_propagation_permissiveness,
                                child_items: &item.data.child_update_propagation_permissiveness,
                                overridable: update_perm.overridable,
                            });
                    }
                    ChildUpdatePropagationPermissivenessType::ChildrenMustBeEditionsPermissiveness => {
                        item.data.children_must_be_editions = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.children_must_be_editions,
                            child: &item.data.children_must_be_editions,
                            overridable: update_perm.overridable,
                        });
                    }
                    ChildUpdatePropagationPermissivenessType::BuilderMustBeHolderPermissiveness => {
                        item.data.builder_must_be_holder = propagate_parent(PropagateParentArgs {
                            parent: &parent_item_data.builder_must_be_holder,
                            child: &item.data.builder_must_be_holder,
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
) -> ProgramResult {
    if edition.is_none() {
        if let Some(usages) = &item_data.usages {
            for usage in usages {
                if let Some(basic_item_effects) = &usage.basic_item_effects {
                    for item_effects in basic_item_effects {
                        if item_effects.active_duration.is_some()
                            || item_effects.staking_amount_scaler.is_some()
                            || item_effects.staking_duration_scaler.is_some()
                        {
                            return Err(ErrorCode::InvalidConfigForFungibleMints.into());
                        }
                    }
                }

                match &usage.specifics {
                    ItemUsageSpecifics::Consumable {
                        uses,
                        max_players_per_use: _,
                        item_usage_type,
                        consumption_callback: _c,
                    } => {
                        if uses > &1 {
                            // cant have a fungible mint with more than one use. Impossible to track state per token.
                            return Err(ErrorCode::InvalidConfigForFungibleMints.into());
                        }

                        if item_usage_type != &ItemUsageType::Destruction
                            && item_usage_type != &ItemUsageType::Infinite
                        {
                            return Err(ErrorCode::InvalidConfigForFungibleMints.into());
                        }
                    }
                    _ => {}
                }
            }
        }
    }
    Ok(())
}

pub fn grab_parent<'a>(artifact: &AccountInfo<'a>) -> Result<Pubkey, ProgramError> {
    let data = artifact.data.borrow();
    let number = u32::from_le_bytes(*array_ref![data, 8, 4]) as usize;
    let offset = 12 as usize + number * 32;

    if data[offset] == 1 {
        let key_bytes = array_ref![data, offset + 1, 32];
        let key = Pubkey::new_from_array(*key_bytes);
        return Ok(key);
    } else {
        return Err(ErrorCode::NoParentPresent.into());
    }
}

pub fn grab_update_authority<'a>(metadata: &AccountInfo<'a>) -> Result<Pubkey, ProgramError> {
    let data = metadata.data.borrow();
    let key_bytes = array_ref![data, 1, 32];
    let key = Pubkey::new_from_array(*key_bytes);
    Ok(key)
}

pub fn assert_is_ata(
    ata: &AccountInfo,
    wallet: &Pubkey,
    mint: &Pubkey,
) -> Result<spl_token::state::Account, ProgramError> {
    assert_owned_by(ata, &spl_token::id())?;
    let ata_account: spl_token::state::Account = assert_initialized(ata)?;
    assert_keys_equal(ata_account.owner, *wallet)?;
    assert_keys_equal(get_associated_token_address(wallet, mint), *ata.key)?;
    Ok(ata_account)
}

pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> ProgramResult {
    if key1 != key2 {
        Err(ErrorCode::PublicKeyMismatch.into())
    } else {
        Ok(())
    }
}

pub fn assert_signer(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        Err(ProgramError::MissingRequiredSignature)
    } else {
        Ok(())
    }
}

pub fn assert_metadata_valid<'a>(
    metadata: &AccountInfo,
    edition: Option<&AccountInfo>,
    mint: &Pubkey,
) -> ProgramResult {
    assert_derivation(
        &metaplex_token_metadata::id(),
        &metadata,
        &[
            metaplex_token_metadata::state::PREFIX.as_bytes(),
            metaplex_token_metadata::id().as_ref(),
            mint.as_ref(),
        ],
    )?;
    if metadata.data_is_empty() {
        return Err(ErrorCode::MetadataDoesntExist.into());
    }

    if let Some(ed) = edition {
        assert_derivation(
            &metaplex_token_metadata::id(),
            &ed,
            &[
                metaplex_token_metadata::state::PREFIX.as_bytes(),
                metaplex_token_metadata::id().as_ref(),
                mint.as_ref(),
                metaplex_token_metadata::state::EDITION.as_bytes(),
            ],
        )?;
        if ed.data_is_empty() {
            return Err(ErrorCode::EditionDoesntExist.into());
        }
    }

    Ok(())
}

pub fn assert_mint_authority_matches_mint(
    mint_authority: &COption<Pubkey>,
    mint_authority_info: &AccountInfo,
) -> ProgramResult {
    match mint_authority {
        COption::None => {
            return Err(ErrorCode::InvalidMintAuthority.into());
        }
        COption::Some(key) => {
            if mint_authority_info.key != key {
                return Err(ErrorCode::InvalidMintAuthority.into());
            }
        }
    }

    if !mint_authority_info.is_signer {
        return Err(ErrorCode::NotMintAuthority.into());
    }

    Ok(())
}

pub struct TransferMintAuthorityArgs<'b, 'info> {
    pub item_class_key: &'b Pubkey,
    pub item_class_info: &'b AccountInfo<'info>,
    pub mint_authority_info: &'b AccountInfo<'info>,
    pub token_program_info: &'b AccountInfo<'info>,
    pub mint: &'b Account<'info, Mint>,
}

pub fn transfer_mint_authority<'b, 'info>(
    args: TransferMintAuthorityArgs<'b, 'info>,
) -> ProgramResult {
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
            &[&mint_authority_info.key],
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
                Some(&item_class_key),
                AuthorityType::FreezeAccount,
                mint_authority_info.key,
                &[&mint_authority_info.key],
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
pub fn verify(proof: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed_hash = leaf;
    for proof_element in proof.into_iter() {
        if computed_hash <= proof_element {
            // Hash(current computed hash + current element of the proof)
            computed_hash = anchor_lang::solana_program::keccak::hashv(&[
                &[0x01],
                &computed_hash,
                &proof_element,
            ])
            .0;
        } else {
            // Hash(current element of the proof + current computed hash)
            computed_hash = anchor_lang::solana_program::keccak::hashv(&[
                &[0x01],
                &proof_element,
                &computed_hash,
            ])
            .0;
        }
    }
    // Check if the computed hash (root) is equal to the provided root
    computed_hash == root
}

pub struct VerifyCooldownArgs<'a, 'info> {
    pub craft_usage_info: Option<CraftUsageInfo>,
    pub craft_item_class: &'a Account<'info, ItemClass>,
    pub craft_item: &'a Account<'info, Item>,
    pub chosen_component: &'a Component,
}

pub fn verify_cooldown<'a, 'info>(args: VerifyCooldownArgs<'a, 'info>) -> ProgramResult {
    let VerifyCooldownArgs {
        craft_usage_info,
        craft_item_class,
        craft_item,
        chosen_component,
    } = args;

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
                verify(craft_usage_state_proof, craft_usage_state_root.root, node.0),
                InvalidProof
            );
        } else {
            return Err(ErrorCode::MissingMerkleInfo.into());
        }

        let class_node = anchor_lang::solana_program::keccak::hashv(&[
            &[0x00],
            &craft_item_class.key().to_bytes(),
            &AnchorSerialize::try_to_vec(&craft_usage)?,
        ]);

        if let Some(craft_usage_root) = &craft_item_class.data.usage_root {
            require!(
                verify(craft_usage_proof, craft_usage_root.root, class_node.0),
                InvalidProof
            );
        } else {
            return Err(ErrorCode::MissingMerkleInfo.into());
        }

        let mut found = false;
        for cat in &craft_usage.category {
            if cat == &chosen_component.use_category {
                found = true;
                break;
            }
        }
        require!(found, UnableToFindValidCooldownState);

        match craft_usage_state.item_usage_type {
            crate::ItemUsageTypeState::Cooldown { activated_at } => {
                if activated_at.is_some() {
                    return Ok(());
                }
            }
            _ => {}
        }
    } else if let Some(usages) = &craft_item_class.data.usages {
        for i in 0..usages.len() {
            let usage = &usages[i];
            for cat in &usage.category {
                if cat == &chosen_component.use_category {
                    if let Some(states) = &craft_item.data.usage_states {
                        match states[i].item_usage_type {
                            crate::ItemUsageTypeState::Cooldown { activated_at } => {
                                if activated_at.is_some() {
                                    return Ok(());
                                }
                            }
                            _ => {}
                        }
                    } else {
                        break;
                    }
                }
            }
        }

        return Err(ErrorCode::UnableToFindValidCooldownState.into());
    } else {
        return Err(ErrorCode::MissingMerkleInfo.into());
    };

    Ok(())
}

pub struct VerifyComponentArgs<'a, 'info> {
    pub item_class: &'a Account<'info, ItemClass>,
    pub component: Option<Component>,
    pub component_proof: Option<Vec<[u8; 32]>>,
    pub item_escrow: &'a Account<'info, ItemEscrow>,
    pub craft_item_token_mint: &'a Account<'info, Mint>,
    pub component_scope: String,
}

pub fn verify_component<'a, 'info>(
    args: VerifyComponentArgs<'a, 'info>,
) -> Result<Component, ProgramError> {
    let VerifyComponentArgs {
        item_class,
        component,
        component_proof,
        item_escrow,
        craft_item_token_mint,
        component_scope,
    } = args;
    let chosen_component = if let Some(component_root) = &item_class.data.component_root {
        if let Some(p) = component_proof {
            if let Some(c) = component {
                // Verify the merkle proof.
                let node = anchor_lang::solana_program::keccak::hashv(&[
                    &[0x00],
                    &item_escrow.step.to_le_bytes(),
                    &craft_item_token_mint.key().to_bytes(),
                    &AnchorSerialize::try_to_vec(&c)?,
                ]);
                require!(verify(p, component_root.root, node.0), InvalidProof);
                c
            } else {
                return Err(ErrorCode::MissingMerkleInfo.into());
            }
        } else {
            return Err(ErrorCode::MissingMerkleInfo.into());
        }
    } else if let Some(components) = &item_class.data.components {
        let mut counter = 0;
        for c in component {
            if c.component_scope == component_scope {
                counter += 1;
            }
        }

        require!(
            item_escrow.step as usize != counter,
            ErrorCode::ItemReadyForCompletion
        );

        components[item_escrow.step as usize].clone()
    } else {
        return Err(ErrorCode::MustUseMerkleOrComponentList.into());
    };

    require!(
        chosen_component.component_scope == component_scope,
        NotPartOfComponentScope
    );

    Ok(chosen_component)
}
