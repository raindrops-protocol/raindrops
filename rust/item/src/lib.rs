pub mod utils;

use {
    crate::utils::{
        assert_derivation, assert_initialized, assert_is_ata, assert_keys_equal,
        assert_metadata_valid, assert_mint_authority_matches_mint, assert_owned_by,
        assert_permissiveness_access, assert_signer, assert_valid_item_settings_for_edition_type,
        create_or_allocate_account_raw, get_mask_and_index_for_seq, spl_token_burn,
        spl_token_mint_to, spl_token_transfer, transfer_mint_authority,
        update_item_class_with_inherited_information, verify, verify_component, verify_cooldown,
        AssertPermissivenessAccessArgs, TokenBurnParams, TokenTransferParams,
        TransferMintAuthorityArgs, VerifyComponentArgs, VerifyCooldownArgs,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize,
    },
    anchor_spl::token::{Mint, Token, TokenAccount},
    arrayref::array_ref,
    metaplex_token_metadata::{
        instruction::{
            create_master_edition, create_metadata_accounts,
            mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
        },
        state::Metadata,
    },
    spl_token::instruction::{initialize_account2, mint_to},
    std::str::FromStr,
};
anchor_lang::declare_id!("p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98");
pub const PREFIX: &str = "item";
pub const MARKER: &str = "marker";
pub const PLAYER_ID: &str = "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98";

#[program]
pub mod item {

    use super::*;

