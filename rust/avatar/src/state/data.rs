use anchor_lang::{
    prelude::*,
    solana_program::hash::{hash, Hash},
};
use anchor_spl::associated_token::get_associated_token_address;

use crate::utils::reallocate;

use super::{accounts::UpdateState, errors::ErrorCode};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttributeMetadata {
    pub id: u16,
    pub name: String,
    pub status: AttributeStatus,
}

impl AttributeMetadata {
    pub fn space(&self) -> usize {
        2 + // id
        (4 + self.name.len()) + // name
        AttributeStatus::SPACE // mutable
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VariantMetadata {
    pub name: String,
    pub id: String,
    pub status: VariantStatus,
    pub options: Vec<VariantOption>,
}

impl VariantMetadata {
    // return true if the option_id exists for the variant
    pub fn find_option(&self, option_id: &str) -> VariantOption {
        self.options
            .iter()
            .find(|option| option.option_id == option_id)
            .unwrap()
            .clone()
    }

    pub fn default_option(&self) -> VariantOption {
        self.options.first().unwrap().clone()
    }

    pub fn space(&self) -> usize {
        (4 + self.name.len()) + // name
        (4 + self.id.len()) + // variant id
        VariantMetadata::variant_option_space(&self.options) +
        VariantStatus::SPACE
    }

    pub fn is_enabled(&self) -> bool {
        self.status.enabled
    }

    fn variant_option_space(options: &Vec<VariantOption>) -> usize {
        let mut total_bytes = 4; // vector bytes
        for opt in options {
            total_bytes += opt.space()
        }

        total_bytes
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone, Debug)]
pub struct VariantOption {
    pub variant_id: String,
    pub option_id: String,
    pub payment_details: Option<PaymentDetails>,
    pub trait_gate: Option<TraitGate>,
}

impl VariantOption {
    // return true if avatar meets requirements to select this trait option
    pub fn is_eligible(&self, equipped_traits: &[Pubkey]) -> bool {
        match &self.trait_gate {
            Some(trait_gate) => trait_gate.validate(equipped_traits),
            None => true,
        }
    }

    pub fn space(&self) -> usize {
        (4 + self.variant_id.len()) + // variant_id
        (4 + self.option_id.len()) + // variant_value
        (1 + PaymentDetails::SPACE) + // optional payment_details
        (1 + VariantOption::trait_gate_space(&self.trait_gate)) // optional trait gate
    }

    fn trait_gate_space(trait_gate: &Option<TraitGate>) -> usize {
        match trait_gate {
            Some(trait_gate) => trait_gate.space(),
            None => TraitGate::INIT_SPACE,
        }
    }
}

pub fn exists_in_trait_gate(
    variant_selection: &Vec<VariantOption>,
    trait_address: &Pubkey,
) -> bool {
    for variant in variant_selection {
        let trait_gate = match &variant.trait_gate {
            Some(trait_gate) => trait_gate,
            None => continue,
        };

        let in_use = trait_gate.traits.contains(trait_address);
        if in_use {
            return true;
        }
    }

    false
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone, Debug)]
pub struct PaymentDetails {
    pub payment_method: Pubkey,
    pub amount: u64,
}

impl PaymentDetails {
    pub const SPACE: usize = 32 + // payment_method
    8; // amount

    pub fn is_paid(&self, update_variant_state: &UpdateState) -> Result<()> {
        // return an error if payment_state is not set
        // this is because if payment details is present then payment is required
        let payment_state = update_variant_state
            .current_payment_details
            .as_ref()
            .unwrap();

        // check the payment_method is defined in update_variant_state
        require!(
            payment_state.payment_method.eq(&self.payment_method.key()),
            ErrorCode::InvalidPaymentMethod
        );

        // check the payment is sufficient
        require!(
            payment_state.amount >= self.amount,
            ErrorCode::PaymentNotPaid
        );

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone, Debug)]
pub struct TraitGate {
    pub operator: Operator,
    pub traits: Vec<Pubkey>,
}

impl TraitGate {
    pub const INIT_SPACE: usize = Operator::SPACE + 4;
    pub fn space(&self) -> usize {
        Operator::SPACE + // operator
        4 + (32 * self.traits.len()) // tokens
    }

