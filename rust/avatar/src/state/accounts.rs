use std::collections::HashSet;

use anchor_lang::prelude::*;

use crate::utils::reallocate;

use super::data::{
    exists_in_trait_gate, AttributeMetadata, PaymentAction, PaymentAssetClass, PaymentDetails,
    TraitData, TraitGate, TraitStatus, UpdateTarget, UpdateTargetSelection, VariantMetadata,
    VariantOption,
};

// seeds = [b'avatar_class', mint.key().as_ref()]
#[account]
pub struct AvatarClass {
    pub mint: Pubkey,
    pub trait_index: u16,
    pub payment_index: u64,
    pub attribute_metadata: Vec<AttributeMetadata>,
    pub variant_metadata: Vec<VariantMetadata>,
    pub global_rendering_config_uri: String,
}

impl AvatarClass {
    pub const PREFIX: &'static str = "avatar_class";
    pub fn space(
        attribute_metadata: Vec<AttributeMetadata>,
        variant_metadata: Vec<VariantMetadata>,
        global_rendering_config_uri_bytes: usize,
    ) -> usize {
        8 + // anchor
        32 + // avatar_class mint
        2 + // trait index
        8 + // payment index
        AvatarClass::attribute_metadata_space(&attribute_metadata) + // attribute metadata
        AvatarClass::variant_metadata_space(&variant_metadata) + // variant metadata
        (4 + global_rendering_config_uri_bytes) // global rendering config uri
    }

    pub fn current_space(&self) -> usize {
        8 + // anchor
        32 + // avatar_class mint
        2 + // trait index
        AvatarClass::attribute_metadata_space(&self.attribute_metadata) + // attribute metadata
        AvatarClass::variant_metadata_space(&self.variant_metadata) + // variant metadata
        (4 + self.global_rendering_config_uri.len()) // global rendering config uri
    }

    pub fn variant_metadata_space(variant_metadata: &Vec<VariantMetadata>) -> usize {
        let mut total_bytes: usize = 4; // inital 4 bytes required for the Vec space
        for variant in variant_metadata {
            total_bytes += variant.space();
        }

        total_bytes
    }

    pub fn attribute_metadata_space(attribute_metadata: &Vec<AttributeMetadata>) -> usize {
        let mut total_bytes: usize = 4; // inital 4 bytes required for the Vec space
        for attribute in attribute_metadata {
            total_bytes += attribute.space();
        }

        total_bytes
    }

    pub fn is_trait_mutable(&self, trait_attribute_ids: Vec<u16>) -> bool {
        for trait_attribute_id in trait_attribute_ids {
            let mutable = self
                .attribute_metadata
                .iter()
                .any(|am| am.id == trait_attribute_id && am.status.mutable);
            if !mutable {
                return false;
            };
        }

        true
    }

    // return the matching variant
    pub fn find_variant(&self, variant_id: &str) -> VariantMetadata {
        self.variant_metadata
            .iter()
            .find(|vm| vm.id == variant_id)
            .unwrap()
            .clone()
    }

    pub fn update_variant_metadata<'info>(
        &mut self,
        new_variant_metadata: VariantMetadata,
        avatar_class: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) {
        let old_space = self.current_space();

        self.replace_variant_metadata(new_variant_metadata);

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, avatar_class, payer, system_program).unwrap();
    }

    fn replace_variant_metadata(&mut self, new_variant_metadata: VariantMetadata) {
        self.variant_metadata
            .retain(|vm| vm.id != new_variant_metadata.id);

        self.variant_metadata.push(new_variant_metadata);
    }
}

// seeds = [b'avatar', avatar_class.key().as_ref(), mint.key().as_ref()]
#[account]
pub struct Avatar {
    pub avatar_class: Pubkey,
    pub mint: Pubkey,
    pub image_uri: String,
    pub traits: Vec<TraitData>,
    pub variants: Vec<VariantOption>,
}

