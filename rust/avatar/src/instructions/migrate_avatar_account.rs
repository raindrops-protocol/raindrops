use std::str::FromStr;
use std::vec;

use anchor_lang::prelude::*;

use crate::state::accounts::Avatar;
use crate::state::data::{TraitData, VariantOption};
use crate::state::errors::ErrorCode;
use crate::utils::reallocate;

#[derive(Accounts)]
pub struct MigrateAvatarAccount<'info> {
    /// CHECK: old avatar account data
    #[account(mut)]
    pub avatar: UncheckedAccount<'info>,

    #[account(mut, constraint = authority.key().eq(&Pubkey::from_str("3kkFMBB6Hg3HTR4e6c9CKaPrUUcrjA694aGTJrbVG675").unwrap()))]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigrateAvatarAccount>) -> Result<()> {
    msg!("migrating avatar account: {}", &ctx.accounts.avatar.key());
    let avatar_account_info = &ctx.accounts.avatar.to_account_info();

    // get current space of account
    let old_space = avatar_account_info.data_len();
    msg!("old_avatar_account_space: {}", old_space);

    // Extract old data within a local scope to ensure the mutable borrow is released afterwards
    let (old_avatar_class, old_mint, old_image_uri, old_traits, old_variants) = {
        let b = &avatar_account_info.try_borrow_mut_data().unwrap();
        let avatar_account: OldAvatar = AnchorDeserialize::deserialize(&mut &b[8..]).unwrap();

        (
            avatar_account.avatar_class,
            avatar_account.mint,
            avatar_account.image_uri,
            avatar_account.traits,
            avatar_account.variants,
        )
    };

    let mut new_trait_data: Vec<TraitData> = Vec::new();
    for old_trait in old_traits {
        new_trait_data.push(TraitData {
            attribute_ids: old_trait.attribute_ids,
            trait_id: old_trait.trait_id,
            trait_address: old_trait.trait_address,
            variant_selection: old_trait.variant_selection,
            trait_gate: None,
        })
    }

    // Create new avatar data using fetched old data
    let new_avatar_data: Avatar = Avatar {
        avatar_class: old_avatar_class,
        mint: old_mint,
        image_uri: old_image_uri,
        traits: new_trait_data,
        variants: old_variants,
    };

    // Serialize the new_avatar_data
    let new_avatar_data_vec = new_avatar_data.try_to_vec().unwrap();

    // get the new space of the account
    let new_space = new_avatar_data.current_space();
    msg!("new_avatar_account_space: {}", new_space);

    // calculate the diff in space from old and new
    let space_diff = new_space as i64 - old_space as i64;
    msg!("space_diff: {}", space_diff);

    // reallocate the account data based on the diff
    reallocate(
        space_diff,
        avatar_account_info,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )?;
    msg!("account size reallocated");

    // Ensure the size fits
    assert!(8 + new_avatar_data_vec.len() <= ctx.accounts.avatar.data_len());

    // Borrow the avatar account mutably and overwrite its data (excluding the first 8 bytes)
    {
        let mut avatar_account_data = ctx.accounts.avatar.try_borrow_mut_data()?;
        avatar_account_data[8..8 + new_avatar_data_vec.len()].copy_from_slice(&new_avatar_data_vec);
    }
    msg!("new avatar data written to account");

    // deserialize new account
    let new_account_data: Account<'_, Avatar> =
        Account::try_from(&ctx.accounts.avatar.to_account_info()).unwrap();

    msg!("new account deserialized");

    // simple check to make sure the new account data is correct
    require!(
        new_account_data.mint.eq(&old_mint),
        ErrorCode::MigrationError
    );

    Ok(())
}

#[account]
pub struct OldAvatar {
    pub avatar_class: Pubkey,
    pub mint: Pubkey,
    pub image_uri: String,
    pub traits: Vec<OldTraitData>,
    pub variants: Vec<VariantOption>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct OldTraitData {
    pub attribute_ids: Vec<u16>,
    pub trait_id: u16,
    pub trait_address: Pubkey,
    pub variant_selection: Vec<VariantOption>,
}