    // validate traits meet requirements of trait gate
    pub fn validate(&self, traits: &[Pubkey]) -> bool {
        match self.operator {
            Operator::And => {
                for t in &self.traits {
                    if !traits.contains(t) {
                        return false;
                    }
                }
                true
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Clone, Debug)]
pub enum Operator {
    And,
    //Or,
    //Not,
}

impl Operator {
    pub const SPACE: usize = 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TraitData {
    pub attribute_ids: Vec<u16>,
    pub trait_id: u16,
    pub trait_address: Pubkey,
    pub variant_selection: Vec<VariantOption>,
}

impl TraitData {
    pub fn new(
        attribute_ids: Vec<u16>,
        trait_id: u16,
        trait_address: Pubkey,
        variant_metadata: &[VariantMetadata],
    ) -> Self {
        let variant_selection: Vec<VariantOption> = variant_metadata
            .iter()
            .map(|vm| vm.default_option())
            .collect();
        TraitData {
            attribute_ids,
            trait_id,
            trait_address,
            variant_selection,
        }
    }

    pub fn current_space(&self) -> usize {
        let mut total_bytes = (4 + (self.attribute_ids.len() * 2)) + // attribute ids
        2 + // trait_id
        32 + // trait address
        4; // variant selection vector bytes

        for variant in &self.variant_selection {
            total_bytes += variant.space();
        }

        total_bytes
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
        self.variant_selection
            .retain(|vs| vs.variant_id != variant_selection.variant_id);

        // add new variant selection
        self.variant_selection.push(variant_selection);
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TraitStatus {
    pub enabled: bool,
}

impl TraitStatus {
    pub const SPACE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum PaymentAssetClass {
    Fungible { mint: Pubkey },
    NonFungible { mints: Pubkey },
}

impl PaymentAssetClass {
    pub const SPACE: usize = 1 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum PaymentAction {
    Transfer { treasury: Pubkey },
    Burn,
}

impl PaymentAction {
    pub const SPACE: usize = 1 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum UpdateTarget {
    ClassVariant {
        variant_id: String,
        option_id: String,
    },
    TraitVariant {
        variant_id: String,
        option_id: String,
        trait_account: Pubkey,
    },
    EquipTrait {
        trait_account: Pubkey,
    },
    RemoveTrait {
        trait_account: Pubkey,
        trait_destination_authority: Pubkey,
    },
}

impl UpdateTarget {
    pub fn space(&self) -> usize {
        let enum_bytes = 1;
        match &self {
            Self::ClassVariant {
                variant_id,
                option_id,
            } => enum_bytes + (4 + variant_id.len()) + (4 + option_id.len()),
            Self::TraitVariant {
                variant_id,
                option_id,
                trait_account: _,
            } => enum_bytes + (4 + variant_id.len()) + (4 + option_id.len()) + 32, // trait account
            Self::EquipTrait { trait_account: _ } => enum_bytes + 32,
            Self::RemoveTrait {
                trait_account: _,
                trait_destination_authority: _,
            } => enum_bytes + 32 + 32,
        }
    }

    // hash the update target so we can use it as an account seed
    pub fn hash(&self) -> Hash {
        match &self {
            Self::ClassVariant {
                variant_id,
                option_id,
            } => hash(format!("{variant_id}{option_id}").as_bytes()),
            Self::TraitVariant {
                variant_id,
                option_id,
                trait_account,
            } => hash(format!("{variant_id}{option_id}{trait_account}").as_bytes()),
            Self::EquipTrait { trait_account } => hash(format!("{trait_account}").as_bytes()),
            Self::RemoveTrait {
                trait_account,
                trait_destination_authority: _,
            } => hash(format!("{trait_account}").as_bytes()),
        }
    }

    pub fn get_remove_trait_destination(&self, trait_mint: &Pubkey) -> Result<Pubkey> {
        match &self {
            Self::RemoveTrait {
                trait_account: _,
                trait_destination_authority,
            } => Ok(get_associated_token_address(
                trait_destination_authority,
                trait_mint,
            )),
            _ => Err(ErrorCode::InvalidUpdateTarget.into()),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VariantStatus {
    pub enabled: bool,
}

impl VariantStatus {
    pub const SPACE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AttributeStatus {
    pub mutable: bool,
}

impl AttributeStatus {
    pub const SPACE: usize = 1;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_option() {
        let mut opts: Vec<VariantOption> = vec![];
        opts.push(VariantOption {
            variant_id: "jfhg0odq".to_string(),
            option_id: "lskdlso1".to_string(),
            payment_details: None,
            trait_gate: None,
        });
        opts.push(VariantOption {
            variant_id: "jflqkah8".to_string(),
            option_id: "lskdyso1".to_string(),
            payment_details: None,
            trait_gate: None,
        });
        opts.push(VariantOption {
            variant_id: "ryeholi9".to_string(),
            option_id: "qwelo12o".to_string(),
            payment_details: None,
            trait_gate: None,
        });
        opts.push(VariantOption {
            variant_id: "vbclko09".to_string(),
            option_id: "flqo32ty".to_string(),
            payment_details: None,
            trait_gate: None,
        });

        let variant_metadata = VariantMetadata {
            name: "test".to_string(),
            id: "lqowkfd2".to_string(),
            status: VariantStatus { enabled: true },
            options: opts,
        };
        let opt = variant_metadata.find_option("flqo32ty");
        assert_eq!(opt.option_id, "flqo32ty".to_string())
    }

    #[test]
    fn test_is_eligible() {
        let trait_gate_requirements = create_pubkeys(2);
        let variant_option = VariantOption {
            variant_id: "vbclko09".to_string(),
            option_id: "lqowkfd2".to_string(),
            payment_details: None,
            trait_gate: Some(TraitGate {
                operator: Operator::And,
                traits: trait_gate_requirements.clone(),
            }),
        };
        let eligible = variant_option.is_eligible(&trait_gate_requirements);
        assert!(eligible);

        let not_eligible = variant_option.is_eligible(&create_pubkeys(1));
        assert!(!not_eligible)
    }

    #[test]
    fn test_is_eligible_no_gate() {
        let variant_option = VariantOption {
            variant_id: "vbclko09".to_string(),
            option_id: "lskdyso1".to_string(),
            payment_details: None,
            trait_gate: None,
        };
        let eligible = variant_option.is_eligible(&create_pubkeys(10));
        assert!(eligible);
    }

    #[test]
    fn test_exists_in_trait_gate() {
        let trait_gate_requirements = create_pubkeys(2);
        let mut opts: Vec<VariantOption> = vec![];
        opts.push(VariantOption {
            variant_id: "vbclko09".to_string(),
            option_id: "lskdyso1".to_string(),
            payment_details: None,
            trait_gate: Some(TraitGate {
                operator: Operator::And,
                traits: trait_gate_requirements.clone(),
            }),
        });

        let exists = exists_in_trait_gate(&opts, &trait_gate_requirements[0]);
        assert!(exists);

        let does_not_exist = exists_in_trait_gate(&opts, &create_pubkeys(1)[0]);
        assert!(!does_not_exist);
    }

    #[test]
    fn test_trait_gate_validate() {
        let trait_gate_requirements = create_pubkeys(10);
        let trait_gate = TraitGate {
            operator: Operator::And,
            traits: trait_gate_requirements.clone(),
        };
        let valid = trait_gate.validate(&trait_gate_requirements);
        assert!(valid);

        let invalid = trait_gate.validate(&create_pubkeys(5));
        assert!(!invalid)
    }

    #[test]
    fn test_update_variant_selection() {
        let mut trait_data = TraitData {
            attribute_ids: vec![1, 2],
            trait_id: 0,
            trait_address: create_pubkeys(1)[0],
            variant_selection: vec![VariantOption {
                variant_id: "lskdyso1".to_string(),
                option_id: "flowvk12".to_string(),
                payment_details: None,
                trait_gate: None,
            }],
        };
        assert_eq!(
            trait_data.variant_selection.first().unwrap().option_id,
            "flowvk12".to_string()
        );
        assert_eq!(trait_data.variant_selection.len(), 1);

        let new_variant_selection1 = VariantOption {
            variant_id: "lskdyso1".to_string(),
            option_id: "qjelso90".to_string(),
            payment_details: None,
            trait_gate: None,
        };
        trait_data.update_variant_selection_data(new_variant_selection1);

        assert_eq!(
            trait_data.variant_selection.first().unwrap().option_id,
            "qjelso90".to_string()
        );
        assert_eq!(trait_data.variant_selection.len(), 1);

        let new_variant_selection2 = VariantOption {
            variant_id: "lskdyso1".to_string(),
            option_id: "jfh67odq".to_string(),
            payment_details: None,
            trait_gate: None,
        };
        trait_data.update_variant_selection_data(new_variant_selection2);

        assert_eq!(
            trait_data.variant_selection.first().unwrap().option_id,
            "jfh67odq".to_string()
        );
        assert_eq!(trait_data.variant_selection.len(), 1);
    }

    #[test]
    fn test_update_variant_selection_new_variant() {
        let mut trait_data = TraitData {
            attribute_ids: vec![1, 2],
            trait_id: 0,
            trait_address: create_pubkeys(1)[0],
            variant_selection: vec![VariantOption {
                variant_id: "jfh67odq".to_string(),
                option_id: "jfh67odq".to_string(),
                payment_details: None,
                trait_gate: None,
            }],
        };
        assert_eq!(
            trait_data.variant_selection.first().unwrap().option_id,
            "jfh67odq".to_string()
        );
        assert_eq!(trait_data.variant_selection.len(), 1);

        let new_variant_selection = VariantOption {
            variant_id: "foobar12".to_string(),
            option_id: "xloal23d".to_string(),
            payment_details: None,
            trait_gate: None,
        };
        trait_data.update_variant_selection_data(new_variant_selection);
        assert_eq!(trait_data.variant_selection.len(), 2);
    }

    fn create_pubkeys(count: u64) -> Vec<Pubkey> {
        let mut keys: Vec<Pubkey> = vec![];
        for _n in 0..count {
            keys.push(Pubkey::new_unique());
        }

        keys
    }
}
