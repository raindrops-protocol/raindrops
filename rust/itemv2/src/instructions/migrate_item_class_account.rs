use anchor_lang::prelude::*;

use crate::state::{
    accounts::{reallocate, ItemClass},
    errors::ErrorCode,
    is_signer, ItemClassMode,
};

#[derive(Accounts)]
pub struct MigrateItemClassAccount<'info> {
    /// CHECK: old item_class account data
    #[account(mut)]
    pub item_class: UncheckedAccount<'info>,

    #[account(mut, constraint = is_signer(&payer.key()))]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigrateItemClassAccount>) -> Result<()> {
    msg!(
        "migrating item_class account: {}",
        &ctx.accounts.item_class.key()
    );
    let item_class_account_info = &ctx.accounts.item_class.to_account_info();

    // get current space of account
    let old_space = item_class_account_info.data_len();
    msg!("old_item_class_account_space: {}", old_space);

    // Extract old data within a local scope to ensure the mutable borrow is released afterwards
    let (name, authority_mint, output_mode, recipe_index, items) = {
        let b = &item_class_account_info.try_borrow_mut_data().unwrap();
        let item_class_account: OldItemClass =
            AnchorDeserialize::deserialize(&mut &b[8..]).unwrap();

        (
            item_class_account.name,
            item_class_account.authority_mint,
            item_class_account.output_mode,
            item_class_account.recipe_index,
            item_class_account.items.unwrap(),
        )
    };

    let mode = match output_mode {
        OldItemClassOutputMode::Item => ItemClassMode::MerkleTree { tree: items },
        OldItemClassOutputMode::Pack { index } => ItemClassMode::Pack { index: index },
        OldItemClassOutputMode::PresetOnly => ItemClassMode::PresetOnly,
    };

    // Create new item_class data using fetched old data
    let new_item_class_data: ItemClass = ItemClass {
        name: name.clone(),
        authority_mint: authority_mint,
        recipe_index: recipe_index,
        mode: mode,
    };

    // Serialize the new_item_class_data
    let new_item_class_data_vec = new_item_class_data.try_to_vec().unwrap();

    // Ensure the size fits
    assert!(8 + new_item_class_data_vec.len() <= ctx.accounts.item_class.data_len());

    // Borrow the item_class account mutably and overwrite its data (excluding the first 8 bytes)
    {
        let mut item_class_account_data = ctx.accounts.item_class.try_borrow_mut_data()?;
        item_class_account_data[8..8 + new_item_class_data_vec.len()]
            .copy_from_slice(&new_item_class_data_vec);
    }

    // calculate the diff in space from old and new
    let space_diff = ItemClass::space(name) as i64 - old_space as i64;
    msg!("space_diff: {}", space_diff);

    // reallocate the account data based on the diff
    reallocate(
        space_diff,
        item_class_account_info,
        ctx.accounts.payer.clone(),
        ctx.accounts.system_program.clone(),
    )?;

    // deserialize new account
    let new_account_data: Account<'_, ItemClass> =
        Account::try_from(&ctx.accounts.item_class.to_account_info()).unwrap();

    // simple check to make sure the new account data is correct
    require!(
        new_account_data.authority_mint.eq(&authority_mint),
        ErrorCode::MigrationError
    );

    Ok(())
}

#[account]
pub struct OldItemClass {
    pub name: String,

    // token owners have authority over the item class
    pub authority_mint: Pubkey,

    // merkle tree containing all item addresses belonging to this item class
    pub items: Option<Pubkey>,

    pub recipe_index: Option<u64>,

    // defines the behavior when the item class is the target of a build output
    pub output_mode: OldItemClassOutputMode,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum OldItemClassOutputMode {
    Item,
    Pack { index: u64 },
    PresetOnly,
}