    pub fn create_item_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateItemClass<'info>>,
        item_class_bump: u8,
        class_index: u64,
        parent_class_index: Option<u64>,
        _space: usize,
        desired_namespace_array_size: usize,
        update_permissiveness_to_use: Option<Permissiveness>,
        store_mint: bool,
        store_metadata_fields: bool,
        item_class_data: ItemClassData,
    ) -> ProgramResult {
        let mut item_class = &mut ctx.accounts.item_class;
        let item_class_info = item_class.to_account_info();
        let item_mint = &ctx.accounts.item_mint;
        let metadata = &ctx.accounts.metadata;
        let edition = &ctx.accounts.edition;
        let parent = &ctx.accounts.parent;
        let ed = edition.to_account_info();

        let edition_option = if edition.data_len() > 0 {
            Some(&ed)
        } else {
            let mint_authority_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 2];
            let token_program_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 1];
            assert_keys_equal(*token_program_info.key, spl_token::id())?;
            assert_mint_authority_matches_mint(&item_mint.mint_authority, &mint_authority_info)?;
            transfer_mint_authority(TransferMintAuthorityArgs {
                item_class_key: &item_class.key(),
                item_class_info: &item_class_info,
                mint_authority_info,
                token_program_info: token_program_info,
                mint: item_mint,
            })?;
            None
        };

        assert_valid_item_settings_for_edition_type(edition_option, &item_class_data)?;

        assert_metadata_valid(
            &metadata.to_account_info(),
            edition_option,
            &item_mint.key(),
        )?;

        if !parent.data_is_empty() && parent.to_account_info().owner == ctx.program_id {
            let parent_deserialized: anchor_lang::Account<'_, ItemClass> =
                Account::try_from(&parent.to_account_info())?;
            if let Some(dc) = &parent_deserialized.data.update_permissiveness {
                match update_permissiveness_to_use {
                    Some(val) => assert_permissiveness_access(AssertPermissivenessAccessArgs {
                        program_id: ctx.program_id,
                        given_account: parent,
                        remaining_accounts: ctx.remaining_accounts,
                        permissiveness_to_use: &val,
                        permissiveness_array: &dc,
                        index: parent_class_index.unwrap(),
                        account_mint: None,
                    })?,
                    None => return Err(ErrorCode::MustSpecifyPermissivenessType.into()),
                }
            } else {
                return Err(ErrorCode::PermissivenessNotFound.into());
            }
            item_class.parent = Some(parent.key());
            update_item_class_with_inherited_information(&mut item_class, &parent_deserialized);
        } else {
            assert_permissiveness_access(AssertPermissivenessAccessArgs {
                program_id: ctx.program_id,
                given_account: &item_class_info,
                remaining_accounts: ctx.remaining_accounts,
                permissiveness_to_use: &Permissiveness {
                    permissiveness_type: PermissivenessType::UpdateAuthority,
                    inherited: InheritanceState::NotInherited,
                },
                permissiveness_array: &[Permissiveness {
                    permissiveness_type: PermissivenessType::UpdateAuthority,
                    inherited: InheritanceState::NotInherited,
                }],
                index: class_index,
                account_mint: Some(&item_mint.to_account_info()),
            })?;
        }

        item_class.data = item_class_data;
        item_class.bump = item_class_bump;
        if store_metadata_fields {
            item_class.metadata = Some(metadata.key());
            item_class.edition = if edition.data_is_empty() {
                Some(edition.key())
            } else {
                None
            }
        }

        if store_mint {
            item_class.mint = Some(item_mint.key());
        }
        if desired_namespace_array_size > 0 {
            let mut namespace_arr = vec![];

            for _n in 0..desired_namespace_array_size {
                namespace_arr.push(NamespaceAndIndex {
                    namespace: anchor_lang::solana_program::system_program::id(),
                    indexed: false,
                    inherited: InheritanceState::NotInherited,
                });
            }

            item_class.namespaces = Some(namespace_arr);
        } else {
            item_class.namespaces = None
        }

        Ok(())
    }

    pub fn update_item_class<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateItemClass<'info>>,
        class_index: u64,
        update_permissiveness_to_use: Option<Permissiveness>,
        item_class_data: Option<ItemClassData>,
    ) -> ProgramResult {
        let item_class = &mut ctx.accounts.item_class;
        let item_mint = &ctx.accounts.item_mint;
        // The only case where only one account is passed in is when you are just
        // requesting a permissionless inheritance update.
        if ctx.remaining_accounts.len() == 1 {
            let parent = &ctx.remaining_accounts[0];
            if let Some(ic_parent) = item_class.parent {
                assert_keys_equal(parent.key(), ic_parent)?;
            } else {
                return Err(ErrorCode::NoParentPresent.into());
            }
            let parent_deserialized: anchor_lang::Account<'_, ItemClass> =
                Account::try_from(parent)?;

            update_item_class_with_inherited_information(item_class, &parent_deserialized);
        } else if let Some(icd) = item_class_data {
            match update_permissiveness_to_use {
                Some(val) => {
                    if let Some(dc) = &item_class.data.update_permissiveness {
                        assert_permissiveness_access(AssertPermissivenessAccessArgs {
                            program_id: ctx.program_id,
                            given_account: &item_class.to_account_info(),
                            remaining_accounts: ctx.remaining_accounts,
                            permissiveness_to_use: &val,
                            permissiveness_array: &dc,
                            index: class_index,
                            account_mint: Some(&item_mint.to_account_info()),
                        })?
                    }
                }
                None => return Err(ErrorCode::MustSpecifyPermissivenessType.into()),
            }

            item_class.data = icd;
        }
        Ok(())
    }

    pub fn create_item_escrow<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CreateItemEscrow<'info>>,
        craft_bump: u8,
        class_index: u64,
        _index: u64,
        amount_to_make: u64,
        namespace_index: Option<u64>,
        build_permissiveness_to_use: Option<Permissiveness>,
    ) -> ProgramResult {
        let item_class = &ctx.accounts.item_class;
        let item_class_mint = &ctx.accounts.item_class_mint;
        let item_escrow = &mut ctx.accounts.item_escrow;
        let new_item_mint = &ctx.accounts.new_item_mint;
        let new_item_metadata = &ctx.accounts.new_item_metadata;
        let new_item_edition = &ctx.accounts.new_item_edition;
        let new_item_token = &ctx.accounts.new_item_token;
        let new_item_token_holder = &ctx.accounts.new_item_token_holder;
        let ed = new_item_edition.to_account_info();

        if amount_to_make == 0 {
            return Err(ErrorCode::CannotMakeZero.into());
        }

        if let Some(b) = &item_class.data.builder_must_be_holder {
            if b.boolean && !new_item_token_holder.is_signer {
                return Err(ErrorCode::MustBeHolderToBuild.into());
            }
        }

        assert_is_ata(
            &new_item_token.to_account_info(),
            &new_item_token_holder.key(),
            &new_item_mint.key(),
        )?;

        let edition_option = if new_item_edition.data_len() > 0 {
            // we know already new item token holder is above 0, this is edition, so supply = 1.
            // amount to make better = 1.
            if amount_to_make != 1 || new_item_token.amount != 1 {
                return Err(ErrorCode::InsufficientBalance.into());
            }
            Some(&ed)
        } else {
            let mint_authority_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 2];
            let token_program_info = &ctx.remaining_accounts[ctx.remaining_accounts.len() - 1];
            assert_keys_equal(*token_program_info.key, spl_token::id())?;
            assert_mint_authority_matches_mint(
                &new_item_mint.mint_authority,
                &mint_authority_info,
            )?;
            // give minting for the item to the item's class since we will need it
            // to produce the fungible tokens when completed. Can also then be reused.
            if mint_authority_info.key != &item_class.key() {
                transfer_mint_authority(TransferMintAuthorityArgs {
                    item_class_key: &item_class.key(),
                    item_class_info: &item_class.to_account_info(),
                    mint_authority_info,
                    token_program_info: token_program_info,
                    mint: new_item_mint,
                })?;
            }
            None
        };

        assert_metadata_valid(new_item_metadata, edition_option, &new_item_mint.key())?;

        item_escrow.bump = craft_bump;

        if let Some(namespaces) = &item_class.namespaces {
            if let Some(ns_index) = namespace_index {
                item_escrow.namespaces = Some(vec![NamespaceAndIndex {
                    namespace: namespaces[ns_index as usize].namespace,
                    indexed: false,
                    inherited: InheritanceState::Inherited,
                }]);
            }
        }

        match build_permissiveness_to_use {
            Some(val) => {
                if let Some(dc) = &item_class.data.build_permissiveness {
                    assert_permissiveness_access(AssertPermissivenessAccessArgs {
                        program_id: ctx.program_id,
                        given_account: &item_class.to_account_info(),
                        remaining_accounts: ctx.remaining_accounts,
                        permissiveness_to_use: &val,
                        permissiveness_array: &dc,
                        index: class_index,
                        account_mint: Some(&item_class_mint.to_account_info()),
                    })?
                }
            }
            None => return Err(ErrorCode::MustSpecifyPermissivenessType.into()),
        }
        Ok(())
    }

    pub fn add_craft_item_to_escrow<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, AddCraftItemToEscrow<'info>>,
        _token_bump: u8,
        class_index: u64,
        _craft_item_index: u64,
        _index: u64,
        amount_to_make: u64,
        // These required if using roots
        component_proof: Option<Vec<[u8; 32]>>,
        component: Option<Component>,
        craft_usage_info: Option<CraftUsageInfo>,
        build_permissiveness_to_use: Option<Permissiveness>,
    ) -> ProgramResult {
        let item_class = &ctx.accounts.item_class;
        let item_class_mint = &ctx.accounts.item_class_mint;
        let item_escrow = &mut ctx.accounts.item_escrow;
        let new_item_token_holder = &ctx.accounts.new_item_token_holder;
        let craft_item_token_mint = &ctx.accounts.craft_item_token_mint;
        let craft_item_token_account_escrow = &ctx.accounts.craft_item_token_account_escrow;
        let craft_item_transfer_authority = &ctx.accounts.craft_item_transfer_authority;
        let craft_item_token_account = &ctx.accounts.craft_item_token_account;
        let craft_item = &ctx.accounts.craft_item;
        let craft_item_class = &ctx.accounts.craft_item_class;
        let token_program = &ctx.accounts.token_program;

        if let Some(b) = &item_class.data.builder_must_be_holder {
            require!(
                b.boolean && !new_item_token_holder.is_signer,
                MustBeHolderToBuild
            )
        }

        match build_permissiveness_to_use {
            Some(val) => {
                if let Some(dc) = &item_class.data.build_permissiveness {
                    assert_permissiveness_access(AssertPermissivenessAccessArgs {
                        program_id: ctx.program_id,
                        given_account: &item_class.to_account_info(),
                        remaining_accounts: ctx.remaining_accounts,
                        permissiveness_to_use: &val,
                        permissiveness_array: &dc,
                        index: class_index,
                        account_mint: Some(&item_class_mint.to_account_info()),
                    })?
                }
            }
            None => return Err(ErrorCode::MustSpecifyPermissivenessType.into()),
        }

        let chosen_component = verify_component(VerifyComponentArgs {
            item_class,
            component,
            component_proof,
            item_escrow,
            craft_item_token_mint,
        })?;

        if chosen_component.condition == ComponentCondition::Cooldown
            || chosen_component.condition == ComponentCondition::CooldownAndConsume
        {
            verify_cooldown(VerifyCooldownArgs {
                craft_usage_info,
                craft_item_class,
                craft_item,
                chosen_component: &chosen_component,
            })?;
        }

        assert_keys_equal(chosen_component.mint, craft_item_token_mint.key())?;

        if chosen_component.condition != ComponentCondition::Absence {
            let amount_to_take = craft_item_token_account
                .amount
                .checked_mul(amount_to_make)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            require!(
                amount_to_take
                    < chosen_component
                        .amount
                        .checked_mul(amount_to_make)
                        .ok_or(ErrorCode::NumericalOverflowError)?,
                InsufficientBalance
            );

            if chosen_component.condition == ComponentCondition::Consumed
                || chosen_component.condition == ComponentCondition::CooldownAndConsume
            {
                spl_token_burn(TokenBurnParams {
                    mint: craft_item_token_mint.to_account_info(),
                    source: craft_item_token_account.to_account_info(),
                    amount: amount_to_take,
                    authority: craft_item_transfer_authority.to_account_info(),
                    authority_signer_seeds: None,
                    token_program: token_program.to_account_info(),
                })?;
            } else {
                spl_token_transfer(TokenTransferParams {
                    source: craft_item_token_account.to_account_info(),
                    destination: craft_item_token_account_escrow.to_account_info(),
                    amount: amount_to_take,
                    authority: craft_item_transfer_authority.to_account_info(),
                    authority_signer_seeds: &[],
                    token_program: token_program.to_account_info(),
                })?;
            }
        } else {
            // Absence works specifically as overall supply being 0 - only way
            // to truly make it work and avoid workarounds. This means while you can technically have a fungible
            // be absence, the user must find and burn all tokens to get this condition satisfied.
            require!(craft_item_token_mint.supply == 0, BalanceNeedsToBeZero)
        }

        item_escrow.step = item_escrow
            .step
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }
}

