use {
    crate::{borsh::BorshDeserialize, Artifact, ArtifactClass},
    anchor_lang::{
        prelude::{Pubkey, Result, UncheckedAccount},
        require,
        solana_program::hash,
    },
    arrayref::array_ref,
    raindrops_item::utils::assert_derivation_with_bump,
};

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

    let mut arr = vec![];
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

    for entry in 8..data.len() {
        arr.push(data[entry]);
    }
    let class_deserialized: ArtifactClass = ArtifactClass::try_from_slice(&arr)?;

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
) -> Result<Artifact> {
    require!(
        artifact.owner == &raindrops_player::id() || artifact.owner == &raindrops_item::id(),
        InvalidProgramOwner
    );

    let prefix = if artifact.owner == &raindrops_player::id() {
        raindrops_player::PREFIX
    } else {
        raindrops_item::PREFIX
    };

    let class_name = if artifact.owner == &raindrops_player::id() {
        "Player"
    } else {
        "Item"
    };

    require!(!artifact.data_is_empty(), NotInitialized);

    let mut arr = vec![];
    let data = artifact.data.borrow();

    let discriminator = u64::from_le_bytes(*array_ref![data, 0, 8]);
    let mut expected_discriminator = [0; 8];
    expected_discriminator
        .copy_from_slice(&hash::hash(format!("account:{}", class_name).as_bytes()).to_bytes()[..8]);
    let expected_discriminator_as_u64 = u64::from_le_bytes(expected_discriminator);

    require!(
        expected_discriminator_as_u64 == discriminator,
        DiscriminatorMismatch
    );

    for entry in 8..data.len() {
        arr.push(data[entry]);
    }
    let instance_deserialized: Artifact = Artifact::try_from_slice(&arr)?;

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
