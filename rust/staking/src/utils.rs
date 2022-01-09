use {
    crate::{Artifact, ArtifactClass, ErrorCode, Permissiveness, PermissivenessType, PREFIX},
    anchor_lang::{
        prelude::{
            msg, Account, AccountInfo, ProgramError, ProgramResult, Pubkey, Rent, SolanaSysvar,
            UncheckedAccount,
        },
        require,
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
        Key, Program, System, Sysvar, ToAccountInfo,
    },
    anchor_spl::token::{Mint, Token, TokenAccount},
    arrayref::array_ref,
    spl_associated_token_account::get_associated_token_address,
    spl_token::instruction::{close_account, initialize_account2},
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

pub fn assert_derivation_with_bump(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> ProgramResult {
    let key = Pubkey::create_program_address(&path, program_id)?;
    if key != *account.key {
        return Err(ErrorCode::DerivedKeyInvalid.into());
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

pub struct AssertPermissivenessAccessArgs<'a, 'b, 'c, 'info> {
    pub program_id: &'a Pubkey,
    pub given_account: &'b AccountInfo<'info>,
    pub remaining_accounts: &'c [AccountInfo<'info>],
    pub permissiveness_to_use: &'a Option<Permissiveness>,
    pub permissiveness_array: &'a Option<Vec<Permissiveness>>,
    pub index: u64,
    pub account_mint: Option<&'b Pubkey>,
}

pub fn assert_builder_must_be_holder_check(
    item_class: &Account<ArtifactClass>,
    new_item_token_holder: &UncheckedAccount,
) -> ProgramResult {
    if let Some(b) = &item_class.data.builder_must_be_holder {
        require!(
            b.boolean && !new_item_token_holder.is_signer,
            MustBeHolderToBuild
        )
    }

    return Ok(());
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

    match permissiveness_to_use {
        Some(perm_to_use) => {
            if let Some(permissiveness_arr) = permissiveness_array {
                let mut found = false;
                for entry in permissiveness_arr {
                    if entry == perm_to_use {
                        found = true;
                        break;
                    }
                }

                if !found {
                    return Err(ErrorCode::PermissivenessNotFound.into());
                }

                match perm_to_use.permissiveness_type {
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
                            return Err(ErrorCode::InsufficientBalance.into());
                        }

                        assert_derivation(
                            program_id,
                            given_account,
                            &[PREFIX.as_bytes(), mint.as_ref(), &index.to_le_bytes()],
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
                            *m
                        } else {
                            remaining_accounts[3].key()
                        };

                        assert_signer(class_token_holder)?;

                        let acct = assert_is_ata(
                            class_token_account,
                            class_token_holder.key,
                            &class_mint,
                        )?;

                        if acct.amount == 0 {
                            return Err(ErrorCode::InsufficientBalance.into());
                        }

                        assert_derivation(
                            program_id,
                            class,
                            &[PREFIX.as_bytes(), class_mint.as_ref(), &index.to_le_bytes()],
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
            }
        }
        None => return Err(ErrorCode::MustSpecifyPermissivenessType.into()),
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

pub fn assert_part_of_namespace<'a, 'b>(
    artifact: &'b AccountInfo<'a>,
    namespace: &'b AccountInfo<'a>,
) -> Result<Account<'a, raindrops_namespace::Namespace>, ProgramError> {
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

pub fn create_program_token_account_if_not_present<'a>(
    program_account: &UncheckedAccount<'a>,
    system_program: &Program<'a, System>,
    fee_payer: &AccountInfo<'a>,
    token_program: &Program<'a, Token>,
    mint: &Account<'a, Mint>,
    owner: &AccountInfo<'a>,
    rent: &Sysvar<'a, Rent>,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    assert_owned_by(&mint.to_account_info(), &token_program.key())?;

    if program_account.data_is_empty() {
        create_or_allocate_account_raw(
            *token_program.key,
            &program_account.to_account_info(),
            &rent.to_account_info(),
            &system_program,
            &fee_payer,
            spl_token::state::Account::LEN,
            signer_seeds,
        )?;

        invoke_signed(
            &initialize_account2(
                &token_program.key,
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
            &[&signer_seeds],
        )?;
    }

    Ok(())
}

pub fn close_token_account<'a>(
    program_account: &Account<'a, TokenAccount>,
    fee_payer: &AccountInfo<'a>,
    token_program: &Program<'a, Token>,
    owner: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    invoke_signed(
        &close_account(
            &token_program.key,
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
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn assert_is_proper_class<'info>(
    artifact_class: &UncheckedAccount<'info>,
    mint: &Pubkey,
    index: u64,
) -> Result<Account<'info, ArtifactClass>, ProgramError> {
    require!(
        artifact_class.owner == &raindrops_player::id()
            || artifact_class.owner == &raindrops_item::id(),
        InvalidProgramOwner
    );

    let prefix = if artifact_class.owner == &raindrops_player::id() {
        raindrops_player::PREFIX
    } else {
        raindrops_item::PREFIX
    };

    require!(!artifact_class.data_is_empty(), NotInitialized);

    let class_deserialized: anchor_lang::Account<'_, ArtifactClass> =
        Account::try_from(&artifact_class.to_account_info())?;

    assert_derivation_with_bump(
        artifact_class.owner,
        artifact_class,
        &[
            prefix.as_bytes(),
            mint.as_ref(),
            &index.to_le_bytes(),
            &[class_deserialized.bump],
        ],
    )?;

    Ok(class_deserialized)
}

pub fn assert_is_proper_instance<'info>(
    artifact: &UncheckedAccount<'info>,
    artifact_class: &Pubkey,
    mint: &Pubkey,
    index: u64,
) -> Result<Account<'info, Artifact>, ProgramError> {
    require!(
        artifact.owner == &raindrops_player::id() || artifact.owner == &raindrops_item::id(),
        InvalidProgramOwner
    );

    let prefix = if artifact.owner == &raindrops_player::id() {
        raindrops_player::PREFIX
    } else {
        raindrops_item::PREFIX
    };
    require!(!artifact.data_is_empty(), NotInitialized);

    let instance_deserialized: anchor_lang::Account<'_, Artifact> =
        Account::try_from(&artifact.to_account_info())?;

    assert_derivation_with_bump(
        artifact.owner,
        artifact,
        &[
            prefix.as_bytes(),
            mint.as_ref(),
            &index.to_le_bytes(),
            &[instance_deserialized.bump],
        ],
    )?;

    require!(
        instance_deserialized.parent == *artifact_class,
        PublicKeyMismatch
    );

    Ok(instance_deserialized)
}