// [COMMON REMAINING ACCOUNTS]
// Most actions require certain remainingAccounts based on their permissioned setup
// if you see common remaining accounts label, use the following as your rubric:
// If update/usage permissiveness is token holder can update:
// token_account [readable]
// token_holder [signer]
// If update/usage permissiveness is class holder can update
// class token_account [readable]
// class token_holder [signer]
// class [readable]
// class mint [readable]
// If update/usage permissiveness is update authority can update
// metadata_update_authority [signer]
// metadata [readable]
// If update permissiveness is anybody can update, nothing further is required.

#[derive(Accounts)]
#[instruction( item_class_bump: u8, class_index: u64, parent_class_index: Option<u64>, space: usize)]
pub struct CreateItemClass<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(init, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class_bump, space=space, payer=payer, constraint=space >= MIN_ITEM_CLASS_SIZE)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    metadata: UncheckedAccount<'info>,
    edition: UncheckedAccount<'info>,
    // is the parent item class (if there is one.)
    parent: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // If parent is unset, need to provide:
    // metadata_update_authority [signer]
    // metadata [readable]
    // If parent is set, and update permissiveness is token holder can update:
    // parent token_account [readable]
    // parent token_holder [signer]
    // parent mint [readable]
    // If parent is set, and update permissiveness is class holder can update
    // parent's class token_account [readable]
    // parent's class token_holder [signer]
    // parent's class [readable]
    // parent's class's mint [readable]
    // If parent is set and update permissiveness is update authority can update
    // parent's metadata_update_authority [signer]
    // parent's metadata [readable]
    // parent's mint [readable]
    // If parent is set and update permissiveness is anybody can update, nothing further is required.

    // Furthermore, if edition is not present (ie you are creating a Fungible token mint, not an NFT)
    // you need to pass up:
    // mint_authority [signer] for minting authority to be handed over
    // token program [readable]
}

