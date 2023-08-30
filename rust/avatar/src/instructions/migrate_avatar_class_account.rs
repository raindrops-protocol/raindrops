use std::str::FromStr;

use anchor_lang::prelude::*;

use crate::state::data::{AttributeMetadata, AttributeStatus, AttributeType, VariantMetadata};
use crate::state::{accounts::AvatarClass, errors::ErrorCode};
use crate::utils::reallocate;

#[derive(Accounts)]
pub struct MigrateAvatarClassAccount<'info> {
    /// CHECK: old avatar_class account data
    #[account(mut)]
    pub avatar_class: UncheckedAccount<'info>,

    #[account(mut, constraint = authority.key().eq(&Pubkey::from_str("3kkFMBB6Hg3HTR4e6c9CKaPrUUcrjA694aGTJrbVG675").unwrap()))]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MigrateAvatarClassAccountArgs {
    pub new_attribute_metadata: Vec<AttributeMetadata>,
    pub global_rendering_config_uri: String,
}

pub fn handler(ctx: Context<MigrateAvatarClassAccount>, args: MigrateAvatarClassAccountArgs) -> Result<()> {
    msg!(
        "migrating avatar_class account: {}",
        &ctx.accounts.avatar_class.key()
    );
    let avatar_class_account_info = &ctx.accounts.avatar_class.to_account_info();

    // get current space of account
    let old_space = avatar_class_account_info.data_len();
    msg!("old_avatar_class_account_space: {}", old_space);

    // Extract old data within a local scope to ensure the mutable borrow is released afterwards
    let (
        old_mint,
        old_trait_index,
        old_payment_index,
        //old_attribute_metadata,
        //old_variant_metadata,
        //old_global_rendering_config_uri,
    ) = {
        let b = &avatar_class_account_info.try_borrow_mut_data().unwrap();
        msg!("borrowed data");

        (
            Pubkey::new(&b[8..40]),
            u16::from_le_bytes(b[40..42].try_into().unwrap()),
            u64::from_le_bytes(b[42..50].try_into().unwrap()),
        )
    };
    msg!("old data extracted: {} {} {}", old_mint, old_trait_index, old_payment_index);

    // Create new avatar_class data using fetched old data
    let new_avatar_class_data: AvatarClass = AvatarClass {
        mint: old_mint,
        trait_index: old_trait_index,
        payment_index: old_payment_index,
        attribute_metadata: args.new_attribute_metadata,
        variant_metadata: vec![],
        global_rendering_config_uri: args.global_rendering_config_uri.clone()
    };
    msg!("new avatar class data created: {:?}", new_avatar_class_data);

    // Serialize the new_avatar_class_data
    let new_avatar_class_data_vec = new_avatar_class_data.try_to_vec().unwrap();

    // Ensure the size fits
    assert!(8 + new_avatar_class_data_vec.len() <= ctx.accounts.avatar_class.data_len());

    // Borrow the avatar_class account mutably and overwrite its data (excluding the first 8 bytes)
    {
        let mut avatar_class_account_data = ctx.accounts.avatar_class.try_borrow_mut_data()?;
        avatar_class_account_data[8..8 + new_avatar_class_data_vec.len()]
            .copy_from_slice(&new_avatar_class_data_vec);
    }
    msg!("new avatar class data written to account");

    // get the new space of the account
    let new_space = new_avatar_class_data.current_space();
    msg!("new_avatar_class_account_space: {}", new_space);

    // calculate the diff in space from old and new
    let space_diff = new_space as i64 - old_space as i64;
    msg!("space_diff: {}", space_diff);

    // reallocate the account data based on the diff
    reallocate(
        space_diff,
        avatar_class_account_info,
        ctx.accounts.authority.clone(),
        ctx.accounts.system_program.clone(),
    )?;
    msg!("account size reallocated");

    // deserialize new account
    let new_account_data: Account<'_, AvatarClass> =
        Account::try_from(&ctx.accounts.avatar_class.to_account_info()).unwrap();

    msg!("new account deserialized");

    // simple check to make sure the new account data is correct
    require!(
        new_account_data.global_rendering_config_uri == args.global_rendering_config_uri,
        ErrorCode::MigrationError
    );

    Ok(())
}

#[account]
pub struct OldAvatarClass {
    pub mint: Pubkey,
    pub trait_index: u16,
    pub payment_index: u64,
    pub attribute_metadata: Vec<OldAttributeMetadata>,
    pub variant_metadata: Vec<VariantMetadata>,
    pub global_rendering_config_uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OldAttributeMetadata {
    pub id: u16,
    pub name: String,
    pub status: OldAttributeStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct OldAttributeStatus {
    pub mutable: bool,
}