impl Avatar {
    pub const PREFIX: &'static str = "avatar";
    pub fn initial_space(variants: Vec<VariantOption>) -> usize {
        8 + // anchor
        32 + // avatar class
        32 + // avatar mint
        4 + // empty image uri
        4 + // empty traits vector
        variants_space(variants)
    }

    pub fn current_space(&self) -> usize {
        let mut total_bytes = 8; // anchor distriminator
        total_bytes += 32; // avatar class
        total_bytes += 32; // mint

        // current space of the traits
        for td in &self.traits {
            total_bytes += td.current_space();
        }

        // current space of the variants
        for v in &self.variants {
            total_bytes += v.space();
        }

        total_bytes
    }

    pub fn find_trait_mut(&mut self, trait_address: &Pubkey) -> &mut TraitData {
        let trait_data = self
            .traits
            .iter_mut()
            .find(|trait_data| trait_data.trait_address.eq(trait_address))
            .unwrap();
        trait_data
    }

    pub fn add_trait<'info>(
        &mut self,
        trait_address: Pubkey,
        trait_id: u16,
        attribute_ids: Vec<u16>,
        variant_metadata: &[VariantMetadata],
        avatar: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) {
        let old_space = self.current_space();

        self.add_trait_data(trait_address, trait_id, attribute_ids, variant_metadata);

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, avatar, payer, system_program).unwrap();
    }

    pub fn remove_trait<'info>(
        &mut self,
        trait_address: Pubkey,
        avatar: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) {
        let old_space = self.current_space();

        self.remove_trait_data(trait_address);

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, avatar, payer, system_program).unwrap();
    }

    // return a vector of equipped trait addresses
    pub fn get_traits(&self) -> Vec<Pubkey> {
        self.traits
            .iter()
            .map(|trait_data| trait_data.trait_address)
            .collect()
    }

    // return a vector of equipped trait ids
    pub fn get_trait_ids(&self) -> Vec<u16> {
        self.traits
            .iter()
            .map(|trait_data| trait_data.trait_id)
            .collect()
    }

    // return a vector of equipped trait ids
    pub fn get_attribute_ids(&self) -> Vec<u16> {
        self.traits
            .iter()
            .flat_map(|trait_data| &trait_data.attribute_ids)
            .cloned()
            .collect()
    }

    // returns true if the trait_address is used in any trait gates
    pub fn is_required_by_trait_gate(&self, trait_address: &Pubkey) -> bool {
        // check if trait is used by any other trait variants
        let required_by_trait_variant = self
            .traits
            .iter()
            .any(|trait_data| exists_in_trait_gate(&trait_data.variant_selection, &trait_address));
        if required_by_trait_variant {
            return true;
        };

        // check if trait is used by avatar class variants
        let required_by_class_variant = exists_in_trait_gate(&self.variants, &trait_address);
        if required_by_class_variant {
            return true;
        }

        false
    }

    pub fn update_variant_selection<'info>(
        &mut self,
        variant_selection: VariantOption,
        avatar: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) {
        let old_space = self.current_space();

        self.update_variant_selection_data(variant_selection);

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, avatar, payer, system_program).unwrap();
    }

    fn update_variant_selection_data(&mut self, variant_selection: VariantOption) {
        // remove old variant selection
        self.variants
            .retain(|vs| vs.variant_id != variant_selection.variant_id);

        // add new variant selection
        self.variants.push(variant_selection);
    }

    fn remove_trait_data(&mut self, trait_address: Pubkey) {
        self.traits
            .retain(|trait_data| trait_data.trait_address.ne(&trait_address))
    }

    fn add_trait_data(
        &mut self,
        trait_address: Pubkey,
        trait_id: u16,
        attribute_ids: Vec<u16>,
        variant_metadata: &[VariantMetadata],
    ) {
        self.traits.push(TraitData::new(
            attribute_ids,
            trait_id,
            trait_address,
            variant_metadata,
        ))
    }
}

fn variants_space(variants: Vec<VariantOption>) -> usize {
    let mut total_bytes = 4;
    for v in variants {
        total_bytes += v.space();
    }

    total_bytes
}

