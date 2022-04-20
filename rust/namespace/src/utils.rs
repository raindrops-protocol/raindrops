use {
    crate::{
        ErrorCode, Filter, Namespace, NamespaceAndIndex, NamespaceGatekeeper, Permissiveness,
        NAMESPACE_AND_INDEX_SIZE,
    },
    anchor_lang::{
        error,
        prelude::{
            msg, Account, AccountInfo, ProgramError, Pubkey, Rent, Result, SolanaSysvar,
            UncheckedAccount,
        },
        solana_program::{
            borsh::try_from_slice_unchecked,
            program::{invoke, invoke_signed},
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
        Key, ToAccountInfo,
    },
    arrayref::array_ref,
    std::{convert::TryInto, str::FromStr},
};

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
        if authority_signer_seeds.len() == 0 {
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
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(error!(ErrorCode::DerivedKeyInvalid));
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
) -> Result<()> {
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

pub fn assert_signer(account: &UncheckedAccount) -> Result<()> {
    if !account.is_signer {
        Err(ProgramError::MissingRequiredSignature.into())
    } else {
        Ok(())
    }
}

pub fn assert_part_of_namespace<'a>(
    artifact: &AccountInfo<'a>,
    namespace: &Account<'a, Namespace>,
) -> Result<()> {
    let data = artifact.data.borrow_mut();
    let number = u32::from_le_bytes(*array_ref![data, 8, 4]) as usize;
    let offset = 12 as usize;
    for i in 0..number {
        let key_bytes = array_ref![data, offset + i * 33, 32];
        let key = Pubkey::new_from_array(*key_bytes);
        if key == namespace.key() {
            return Ok(());
        }
    }

    return Err(error!(ErrorCode::ArtifactLacksNamespace));
}

pub fn inverse_indexed_bool_for_namespace(
    artifact: &mut UncheckedAccount,
    namespace: Pubkey,
) -> Result<u8> {
    let mut data = artifact.data.borrow_mut();
    let mut start: usize = 12;
    let found = false;
    while found == false && start < data.len() {
        let bytes = array_ref![data, start, 32];
        let key = Pubkey::new_from_array(*bytes);
        if key == namespace {
            let old_val = data[start + 33];
            data[start + 33] = if data[start + 33] == 1 { 0 } else { 1 };
            return Ok(old_val);
        }
        start += 33;
    }
    return Err(error!(ErrorCode::ArtifactNotPartOfNamespace));
}

pub fn pull_namespaces(artifact: &AccountInfo) -> Result<Option<Vec<NamespaceAndIndex>>> {
    let data = artifact.data.borrow_mut();

    if data[8] == 0 {
        return Ok(None);
    }

    let amount = u32::from_le_bytes(*array_ref![data, 9, 4]);

    let cursor: usize = 13;

    let mut arr: Vec<NamespaceAndIndex> = vec![];
    for _n in 0..amount {
        let bytes = array_ref![data, cursor, NAMESPACE_AND_INDEX_SIZE];
        let serialized: NamespaceAndIndex = try_from_slice_unchecked(bytes)?;
        arr.push(serialized)
    }

    return Ok(Some(arr));
}

pub fn check_permissiveness_against_holder<'a>(
    artifact: &UncheckedAccount<'a>,
    token_holder: &UncheckedAccount<'a>,
    namespace_gatekeeper: &UncheckedAccount<'a>,
    permissiveness: &Permissiveness,
) -> Result<Option<Vec<NamespaceAndIndex>>> {
    let art_namespaces = pull_namespaces(artifact)?;
    return match permissiveness {
        Permissiveness::All => Ok(art_namespaces),
        Permissiveness::Whitelist => {
            if namespace_gatekeeper.data_is_empty() {
                return Err(error!(ErrorCode::CannotJoinNamespace));
            } else {
                let deserialized: Account<'_, NamespaceGatekeeper> =
                    Account::try_from(&namespace_gatekeeper.to_account_info())?;
                for filter in &deserialized.artifact_filters {
                    match &filter.filter {
                        Filter::Namespace { namespaces } => {
                            if let Some(ns) = &art_namespaces {
                                for n in namespaces {
                                    for other_n in ns {
                                        if other_n.namespace == *n {
                                            msg!("Whitelisted!");
                                            return Ok(art_namespaces);
                                        }
                                    }
                                }
                            }
                            return Err(error!(ErrorCode::CannotJoinNamespace));
                        }
                        Filter::Category { namespace, .. } => {
                            if let Some(ns) = &art_namespaces {
                                for n in ns {
                                    if n.namespace == *namespace {
                                        msg!("Whitelisted!");
                                        return Ok(art_namespaces);
                                    }
                                }
                            }
                            return Err(error!(ErrorCode::CannotJoinNamespace));
                        }
                        Filter::Key { mint, .. } => {
                            let as_token: spl_token::state::Account =
                                assert_initialized(&artifact.to_account_info())?;

                            if as_token.mint == *mint {
                                msg!("Whitelisted!");
                                return Ok(art_namespaces);
                            }
                            return Err(error!(ErrorCode::CannotJoinNamespace));
                        }
                    }
                }
                return Err(error!(ErrorCode::CannotJoinNamespace));
            }
        }
        Permissiveness::Blacklist => {
            if namespace_gatekeeper.data_is_empty() {
                return Err(error!(ErrorCode::CannotJoinNamespace));
            } else {
                let deserialized: Account<'_, NamespaceGatekeeper> =
                    Account::try_from(&namespace_gatekeeper.to_account_info())?;
                for filter in &deserialized.artifact_filters {
                    match &filter.filter {
                        Filter::Namespace { namespaces } => {
                            if let Some(ns) = &art_namespaces {
                                for n in namespaces {
                                    for other_n in ns {
                                        if other_n.namespace == *n {
                                            msg!("Blacklisted!");
                                            return Err(error!(ErrorCode::CannotJoinNamespace));
                                        }
                                    }
                                }
                            }
                            return Ok(art_namespaces);
                        }
                        Filter::Category { namespace, .. } => {
                            if let Some(ns) = &art_namespaces {
                                for n in ns {
                                    if n.namespace == *namespace {
                                        msg!("Blacklisted!");
                                        return Err(error!(ErrorCode::CannotJoinNamespace));
                                    }
                                }
                            }
                            return Ok(art_namespaces);
                        }
                        Filter::Key { mint, .. } => {
                            let as_token: spl_token::state::Account =
                                assert_initialized(&artifact.to_account_info())?;

                            if as_token.mint == *mint {
                                msg!("Blacklisted!");
                                return Err(error!(ErrorCode::CannotJoinNamespace));
                            }
                            return Ok(art_namespaces);
                        }
                    }
                }
                return Err(error!(ErrorCode::CannotJoinNamespace));
            }
        }
        Permissiveness::Namespace => {
            assert_signer(token_holder)?;
            return Ok(art_namespaces);
        }
    };
}

