use crate::{ErrorCode, Filter, TokenValidation, ValidationArgs};
use anchor_lang::{
    error,
    prelude::{
        msg, Account, AccountInfo, AccountMeta, Program, Pubkey, Rent, Result, SolanaSysvar,
        UncheckedAccount,
    },
    require,
    solana_program::{
        hash,
        instruction::Instruction,
        program::{invoke, invoke_signed},
        program_pack::{IsInitialized, Pack},
        system_instruction,
    },
    AnchorSerialize, Key, ToAccountInfo,
};
use anchor_spl::token::{Mint, Token};
use arrayref::array_ref;
use spl_associated_token_account::get_associated_token_address;
use spl_token::instruction::close_account;
use std::{convert::TryInto, str::FromStr};

pub const NAMESPACE_ID: &str = "nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV";

pub fn assert_is_ata(
    ata: &AccountInfo,
    wallet: &Pubkey,
    mint: &Pubkey,
    expected_delegate: Option<&Pubkey>,
) -> Result<spl_token::state::Account> {
    msg!("inside assert_is_ata");
    assert_owned_by(ata, &spl_token::id())?;
    msg!("assert owned by success");
    let ata_account: spl_token::state::Account = assert_initialized(ata)?;
    msg!("assert init success");
    assert_keys_equal(ata_account.owner, *wallet)?;
    msg!("assert owner equal success");
    assert_keys_equal(ata_account.mint, mint.key())?;
    msg!("assert mint equal success");
    assert_keys_equal(get_associated_token_address(wallet, mint), *ata.key)?;
    //if let Some(delegate) = expected_delegate {
    //    msg!("delegate some");
    //    require!(
    //        ata_account.delegate.unwrap() == *delegate,
    //        AtaDelegateMismatch
    //    );
    //} else {
    //    msg!("delegate is none");
    //    require!(ata_account.delegate.is_none(), AtaShouldNotHaveDelegate);
    //}
    Ok(ata_account)
}

pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> Result<()> {
    if key1 != key2 {
        Err(error!(ErrorCode::PublicKeyMismatch))
    } else {
        Ok(())
    }
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

/// Returns true if a `leaf` can be proved to be a part of a Merkle tree
/// defined by `root`. For this, a `proof` must be provided, containing
/// sibling hashes on the branch from the leaf to the root of the tree. Each
/// pair of leaves and each pair of pre-images are assumed to be sorted.
pub fn verify(proof: &Vec<[u8; 32]>, root: &[u8; 32], leaf: [u8; 32]) -> bool {
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

pub fn is_part_of_namespace<'a>(artifact: &AccountInfo<'a>, namespace: &Pubkey) -> bool {
    let data = artifact.data.borrow_mut();
    let number = u32::from_le_bytes(*array_ref![data, 9, 4]) as usize;
    let offset = 13_usize;
    for i in 0..number {
        let key_bytes = array_ref![data, offset + i * 33, 32];
        let key = Pubkey::new_from_array(*key_bytes);
        if key == *namespace {
            return true;
        }
    }

    false
}

pub fn sighash(namespace: &str, name: &str) -> [u8; 8] {
    let preimage = format!("{}:{}", namespace, name);

    let mut sighash = [0u8; 8];
    sighash.copy_from_slice(&hash::hash(preimage.as_bytes()).to_bytes()[..8]);
    sighash
}

pub fn grab_parent<'a>(artifact: &AccountInfo<'a>) -> Result<Pubkey> {
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

pub fn is_valid_validation<'info>(
    val: &TokenValidation,
    source_item_or_player_pda: &UncheckedAccount<'info>,
    token_mint: &Account<'info, Mint>,
    validation_program: &UncheckedAccount<'info>,
) -> Result<bool> {
    match val.filter {
        Filter::None => {
            return Err(error!(ErrorCode::NoTokensAllowed));
        }
        Filter::All => {
            if val.is_blacklist {
                return Err(error!(ErrorCode::Blacklisted));
            } else {
                return Ok(true);
            }
        }
        Filter::Namespace { namespace } => {
            if !is_part_of_namespace(source_item_or_player_pda, &namespace) {
                return Ok(false);
            }
        }
        Filter::Parent { key } => {
            let parent = grab_parent(source_item_or_player_pda)?;
            if key != parent {
                return Ok(false);
            }
        }
        Filter::Mint { mint } => {
            if token_mint.key() != mint {
                return Ok(false);
            }
        }
    }

    if val.is_blacklist {
        return Err(error!(ErrorCode::Blacklisted));
    }

    if let Some(validation) = &val.validation {
        let accounts = vec![
            source_item_or_player_pda.to_account_info(),
            token_mint.to_account_info(),
            validation_program.to_account_info(),
        ];

        assert_keys_equal(validation_program.key(), validation.key)?;

        let keys = vec![
            AccountMeta::new_readonly(source_item_or_player_pda.key(), false),
            AccountMeta::new_readonly(token_mint.key(), false),
        ];

        invoke(
            &Instruction {
                program_id: validation.key,
                accounts: keys,
                data: AnchorSerialize::try_to_vec(&ValidationArgs {
                    instruction: sighash("global", "match_validation"),
                    extra_identifier: validation.code,
                    token_validation: val.clone(),
                })?,
            },
            &accounts,
        )?;
    }

    Ok(true)
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