// seeds = [b'trait', avatar_class.key().as_ref(), trait_mint.key().as_ref()]
#[account]
pub struct Trait {
    pub id: u16,
    pub avatar_class: Pubkey,
    pub trait_mint: Pubkey,
    pub attribute_ids: Vec<u16>,
    pub component_uri: String,
    pub status: TraitStatus,
    pub variant_metadata: Vec<VariantMetadata>,
    pub equip_payment_details: Option<PaymentDetails>,
    pub remove_payment_details: Option<PaymentDetails>,
    pub trait_gate: Option<TraitGate>,
}

impl Trait {
    pub const PREFIX: &'static str = "trait";

    pub fn current_space(&self) -> usize {
        8 + // anchor
        2 + // id
        32 + // avatar class
        32 + // trait mint
        (4 + (self.attribute_ids.len() * 2)) + // attribute ids
        (4 + self.component_uri.len()) + // component uri
        TraitStatus::SPACE + // trait status
        Self::variant_metadata_space(&self.variant_metadata) + // variant metadata
        (1 + PaymentDetails::SPACE) + // optional equip payment details
        (1 + PaymentDetails::SPACE) + // optional remove payment method
        (1 + TraitGate::INIT_SPACE) // optional trait gate space
    }

    pub fn space(
        component_uri_bytes: usize,
        attribute_count: usize,
        variant_metadata: Vec<VariantMetadata>,
    ) -> usize {
        8 + // anchor
        2 + // id
        32 + // avatar_class
        32 + // trait mint
        (4 + (2 * attribute_count)) + // attribute ids
        (4 + component_uri_bytes) + // component_uri
        TraitStatus::SPACE + // trait status
        Self::variant_metadata_space(&variant_metadata) + // variant metadata
        (1 + PaymentDetails::SPACE) + // optional equip payment details
        (1 + PaymentDetails::SPACE) + // optional remove payment method
        (1 + TraitGate::INIT_SPACE) // optional trait gate space
    }

    // return the matching variant
    pub fn find_variant(&self, variant_id: &str) -> VariantMetadata {
        self.variant_metadata
            .iter()
            .find(|vm| vm.id == variant_id)
            .unwrap()
            .clone()
    }

    pub fn update_variant_metadata<'info>(
        &mut self,
        new_variant_metadata: VariantMetadata,
        trait_account: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) {
        let old_space = self.current_space();

        self.replace_variant_metadata(new_variant_metadata);

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, trait_account, payer, system_program).unwrap();
    }

    pub fn is_enabled(&self) -> bool {
        self.status.enabled
    }

    fn replace_variant_metadata(&mut self, new_variant_metadata: VariantMetadata) {
        self.variant_metadata
            .retain(|vm| vm.id != new_variant_metadata.id);

        self.variant_metadata.push(new_variant_metadata);
    }

    fn variant_metadata_space(variant_metadata: &Vec<VariantMetadata>) -> usize {
        let mut total_bytes = 4;
        for vm in variant_metadata {
            total_bytes += vm.space();
        }

        total_bytes
    }
}

// seeds = ['payment_method', avatar_class, payment_index]
#[account]
pub struct PaymentMethod {
    pub uri: String,
    pub index: u64,
    pub avatar_class: Pubkey,
    pub asset_class: PaymentAssetClass,
    pub action: PaymentAction,
}

impl PaymentMethod {
    pub const PREFIX: &'static str = "payment_method";
    pub const SPACE: usize = 8 + // anchor
    4 + // uri, empty for now
    8 + // index
    32 + // avatar_class
    PaymentAssetClass::SPACE + // asset class
    PaymentAction::SPACE; // action
}

// seeds = ['update_state', avatar, target_hash]
#[account]
pub struct UpdateState {
    pub initialized: bool,
    pub avatar: Pubkey,
    pub target: UpdateTarget,
}

impl UpdateState {
    pub const PREFIX: &'static str = "update_state";
    pub fn space(update_target: &UpdateTargetSelection) -> usize {
        8 + // anchor
        1 + // initialized
        32 + // avatar
        update_target.space() // update target
    }
}

