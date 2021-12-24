use {
    crate::{ErrorCode, UpdatePermissiveness, PREFIX},
    anchor_lang::{
        prelude::{
            msg, AccountInfo, ProgramError, ProgramResult, Pubkey, Rent, SolanaSysvar,
            UncheckedAccount,
        },
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
        ToAccountInfo,
    },
    spl_associated_token_account::get_associated_token_address,
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
    pub update_permissiveness_to_use: &'a UpdatePermissiveness,
    pub update_permissiveness_array: &'a [UpdatePermissiveness],
    pub index: u64,
    pub account_mint: Option<&'b AccountInfo<'info>>,
}

pub fn assert_permissiveness_access(args: AssertPermissivenessAccessArgs) -> ProgramResult {
    let AssertPermissivenessAccessArgs {
        program_id,
        given_account,
        remaining_accounts,
        update_permissiveness_to_use,
        update_permissiveness_array,
        index,
        account_mint,
    } = args;
    let mut found = false;
    for entry in update_permissiveness_array {
        if entry == update_permissiveness_to_use {
            found = true;
            break;
        }
    }

    if !found {
        return Err(ErrorCode::PermissivenessNotFound.into());
    }

    match update_permissiveness_to_use {
        UpdatePermissiveness::TokenHolderCanUpdate { inherited: _ } => {
            // parent token_account [readable]
            // parent token_holder [signer]
            // parent mint [readable]
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
        UpdatePermissiveness::ClassHolderCanUpdate { inherited: _ } => {}
        UpdatePermissiveness::UpdateAuthorityCanUpdate { inherited: _ } => todo!(),
        UpdatePermissiveness::AnybodyCanUpdate { inherited: _ } => todo!(),
    }

    Ok(())
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
    metadata: &UncheckedAccount,
    edition: Option<&UncheckedAccount>,
    mint: &Pubkey,
) -> ProgramResult {
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
        return Err(ErrorCode::MetadataDoesntExist.into());
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
            return Err(ErrorCode::EditionDoesntExist.into());
        }
    }

    Ok(())
}