pub fn assert_can_add_to_namespace<'a>(
    artifact: &UncheckedAccount<'a>,
    token_holder: &UncheckedAccount<'a>,
    namespace: &Account<'a, Namespace>,
    namespace_gatekeeper: &UncheckedAccount<'a>,
) -> Result<Option<Vec<NamespaceAndIndex>>> {
    let art_namespaces = if artifact.owner == &Pubkey::from_str(crate::PLAYER_ID).unwrap() {
        check_permissiveness_against_holder(
            artifact,
            token_holder,
            namespace_gatekeeper,
            &namespace.permissiveness_settings.player_permissiveness,
        )?
    } else if artifact.owner == &Pubkey::from_str(crate::ITEM_ID).unwrap() {
        check_permissiveness_against_holder(
            artifact,
            token_holder,
            namespace_gatekeeper,
            &namespace.permissiveness_settings.item_permissiveness,
        )?
    } else if artifact.owner == &Pubkey::from_str(crate::MATCH_ID).unwrap() {
        check_permissiveness_against_holder(
            artifact,
            token_holder,
            namespace_gatekeeper,
            &namespace.permissiveness_settings.match_permissiveness,
        )?
    } else if artifact.owner == &crate::id() {
        check_permissiveness_against_holder(
            artifact,
            token_holder,
            namespace_gatekeeper,
            &namespace.permissiveness_settings.namespace_permissiveness,
        )?
    } else {
        return Err(error!(ErrorCode::CannotJoinNamespace));
    };
    return Ok(art_namespaces);
}
pub fn assert_metadata_valid<'a>(
    metadata: &UncheckedAccount,
    edition: Option<&UncheckedAccount>,
    mint: &Pubkey,
) -> Result<()> {
    assert_derivation(
        &metaplex_token_metadata::id(),
        &metadata.to_account_info(),
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
            &ed.to_account_info(),
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