// seeds = ['verified_payment_mint', payment_method, payment_mint]
#[account]
pub struct VerifiedPaymentMint {
    pub payment_method: Pubkey,
    pub payment_mint: Pubkey,
}

impl VerifiedPaymentMint {
    pub const PREFIX: &'static str = "verified_payment_mint";
    pub const SPACE: usize = 8 + 32 + 32;
}

// seeds = ['trait_conflicts', avatar_class, trait_account]
#[account]
pub struct TraitConflicts {
    pub avatar_class: Pubkey,

    pub trait_account: Pubkey,

    pub attribute_conflicts: Vec<u16>,

    pub trait_conflicts: Vec<u16>,
}

impl TraitConflicts {
    pub const PREFIX: &'static str = "trait_conflicts";
    pub const INIT_SPACE: usize = 8 + // anchor bytes
    32 + // avatar_class
    32 + // trait_account
    4 + // empty attribute conflicts vector
    4; // empty trait conflicts vector

    // returns true if there's a conflict with this trait and what is equipped on an avatar
    pub fn has_conflicts(
        &self,
        equipped_trait_ids: &[u16],
        equipped_attribute_ids: &[u16],
    ) -> bool {
        if self.has_attribute_conflicts(equipped_attribute_ids) {
            return true;
        }

        if self.has_trait_conflicts(equipped_trait_ids) {
            return true;
        }

        false
    }

    pub fn add_conflicts<'info>(
        &mut self,
        new_attribute_conflict_ids: &[u16],
        new_trait_conflict_ids: &[u16],
        conflicts_account: &AccountInfo<'info>,
        payer: Signer<'info>,
        system_program: Program<'info, System>,
    ) {
        let old_space = self.current_space();

        // add attribute ids
        for id in new_attribute_conflict_ids {
            self.add_attribute_conflict(*id);
        }

        // add trait ids
        for id in new_trait_conflict_ids {
            self.add_trait_conflict(*id);
        }

        let new_space = self.current_space();

        let diff: i64 = new_space as i64 - old_space as i64;

        reallocate(diff, conflicts_account, payer, system_program).unwrap();
    }

    fn add_trait_conflict(&mut self, new_conflict_id: u16) {
        // dont add duplicate ids
        if !self.trait_conflicts.contains(&new_conflict_id) {
            self.trait_conflicts.push(new_conflict_id);
        }
    }

    fn add_attribute_conflict(&mut self, new_conflict_id: u16) {
        // dont add duplicate ids
        if !self.attribute_conflicts.contains(&new_conflict_id) {
            self.attribute_conflicts.push(new_conflict_id);
        }
    }

    fn has_attribute_conflicts(&self, equipped_attribute_ids: &[u16]) -> bool {
        // convert to HashSet as this is more efficient than using a nested loop
        let attribute_conflicts_set: HashSet<u16> =
            self.attribute_conflicts.iter().cloned().collect();

        // return true for the first conflict
        for id in equipped_attribute_ids {
            if attribute_conflicts_set.contains(id) {
                return true;
            }
        }

        false
    }

    fn has_trait_conflicts(&self, equipped_trait_ids: &[u16]) -> bool {
        // convert to HashSet as this is more efficient than using a nested loop
        let trait_conflicts_set: HashSet<u16> = self.trait_conflicts.iter().cloned().collect();

        // return true for the first conflict
        for id in equipped_trait_ids {
            if trait_conflicts_set.contains(id) {
                return true;
            }
        }

        false
    }

    fn current_space(&self) -> usize {
        8 + // anchor bytes
        32 + // avatar_class
        32 + // trait_account
        4 + (self.trait_conflicts.len() * 2) + // trait conflicts
        4 + (self.attribute_conflicts.len() * 2) // attribute conflicts
    }
}

// anchor wrapper for Noop Program required for spl-account-compression
#[derive(Clone)]
pub struct NoopProgram;

impl anchor_lang::Id for NoopProgram {
    fn id() -> Pubkey {
        spl_noop::ID
    }
}

#[cfg(test)]
mod tests {
    use std::{assert_eq, vec};

