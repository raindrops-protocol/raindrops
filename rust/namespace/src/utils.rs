use crate::{ErrorCode, Filter, Namespace, NamespaceGatekeeper, Permissiveness};
use anchor_lang::{
    error,
    prelude::{msg, Account, AccountInfo, ProgramError, Pubkey, Result, UncheckedAccount},
    solana_program::program_pack::{IsInitialized, Pack},
    Key, ToAccountInfo,
};
use arrayref::array_ref;
use raindrops_item::{Item, ItemClass, ItemEscrow};
use raindrops_matches::Match;

pub fn assert_part_of_namespace<'a>(
    artifact: &AccountInfo<'a>,
    namespace: &Account<'a, Namespace>,
) -> Result<()> {
    let data = artifact.data.borrow_mut();
    let number = u32::from_le_bytes(*array_ref![data, 8, 4]) as usize;
    let offset = 12 as usize;
    msg!("number: {}, offset: {}", number, offset);
    for i in 0..number {
        let key_bytes = array_ref![data, offset + i * 33, 32];
        let key = Pubkey::new_from_array(*key_bytes);
        if key == namespace.key() {
            return Ok(());
        }
    }

    return Err(error!(ErrorCode::ArtifactLacksNamespace));
}

pub fn assert_initialized<T: Pack + IsInitialized>(account_info: &AccountInfo) -> Result<T> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(error!(ErrorCode::Uninitialized))
    } else {
        Ok(account)
    }
}

pub fn assert_derivation(program_id: &Pubkey, account: &AccountInfo, path: &[&[u8]]) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(error!(ErrorCode::DerivedKeyInvalid));
    }
    Ok(bump)
}

pub fn assert_signer(account: &UncheckedAccount) -> Result<()> {
    if !account.is_signer {
        Err(ProgramError::MissingRequiredSignature.into())
    } else {
        Ok(())
    }
}

pub fn pull_namespaces(artifact: &AccountInfo) -> Result<Vec<Pubkey>> {
    let mut namespaces: Vec<Pubkey> = vec![];

    if let Ok(item_class) = Account::<'_, ItemClass>::try_from(artifact) {
        let artifact_namespaces = match item_class.namespaces.as_ref() {
            Some(artifact_namespaces) => artifact_namespaces,
            None => {
                return Err(error!(ErrorCode::DesiredNamespacesNone));
            }
        };
        for ns in artifact_namespaces {
            namespaces.push(ns.namespace);
        }

        return Ok(namespaces);
    } else if let Ok(item_escrow) = Account::<'_, ItemEscrow>::try_from(artifact) {
        let artifact_namespaces = match item_escrow.namespaces.as_ref() {
            Some(artifact_namespaces) => artifact_namespaces,
            None => {
                return Err(error!(ErrorCode::DesiredNamespacesNone));
            }
        };
        for ns in artifact_namespaces {
            namespaces.push(ns.namespace);
        }

        return Ok(namespaces);
    } else if let Ok(item_escrow) = Account::<'_, Item>::try_from(artifact) {
        let artifact_namespaces = match item_escrow.namespaces.as_ref() {
            Some(artifact_namespaces) => artifact_namespaces,
            None => {
                return Err(error!(ErrorCode::DesiredNamespacesNone));
            }
        };
        for ns in artifact_namespaces {
            namespaces.push(ns.namespace);
        }

        return Ok(namespaces);
    } else if let Ok(match_state) = Account::<'_, Match>::try_from(artifact) {
        let artifact_namespaces = match match_state.namespaces.as_ref() {
            Some(artifact_namespaces) => artifact_namespaces,
            None => {
                return Err(error!(ErrorCode::DesiredNamespacesNone));
            }
        };
        for ns in artifact_namespaces {
            namespaces.push(ns.namespace);
        }

        return Ok(namespaces);
    } else if let Ok(namespace) = Account::<'_, Namespace>::try_from(artifact) {
        let artifact_namespaces = match namespace.namespaces.as_ref() {
            Some(artifact_namespaces) => artifact_namespaces,
            None => {
                return Err(error!(ErrorCode::DesiredNamespacesNone));
            }
        };
        for ns in artifact_namespaces {
            namespaces.push(ns.namespace);
        }

        return Ok(namespaces);
    }

    Err(error!(ErrorCode::IncorrectOwner))
}