#[derive(Accounts)]
#[instruction(craft_bump: u8, class_index: u64, index: u64, amount_to_make: u64, namespace_index: Option<u64>)]
pub struct CreateItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    new_item_metadata: UncheckedAccount<'info>,
    new_item_edition: UncheckedAccount<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), payer.key().as_ref(), new_item_mint.key().as_ref(), new_item_token.key().as_ref(), &index.to_le_bytes(), &amount_to_make.to_le_bytes()], bump=craft_bump, space=if namespace_index.is_none() { 18 } else { 4 + 1 + raindrops_namespace::NAMESPACE_AND_INDEX_SIZE + 18} , payer=payer)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(token_bump: u8, class_index: u64, craft_item_index: u64, index: u64, amount_to_make: u64)]
pub struct AddCraftItemToEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    // payer is in seed so that draining funds can only be done by original payer
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref(),new_item_token.key().as_ref(), &index.to_le_bytes(), &amount_to_make.to_le_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    // cant be stolen to a different craft item token account due to seed by token key
    #[account(init, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), new_item_mint.key().as_ref(), payer.key().as_ref(), craft_item_token_account.key().as_ref(), &index.to_le_bytes(), craft_item_token_account.mint.as_ref()], bump=token_bump, token::mint = craft_item_token_mint, token::authority = item_class, payer=payer)]
    craft_item_token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint=craft_item_token_account.mint == craft_item_token_mint.key())]
    craft_item_token_account: Account<'info, TokenAccount>,
    craft_item_token_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), craft_item_token_mint.key().as_ref(), &craft_item_index.to_le_bytes()], bump=craft_item.bump)]
    craft_item: Account<'info, Item>,
    #[account(constraint=craft_item.parent.unwrap() == craft_item_class.key())]
    craft_item_class: Account<'info, ItemClass>,
    craft_item_transfer_authority: Signer<'info>,
    payer: Signer<'info>,
    originator: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(token_bump: u8, class_index: u64, index: u64, amount_to_make: u64)]