    use crate::state::data::{
        AttributeStatus, AttributeType, Operator::And, TraitGate, VariantStatus,
    };

    use super::*;

    #[test]
    fn test_is_trait_mutable() {
        let mut attribute_metadata: Vec<AttributeMetadata> = vec![];
        attribute_metadata.push(AttributeMetadata {
            id: 1,
            name: "head".to_string(),
            status: AttributeStatus {
                mutable: true,
                attribute_type: AttributeType::Optional,
            },
        });
        attribute_metadata.push(AttributeMetadata {
            id: 2,
            name: "body".to_string(),
            status: AttributeStatus {
                mutable: true,
                attribute_type: AttributeType::Optional,
            },
        });
        attribute_metadata.push(AttributeMetadata {
            id: 3,
            name: "hand".to_string(),
            status: AttributeStatus {
                mutable: false,
                attribute_type: AttributeType::Optional,
            },
        });
        attribute_metadata.push(AttributeMetadata {
            id: 4,
            name: "background".to_string(),
            status: AttributeStatus {
                mutable: false,
                attribute_type: AttributeType::Optional,
            },
        });
        let avatar_class: AvatarClass = AvatarClass {
            mint: Pubkey::new_unique(),
            trait_index: 0,
            payment_index: 0,
            attribute_metadata,
            variant_metadata: vec![],
            global_rendering_config_uri: "https://foo.com/bar.json".to_string(),
        };

        let head_mutable = avatar_class.is_trait_mutable(vec![1]);
        assert!(head_mutable);

        let body_mutable = avatar_class.is_trait_mutable(vec![2]);
        assert!(body_mutable);

        let hand_immutable = avatar_class.is_trait_mutable(vec![3]);
        assert!(!hand_immutable);

        let background_immutable = avatar_class.is_trait_mutable(vec![4]);
        assert!(!background_immutable);
    }

    #[test]
    fn test_find_variant() {
        let avatar_class: AvatarClass = AvatarClass {
            trait_index: 0,
            payment_index: 0,
            mint: Pubkey::new_unique(),
            attribute_metadata: vec![],
            variant_metadata: vec![VariantMetadata {
                name: "foo".to_string(),
                id: "lqowgh78".to_string(),
                status: VariantStatus { enabled: true },
                options: vec![],
            }],
            global_rendering_config_uri: "https://foo.com/bar.json".to_string(),
        };
        let variant_metadata = avatar_class.find_variant("lqowgh78");
        assert_eq!(variant_metadata.id, "lqowgh78".to_string());
    }

    #[test]
    fn test_remove_trait() {
        let mut traits: Vec<TraitData> = vec![];

        let trait1 = Pubkey::new_unique();
        traits.push(TraitData {
            attribute_ids: vec![],
            trait_id: 0,
            trait_address: trait1,
            variant_selection: vec![],
        });

        let trait2 = Pubkey::new_unique();
        traits.push(TraitData {
            attribute_ids: vec![],
            trait_id: 0,
            trait_address: trait2,
            variant_selection: vec![],
        });

        let mut avatar = Avatar {
            avatar_class: Pubkey::new_unique(),
            mint: Pubkey::new_unique(),
            image_uri: "".to_string(),
            traits,
            variants: vec![],
        };
        avatar.remove_trait_data(trait1);
        assert_eq!(avatar.traits.len(), 1);
        assert!(avatar.traits.first().unwrap().trait_address.eq(&trait2));

        avatar.remove_trait_data(trait2);
        assert_eq!(avatar.traits.len(), 0);
    }

    #[test]
    fn test_has_attribute_conflicts() {
        let trait_conflicts = TraitConflicts {
            avatar_class: Pubkey::new_unique(),
            trait_account: Pubkey::new_unique(),
            attribute_conflicts: vec![0],
            trait_conflicts: vec![],
        };
        let has_conflicts = trait_conflicts.has_conflicts(&[], &[0]);
        assert!(has_conflicts);
    }