pub fn check_permissiveness_against_holder<'a>(
    program_id: &Pubkey,
    artifact: &UncheckedAccount<'a>,
    token_holder: &UncheckedAccount<'a>,
    namespace_gatekeeper: &Account<'a, NamespaceGatekeeper>,
    permissiveness: &Permissiveness,
) -> Result<()> {
    if !artifact.owner.eq(&program_id) {
        return Err(error!(ErrorCode::IncorrectOwner));
    }

    let art_namespaces = pull_namespaces(artifact)?;
    match permissiveness {
        Permissiveness::All => {
            msg!("All match");
            Ok(())
        }
        Permissiveness::Whitelist => {
            msg!("Whitelist match");
            let deserialized: Account<'_, NamespaceGatekeeper> =
                Account::try_from(&namespace_gatekeeper.to_account_info())?;
            for filter in &deserialized.artifact_filters {
                match &filter.filter {
                    Filter::Namespace { namespaces } => {
                        for n in &art_namespaces {
                            for other_n in namespaces {
                                if other_n == n {
                                    msg!("Whitelisted!");
                                    return Ok(());
                                }
                            }
                        }
                        return Err(error!(ErrorCode::CannotJoinNamespace));
                    }
                    Filter::Category { namespace, .. } => {
                        msg!("category filter");
                        for n in &art_namespaces {
                            if n == namespace {
                                msg!("Whitelisted!");
                                return Ok(());
                            }
                        }
                        return Err(error!(ErrorCode::CannotJoinNamespace));
                    }
                    Filter::Key { mint, .. } => {
                        msg!("key filter");
                        let as_token: spl_token::state::Account =
                            assert_initialized(&artifact.to_account_info())?;

                        if as_token.mint == *mint {
                            msg!("Whitelisted!");
                            return Ok(());
                        }
                        return Err(error!(ErrorCode::CannotJoinNamespace));
                    }
                }
            }
            return Err(error!(ErrorCode::CannotJoinNamespace));
        }
        Permissiveness::Blacklist => {
            msg!("Blacklist match");
            let deserialized: Account<'_, NamespaceGatekeeper> =
                Account::try_from(&namespace_gatekeeper.to_account_info())?;
            for filter in &deserialized.artifact_filters {
                match &filter.filter {
                    Filter::Namespace { namespaces } => {
                        for n in &art_namespaces {
                            for other_n in namespaces {
                                if other_n == n {
                                    msg!("Blacklisted!");
                                    return Err(error!(ErrorCode::CannotJoinNamespace));
                                }
                            }
                        }
                        return Ok(());
                    }
                    Filter::Category { namespace, .. } => {
                        for n in art_namespaces {
                            if n == *namespace {
                                msg!("Blacklisted!");
                                return Err(error!(ErrorCode::CannotJoinNamespace));
                            }
                        }
                        return Ok(());
                    }
                    Filter::Key { mint, .. } => {
                        let as_token: spl_token::state::Account =
                            assert_initialized(&artifact.to_account_info())?;

                        if as_token.mint == *mint {
                            msg!("Blacklisted!");
                            return Err(error!(ErrorCode::CannotJoinNamespace));
                        }
                        return Ok(());
                    }
                }
            }
            return Err(error!(ErrorCode::CannotJoinNamespace));
        }
        Permissiveness::Namespace => {
            msg!("Namespace match");
            assert_signer(token_holder)?;
            return Ok(());
        }
    }
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

// returns the lowest page that has space for new artifacts
pub fn lowest_available_page(full_pages: &mut Vec<u64>) -> Result<u64> {
    full_pages.sort();

    if full_pages.len() == 0 {
        return Ok(0);
    }

    let page = full_pages[full_pages.len() - 1] + 1;

    Ok(page)
}