pub struct RemoveCraftItemFromEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref(), new_item_token.key().as_ref(),&index.to_le_bytes(), &amount_to_make.to_le_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    // cant be stolen to a different craft item token account due to seed by token key
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), new_item_mint.key().as_ref(),receiver.key().as_ref(), craft_item_token_account.key().as_ref(), &index.to_le_bytes()], bump=token_bump)]
    craft_item_token_account_escrow: Account<'info, TokenAccount>,
    #[account(mut)]
    craft_item_token_account: Account<'info, TokenAccount>,
    // if craft item is burned and mint supply -> 0, lamports are returned from this account as well to kill the item off completely in the gamespace
    #[account(mut, seeds=[PREFIX.as_bytes(), craft_item_mint.key().as_ref()], bump=craft_item.bump)]
    craft_item: Account<'info, Item>,
    #[account(constraint=craft_item.parent.unwrap() == craft_item_class.key())]
    craft_item_class: Account<'info, ItemClass>,
    craft_item_mint: Account<'info, Mint>,
    // account funds will be drained here from craft_item_token_account_escrow
    receiver: Signer<'info>,
    originator: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(class_index: u64, index: u64, amount_to_make: u64)]
pub struct DeactivateItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref(),new_item_token.key().as_ref(), &index.to_le_bytes(), &amount_to_make.to_le_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    originator: Signer<'info>,
}
#[derive(Accounts)]
#[instruction(class_index: u64, index: u64, amount_to_make: u64)]
pub struct DrainItemEscrow<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref(),new_item_token.key().as_ref(), &index.to_le_bytes(), &amount_to_make.to_le_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    originator: Signer<'info>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(new_item_bump: u8, class_index: u64, index: u64, amount_to_make: u64, space: u64)]
pub struct CompleteItemEscrow<'info> {
    // parent determines who can create this (if present) so need to add all classes and check who is the signer...
    // perhaps do this via optional additional accounts to save space.
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_class_mint: Account<'info, Mint>,
    #[account(init, seeds=[PREFIX.as_bytes(), new_item_mint.key().as_ref(), &index.to_le_bytes()], bump=new_item_bump, payer=payer, space=space as usize, constraint= space as usize >= MIN_ITEM_SIZE)]
    new_item: Account<'info, ItemClass>,
    new_item_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), item_class_mint.key().as_ref(), originator.key().as_ref(), new_item_mint.key().as_ref(), new_item_token.key().as_ref(),&index.to_le_bytes(), &amount_to_make.to_le_bytes()], bump=item_escrow.bump)]
    item_escrow: Account<'info, ItemEscrow>,
    #[account(constraint=new_item_token.mint == new_item_mint.key() && new_item_token.owner == new_item_token_holder.key())]
    new_item_token: Account<'info, TokenAccount>,
    // may be required signer if builder must be holder in item class is true
    new_item_token_holder: UncheckedAccount<'info>,
    payer: Signer<'info>,
    originator: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(class_index: u64)]