    #[test]
    fn test_has_no_attribute_conflicts() {
        let trait_conflicts = TraitConflicts {
            avatar_class: Pubkey::new_unique(),
            trait_account: Pubkey::new_unique(),
            attribute_conflicts: vec![1],
            trait_conflicts: vec![],
        };
        let has_conflicts = trait_conflicts.has_conflicts(&[], &[0]);
        assert!(!has_conflicts);
    }

    #[test]
    fn test_has_trait_conflicts() {
        let trait_conflicts = TraitConflicts {
            avatar_class: Pubkey::new_unique(),
            trait_account: Pubkey::new_unique(),
            attribute_conflicts: vec![],
            trait_conflicts: vec![0],
        };
        let has_conflicts = trait_conflicts.has_conflicts(&[0], &[]);
        assert!(has_conflicts);
    }

    #[test]
    fn test_has_no_trait_conflicts() {
        let trait_conflicts = TraitConflicts {
            avatar_class: Pubkey::new_unique(),
            trait_account: Pubkey::new_unique(),
            attribute_conflicts: vec![],
            trait_conflicts: vec![1],
        };
        let has_conflicts = trait_conflicts.has_conflicts(&[0], &[]);
        assert!(!has_conflicts);
    }

    #[test]
    fn test_has_trait_and_attribute_conflicts() {
        let trait_conflicts = TraitConflicts {
            avatar_class: Pubkey::new_unique(),
            trait_account: Pubkey::new_unique(),
            attribute_conflicts: vec![1],
            trait_conflicts: vec![1],
        };
        let has_conflicts = trait_conflicts.has_conflicts(&[1], &[1]);
        assert!(has_conflicts);
    }

    #[test]
    fn test_no_conflicts() {
        let trait_conflicts = TraitConflicts {
            avatar_class: Pubkey::new_unique(),
            trait_account: Pubkey::new_unique(),
            attribute_conflicts: vec![],
            trait_conflicts: vec![],
        };
        let has_conflicts = trait_conflicts.has_conflicts(&[], &[]);
        assert!(!has_conflicts);
    }

    #[test]
    fn test_is_required_by_trait_gate() {
        let mut traits: Vec<TraitData> = vec![];

        let trait1 = Pubkey::new_unique();

        let trait2 = Pubkey::new_unique();
        traits.push(TraitData {
            attribute_ids: vec![],
            trait_id: 0,
            trait_address: trait1,
            variant_selection: vec![VariantOption {
                variant_id: "lqowgh78".to_string(),
                option_id: "lqwoejt7".to_string(),
                payment_details: None,
                trait_gate: Some(TraitGate {
                    operator: And,
                    traits: vec![trait2],
                }),
            }],
        });

        let trait3 = Pubkey::new_unique();
        traits.push(TraitData {
            attribute_ids: vec![],
            trait_id: 0,
            trait_address: trait3,
            variant_selection: vec![],
        });

        let trait4 = Pubkey::new_unique();

        let mut variants: Vec<VariantOption> = vec![];
        variants.push(VariantOption {
            variant_id: "qwloty78".to_string(),
            option_id: "hglqow34".to_string(),
            payment_details: None,
            trait_gate: Some(TraitGate {
                operator: And,
                traits: vec![trait4],
            }),
        });
        variants.push(VariantOption {
            variant_id: "qlotgh1q".to_string(),
            option_id: "kklqwou8".to_string(),
            payment_details: None,
            trait_gate: None,
        });

        let avatar = Avatar {
            avatar_class: Pubkey::new_unique(),
            mint: Pubkey::new_unique(),
            image_uri: "".to_string(),
            traits,
            variants,
        };
        let trait_1_not_required = avatar.is_required_by_trait_gate(&trait1);
        assert!(!trait_1_not_required);

        let trait_2_required = avatar.is_required_by_trait_gate(&trait2);
        assert!(trait_2_required);

        let trait_3_not_required = avatar.is_required_by_trait_gate(&trait3);
        assert!(!trait_3_not_required);

        let trait_4_required = avatar.is_required_by_trait_gate(&trait4);
        assert!(trait_4_required);
    }
}
