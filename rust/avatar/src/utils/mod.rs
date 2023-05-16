use std::str::FromStr;

use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::state::data::{AttributeMetadata, TraitData};

static MAINNET_RAIN: &str = "rainH85N1vCoerCi4cQ3w6mCf7oYUdrsTFtFzpaRwjL";
static DEVNET_RAIN: &str = "97R2xnMcp4MQTitwy9hsMu6ybXcxJk368yyA9T9QiMMv";
static RAINDROPS_FEE_VAULT: &str = "Fequ3NnuSMUda7WXBARqEAav6ehuysAnLx2dM7s5wwan";
static RAINDROPS_FEE_AMOUNT: u64 = 1000000;

// return true if the mint address equals the $RAIN address
pub fn is_rain(mint: Pubkey) -> bool {
    let rain_mint = Pubkey::from_str(MAINNET_RAIN).unwrap();
    let rain_mint_dev = Pubkey::from_str(DEVNET_RAIN).unwrap();

    mint.eq(&rain_mint) || mint.eq(&rain_mint_dev)
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

// return true if address matches our expected fee address
pub fn is_raindrops_fee_vault(address: Pubkey) -> bool {
    address.eq(&Pubkey::from_str(RAINDROPS_FEE_VAULT).unwrap())
}

// transfer lamports to the fee vault
pub fn pay_raindrops_fee<'info>(
    receiver: &AccountInfo<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
) -> Result<()> {
    let transfer_accounts = Transfer {
        from: payer.to_account_info(),
        to: receiver.to_account_info(),
    };

    transfer(
        CpiContext::new(system_program.to_account_info(), transfer_accounts),
        RAINDROPS_FEE_AMOUNT,
    )
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
    fn is_mainnet_rain() {
        let rain_mint = Pubkey::from_str(MAINNET_RAIN).unwrap();
        assert!(is_rain(rain_mint));
    }

    #[test]
    fn is_devnet_rain() {
        let rain_mint_dev = Pubkey::from_str(DEVNET_RAIN).unwrap();
        assert!(is_rain(rain_mint_dev));
    }

    #[test]
    fn test_is_available() {
        let required_attribute_ids = vec![0, 1];
        let equipped_avatar_traits: Vec<TraitData> = vec![TraitData {
            attribute_ids: vec![9],
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
                trait_address: Pubkey::new_unique(),
                variant_selection: vec![],
            },
            TraitData {
                attribute_ids: vec![9],
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
