use crate::{Artifact, ArtifactClass, ArtifactClassData, ErrorCode};
use anchor_lang::{prelude::*, require, solana_program::hash};
use arrayref::array_ref;
use raindrops_item::{utils::assert_derivation_with_bump, Item, ItemClass};

pub fn assert_is_proper_class<'info>(
    artifact_class: &UncheckedAccount<'info>,
    mint: &Pubkey,
    index: u64,
) -> Result<ArtifactClass> {
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

    let class_name = if artifact_class.owner == &raindrops_player::id() {
        "PlayerClass"
    } else {
        "ItemClass"
    };

    require!(!artifact_class.data_is_empty(), NotInitialized);

    // let mut arr = vec![];
    let data = artifact_class.data.borrow();

    let discriminator = u64::from_le_bytes(*array_ref![data, 0, 8]);
    let mut expected_discriminator = [0; 8];
    expected_discriminator
        .copy_from_slice(&hash::hash(format!("account:{}", class_name).as_bytes()).to_bytes()[..8]);
    let expected_discriminator_as_u64 = u64::from_le_bytes(expected_discriminator);

    require!(
        expected_discriminator_as_u64 == discriminator,
        DiscriminatorMismatch
    );

    // FIXME: Remove it after the player contract is done.
    require!(class_name != "PlayerClass", StakingForPlayerComingSoon);

    let item_class_deserialized: Account<ItemClass> = Account::try_from(artifact_class)?;
    let item_class_data = item_class_deserialized.item_class_data(&artifact_class.data)?;

    let class_deserialized: ArtifactClass = ArtifactClass {
        namespaces: item_class_deserialized.namespaces.clone(),
        parent: item_class_deserialized.parent,
        mint: item_class_deserialized.mint,
        metadata: item_class_deserialized.metadata,
        edition: item_class_deserialized.edition,
        bump: item_class_deserialized.bump,
        existing_children: item_class_deserialized.existing_children,
        data: ArtifactClassData {
            children_must_be_editions: item_class_data.settings.children_must_be_editions,
            builder_must_be_holder: item_class_data.settings.builder_must_be_holder,
            update_permissiveness: item_class_data.settings.update_permissiveness,
            build_permissiveness: item_class_data.settings.build_permissiveness,
            staking_warm_up_duration: item_class_data.settings.staking_warm_up_duration,
            staking_cooldown_duration: item_class_data.settings.staking_cooldown_duration,
            staking_permissiveness: item_class_data.settings.staking_permissiveness,
            unstaking_permissiveness: item_class_data.settings.unstaking_permissiveness,
            child_update_propagation_permissiveness: item_class_data
                .settings
                .child_update_propagation_permissiveness,
        },
    };

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
) -> Result<()> {
    require!(
        artifact.owner == &raindrops_player::id() || artifact.owner == &raindrops_item::id(),
        InvalidProgramOwner
    );

    let prefix = if artifact.owner == &raindrops_player::id() {
        raindrops_player::PREFIX
    } else {
        raindrops_item::PREFIX
    };

    let instance_name = if artifact.owner == &raindrops_player::id() {
        "Player"
    } else {
        "Item"
    };

    require!(!artifact.data_is_empty(), NotInitialized);

    // let mut arr = vec![];
    let data = artifact.data.borrow();

    let discriminator = u64::from_le_bytes(*array_ref![data, 0, 8]);
    let mut expected_discriminator = [0; 8];
    expected_discriminator.copy_from_slice(
        &hash::hash(format!("account:{}", instance_name).as_bytes()).to_bytes()[..8],
    );
    let expected_discriminator_as_u64 = u64::from_le_bytes(expected_discriminator);

    require!(
        expected_discriminator_as_u64 == discriminator,
        DiscriminatorMismatch
    );

    // FIXME: Remove it after the player contract is done.
    require!(instance_name != "Player", StakingForPlayerComingSoon);

    let item_deserialized: Account<Item> = Account::try_from(artifact)?;

    let instance_deserialized: Artifact = Artifact {
        namespaces: item_deserialized.namespaces.clone(),
        parent: item_deserialized.parent,
        mint: item_deserialized.mint,
        metadata: item_deserialized.metadata,
        edition: item_deserialized.edition,
        bump: item_deserialized.bump,
        tokens_staked: item_deserialized.tokens_staked,
    };

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

    Ok(())
}

pub fn assert_part_of_namespace<'a, 'b>(
    artifact: &'b AccountInfo<'a>,
    namespace: &'b AccountInfo<'a>,
) -> Result<Account<'a, raindrops_namespace::Namespace>> {
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

pub fn assert_derivation(program_id: &Pubkey, account: &AccountInfo, path: &[&[u8]]) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(path, program_id);
    if key != *account.key {
        return Err(error!(ErrorCode::DerivedKeyInvalid));
    }
    Ok(bump)
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> Result<()> {
    if account.owner != owner {
        Err(error!(ErrorCode::IncorrectOwner))
    } else {
        Ok(())
    }
}
