use std::str::FromStr;

use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};
use anchor_spl::token;

use crate::state::data::{AttributeMetadata, TraitData};

// owner: BuwHRcmPwbVhnY6HBm5tTSdj9z8b59atBaaihRbntWR9
static MAINNET_RAIN_VAULT: &str = "DLHSKqRuAferYFTKqLAMRKM2hgze5vtYQPot97LXUnVB";
static DEVNET_RAIN_VAULT: &str = "66NekdBHVwqdvGtWkjAaJsjJPX5nZPbXrYUbZihFoDzr";
static RAIN_FEE_AMOUNT: u64 = 100_000; // 1 $RAIN

// return true if the mint address equals the $RAIN address
pub fn is_rain_vault(token_account: Pubkey) -> bool {
    let rain_vault = Pubkey::from_str(MAINNET_RAIN_VAULT).unwrap();
    let rain_vault_dev = Pubkey::from_str(DEVNET_RAIN_VAULT).unwrap();

    token_account.eq(&rain_vault) || token_account.eq(&rain_vault_dev)
}

// transfer the $RAIN fee to the Raindrops Vault
pub fn pay_rain_fee<'info>(
    from_ata: AccountInfo<'info>,
    to_ata: AccountInfo<'info>,
    from_authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
) -> Result<()> {
    // transfer 1 $RAIN
    let transfer_accounts = token::Transfer {
        from: from_ata,
        to: to_ata,
        authority: from_authority,
    };

    token::transfer(
        CpiContext::new(token_program, transfer_accounts),
        RAIN_FEE_AMOUNT,
    )
}

pub fn reallocate<'info>(
    size_diff: i64,
    account: &AccountInfo<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
) -> Result<()> {
    let new_size = (account.data_len() as i64 + size_diff) as usize;
    account.realloc(new_size, false)?;

    let rent = Rent::get()?;

    let lamports_required = rent.minimum_balance(new_size);

    let current_lamports = account.lamports();

    let transfer_amount: i64 = (lamports_required as i64) - (current_lamports as i64);

    // no need to transfer
    if transfer_amount == 0 {
        return Ok(());
    }

    if transfer_amount > 0 {
        // if transfer amount is more than 0 we need to transfer lamports to the account
        let transfer_accounts = Transfer {
            from: payer.to_account_info(),
            to: account.to_account_info(),
        };

        transfer(
            CpiContext::new(system_program.to_account_info(), transfer_accounts),
            transfer_amount.try_into().unwrap(),
        )
    } else {
        // if transfer amount is less than 0 this means we need to return lamports to the payer
        let transfer_to_payer_amount = transfer_amount.unsigned_abs();

        **account.try_borrow_mut_lamports()? -= transfer_to_payer_amount;
        **payer.try_borrow_mut_lamports()? += transfer_to_payer_amount;

        Ok(())
    }
}

pub fn validate_attribute_availability(
    required_attribute_ids: &Vec<u16>,
    equipped_avatar_traits: &[TraitData],
    attribute_metadata: &[AttributeMetadata],
) -> bool {
    for id in required_attribute_ids {
        // check that the required attribute ids are not occupied
        let occupied = equipped_avatar_traits
            .iter()
            .any(|equipped_avatar_trait| equipped_avatar_trait.attribute_ids.contains(id));
        if occupied {
            return false;
        }

        // check that the required attribute ids are mutable
        let am = attribute_metadata.iter().find(|am| am.id == *id).unwrap();
        if !am.status.mutable {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use crate::state::data::AttributeStatus;

    use super::*;

    #[test]
    fn test_is_available() {
        let required_attribute_ids = vec![0, 1];
        let equipped_avatar_traits: Vec<TraitData> = vec![TraitData {
            attribute_ids: vec![9],
            trait_id: 0,
            trait_address: Pubkey::new_unique(),
            variant_selection: vec![],
        }];
        let attribute_metadata: Vec<AttributeMetadata> = vec![
            AttributeMetadata {
                id: 0,
                name: "test1".to_string(),
                status: AttributeStatus { mutable: true },
            },
            AttributeMetadata {
                id: 1,
                name: "test2".to_string(),
                status: AttributeStatus { mutable: true },
            },
        ];

        let valid = validate_attribute_availability(
            &required_attribute_ids,
            &equipped_avatar_traits,
            &attribute_metadata,
        );
        assert!(valid);
    }

    #[test]
    fn test_is_unavailable() {
        let required_attribute_ids = vec![0, 1];
        let equipped_avatar_traits: Vec<TraitData> = vec![
            TraitData {
                attribute_ids: vec![0],
                trait_id: 1,
                trait_address: Pubkey::new_unique(),
                variant_selection: vec![],
            },
            TraitData {
                attribute_ids: vec![9],
                trait_id: 0,
                trait_address: Pubkey::new_unique(),
                variant_selection: vec![],
            },
        ];
        let attribute_metadata: Vec<AttributeMetadata> = vec![
            AttributeMetadata {
                id: 0,
                name: "test1".to_string(),
                status: AttributeStatus { mutable: true },
            },
            AttributeMetadata {
                id: 1,
                name: "test2".to_string(),
                status: AttributeStatus { mutable: true },
            },
        ];

        let valid = validate_attribute_availability(
            &required_attribute_ids,
            &equipped_avatar_traits,
            &attribute_metadata,
        );
        assert!(!valid);
    }

    #[test]
    #[should_panic]
    fn test_attribute_id_does_not_exist() {
        let required_attribute_ids = vec![0, 1];
        let equipped_avatar_traits: Vec<TraitData> = vec![];
        let attribute_metadata: Vec<AttributeMetadata> = vec![AttributeMetadata {
            id: 0,
            name: "test1".to_string(),
            status: AttributeStatus { mutable: true },
        }];

        let valid = validate_attribute_availability(
            &required_attribute_ids,
            &equipped_avatar_traits,
            &attribute_metadata,
        );
        assert!(valid);
    }

    #[test]
    fn test_immutable() {
        let required_attribute_ids = vec![0, 1];
        let equipped_avatar_traits: Vec<TraitData> = vec![TraitData {
            attribute_ids: vec![9],
            trait_id: 0,
            trait_address: Pubkey::new_unique(),
            variant_selection: vec![],
        }];
        let attribute_metadata: Vec<AttributeMetadata> = vec![
            AttributeMetadata {
                id: 0,
                name: "test1".to_string(),
                status: AttributeStatus { mutable: false },
            },
            AttributeMetadata {
                id: 1,
                name: "test2".to_string(),
                status: AttributeStatus { mutable: false },
            },
        ];

        let valid = validate_attribute_availability(
            &required_attribute_ids,
            &equipped_avatar_traits,
            &attribute_metadata,
        );
        assert!(!valid);
    }
}