pub struct UpdateItemClass<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
    // also if you JUST pass up the parent key as the third account, with NO item data to update,
    // this command will permissionlessly enforce inheritance rules on the item class from it's parent.
}

#[derive(Accounts)]
#[instruction(class_index: u64)]
pub struct DrainItemClass<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &class_index.to_le_bytes()], bump=item_class.bump)]
    item_class: Account<'info, ItemClass>,
    item_mint: Account<'info, Mint>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(index: u64)]
pub struct DrainItem<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    item_mint: Account<'info, Mint>,
    receiver: Signer<'info>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(item_activation_bump: u8, index: u64)]
pub struct BeginItemActivation<'info> {
    #[account( seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    #[account(init, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &index.to_le_bytes(), MARKER.as_bytes()], bump=item_activation_bump, space=9, payer=payer)]
    item_activation_marker: UncheckedAccount<'info>,
    item_mint: Account<'info, Mint>,
    // payer required here as extra key to guarantee some paying entity for anchor
    // however this signer should match one of the signers in COMMON REMAINING ACCOUNTS
    payer: Signer<'info>,
    #[account(constraint = player_program.key() == Pubkey::from_str(PLAYER_ID).unwrap())]
    player_program: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(Accounts)]
#[instruction(item_activation_bump: u8, index: u64)]
pub struct EndItemActivation<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &index.to_le_bytes()], bump=item.bump)]
    item: Account<'info, Item>,
    // funds from this will be drained to the signer in common remaining accounts for safety
    #[account(mut, seeds=[PREFIX.as_bytes(), item_mint.key().as_ref(), &index.to_le_bytes(), MARKER.as_bytes()], bump=item_activation_marker.data.borrow_mut()[0])]
    item_activation_marker: UncheckedAccount<'info>,
    item_mint: Account<'info, Mint>,
    // See the [COMMON REMAINING ACCOUNTS] ctrl f for this
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Callback(pub Pubkey, pub u64);

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemUsage {
    category: Vec<String>,
    basic_item_effects: Option<Vec<BasicItemEffect>>,
    usage_permissiveness: Vec<PermissivenessType>,
    inherited: InheritanceState,
    specifics: ItemUsageSpecifics,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageSpecifics {
    Wearable {
        body_part: Vec<String>,
        limit_per_part: Option<u64>,
        wearable_callback: Option<Callback>,
    },
    Consumable {
        uses: u64,
        // If none, is assumed to be 1 (to save space)
        max_players_per_use: Option<u64>,
        item_usage_type: ItemUsageType,
        consumption_callback: Option<Callback>,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemUsageState {
    inherited: InheritanceState,
    item_usage_type: ItemUsageTypeState,
    data: ItemUsageStateData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageStateData {
    Wearable {
        basic_item_effect_states: Option<Vec<BasicItemEffectState>>, // BASIC_ITEM_EFFECT_STATE_SIZE
    },
    Consumable {
        uses_remaining: u64,
        basic_item_effect: Option<Vec<BasicItemEffectState>>, // BASIC_ITEM_EFFECT_SIZE
    },
}

pub const ITEM_USAGE_TYPE_SIZE: usize = 9;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ItemUsageType {
    Cooldown { duration: i64 },
    Exhaustion,
    Destruction,
    Infinite,
}

pub const ITEM_USAGE_TYPE_STATE_SIZE: usize = 9;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ItemUsageTypeState {
    Cooldown { activated_at: Option<i64> },
    Exhaustion,
    Destruction,
    Infinite,
}

pub const BASIC_ITEM_EFFECT_STATE_SIZE: usize = 9 + 1;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicItemEffectState {
    activated_at: Option<i64>,
    specific_state: BasicItemEffectSpecificState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicItemEffectSpecificState {
    Increment,
    Decrement,
    IncrementPercent,
    DecrementPercent,
    IncrementPercentFromBase,
    DecrementPercentFromBase,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BasicItemEffectType {
    Increment,
    Decrement,
    IncrementPercent,
    DecrementPercent,
    IncrementPercentFromBase,
    DecrementPercentFromBase,
}

pub const BASIC_ITEM_EFFECT_SIZE: usize = 8 + 25 + 33 + 9 + 9 + 9 + 50;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasicItemEffect {
    amount: u64,
    stat: String,
    item_effect_type: BasicItemEffectType,
    active_duration: Option<i64>,
    staking_amount_scaler: Option<u64>,
    staking_duration_scaler: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ComponentCondition {
    Consumed,
    Presence,
    // Specifically, mint.supply == 0.
    Absence,
    Cooldown,
    CooldownAndConsume,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Component {
    mint: Pubkey,
    amount: u64,
    use_category: String,
    condition: ComponentCondition,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct Permissiveness {
    inherited: InheritanceState,
    permissiveness_type: PermissivenessType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PermissivenessType {
    TokenHolder,
    ClassHolder,
    UpdateAuthority,
    Anybody,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChildUpdatePropagationPermissiveness {
    overridable: bool,
    inherited: InheritanceState,
    child_update_propagation_permissiveness_type: ChildUpdatePropagationPermissivenessType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ChildUpdatePropagationPermissivenessType {
    DefaultItemCategory,
    Usages,
    Components,
    UpdatePermissiveness,
    BuildPermissiveness,
    ChildUpdatePropagationPermissiveness,
    ChildrenMustBeEditionsPermissiveness,
    BuilderMustBeHolderPermissiveness,
    Namespaces,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum InheritanceState {
    NotInherited,
    Inherited,
    Overridden,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DefaultItemCategory {
    category: String,
    inherited: InheritanceState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NamespaceAndIndex {
    namespace: Pubkey,
    indexed: bool,
    inherited: InheritanceState,
}

pub const MIN_ITEM_CLASS_SIZE: usize = 8 + // key
1 + // mint
1 + // metadata
1 + // edition
1 + // default item category
4 + // number of namespaces
1 + // children must be editions
1 + // build permissiveness bool
1 + // number of default update permissivenesses
1 + // default update permissiveness minimum (could have no way to update)
1 + // child update propagation opt
1 + // parent
1 + // number of usages
1 +  // number of components
3 + // roots
1; //bump

pub trait Inherited: Clone {
    fn set_inherited(&mut self, i: InheritanceState);
}

impl Inherited for Root {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for DefaultItemCategory {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for ItemUsage {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for Component {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for Permissiveness {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for ChildUpdatePropagationPermissiveness {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for Boolean {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

impl Inherited for NamespaceAndIndex {
    fn set_inherited(&mut self, i: InheritanceState) {
        self.inherited = i;
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Root {
    inherited: InheritanceState,
    root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Boolean {
    inherited: InheritanceState,
    boolean: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemClassData {
    children_must_be_editions: Option<Boolean>,
    builder_must_be_holder: Option<Boolean>,
    default_category: Option<DefaultItemCategory>,
    update_permissiveness: Option<Vec<Permissiveness>>,
    build_permissiveness: Option<Vec<Permissiveness>>,
    child_update_propagation_permissiveness: Option<Vec<ChildUpdatePropagationPermissiveness>>,
    // The roots are merkle roots, used to keep things cheap on chain (optional)
    usage_root: Option<Root>,
    // Used to seed the root for new items
    usage_state_root: Option<Root>,
    component_root: Option<Root>,
    // Note that both usages and components are mutually exclusive with usage_root and component_root - if those are set, these are considered
    // cached values, and root is source of truth. Up to you to keep them up to date.
    usages: Option<Vec<ItemUsage>>,
    components: Option<Vec<Component>>,
}

#[account]
pub struct ItemClass {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    parent: Option<Pubkey>,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    bump: u8,
    data: ItemClassData,
}

#[account]
pub struct ItemEscrow {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    bump: u8,
    deactivated: bool,
    step: u64,
}

// can make this super cheap
pub const MIN_ITEM_SIZE: usize = 8 + // key
1 + // mint
1 + // metadata
32 + // parent
1 + //indexed
2 + // authority level
1 + // edition
1 + // number of item usages
1 + // number of namespaces
1 + // number of update permissivenesses;
1 + // root
1; //bump

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ItemData {
    update_permissiveness: Option<Vec<Permissiveness>>,
    usage_state_root: Option<Root>,
    // if state root is set, usage states is considered a cache, not source of truth
    usage_states: Option<Vec<ItemUsageState>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CraftUsageInfo {
    // a specific usage state that is in the cooldown phase if the component condition is "Cooldown"
    pub craft_usage_state_proof: Vec<[u8; 32]>,
    pub craft_usage_state: ItemUsageState,
    pub craft_usage_proof: Vec<[u8; 32]>,
    pub craft_usage: ItemUsage,
}

#[account]
pub struct Item {
    namespaces: Option<Vec<NamespaceAndIndex>>,
    parent: Option<Pubkey>,
    mint: Option<Pubkey>,
    metadata: Option<Pubkey>,
    /// If not present, only Destruction/Infinite consumption types are allowed,
    /// And no cooldowns because we can't easily track a cooldown
    /// on a mint with more than 1 coin.
    edition: Option<Pubkey>,
    bump: u8,
    data: ItemData,
}

#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Numerical overflow error")]
    NumericalOverflowError,
    #[msg("Token mint to failed")]
    TokenMintToFailed,
    #[msg("TokenBurnFailed")]
    TokenBurnFailed,
    #[msg("Derived key is invalid")]
    DerivedKeyInvalid,
    #[msg("Update authority for metadata expected as signer")]
    MustSpecifyPermissivenessType,
    #[msg("Permissiveness not found in array")]
    PermissivenessNotFound,
    #[msg("Public key mismatch")]
    PublicKeyMismatch,
    #[msg("Insufficient Balance")]
    InsufficientBalance,
    #[msg("Metadata doesn't exist")]
    MetadataDoesntExist,
    #[msg("Edition doesn't exist")]
    EditionDoesntExist,
    #[msg("No parent present")]
    NoParentPresent,
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    #[msg("Not mint authority")]
    NotMintAuthority,
    #[msg("Cannot make zero of an item")]
    CannotMakeZero,
    #[msg("Must be token holder to build against it")]
    MustBeHolderToBuild,
    #[msg("This config is invalid for fungible mints")]
    InvalidConfigForFungibleMints,
    #[msg("Missing the merkle fields")]
    MissingMerkleInfo,
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("Item ready for completion")]
    ItemReadyForCompletion,
    #[msg("In order for crafting to work there must be either a component list or a component merkle root")]
    MustUseMerkleOrComponentList,
    #[msg("In order for crafting to work there must be either a usage state list on the craft component or a usage merkle root")]
    MustUseMerkleOrUsageState,
    #[msg("Unable to find a valid cooldown state")]
    UnableToFindValidCooldownState,
    #[msg("Balance needs to be zero")]
    BalanceNeedsToBeZero,
}
