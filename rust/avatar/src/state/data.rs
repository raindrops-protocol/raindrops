use anchor_lang::{
    prelude::*,
    solana_program::hash::{hash, Hash},
};

use crate::utils::reallocate;

use super::errors::ErrorCode;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AttributeMetadata {
    pub id: u16,
    pub name: String,
    pub status: AttributeStatus,
}

impl AttributeMetadata {
    pub fn space(&self) -> usize {
        2 + // id
        (4 + self.name.len()) + // name
        AttributeStatus::SPACE // attribute status
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
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

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone, Debug)]
pub struct PaymentDetails {
    pub payment_method: Pubkey,
    pub amount: u64,
}

impl PaymentDetails {
    pub const SPACE: usize = 32 + // payment_method
    8; // amount
}

impl From<PaymentDetails> for PaymentState {
    fn from(details: PaymentDetails) -> Self {
        PaymentState {
            payment_method: details.payment_method,
            current_amount: 0,
            required_amount: details.amount,
        }
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
            Operator::Or => self.traits.iter().any(|t| traits.contains(t)),
        }
    }

    // return true if trait_account is present in the trait gate
    // TODO: OR or AND, NOT would behave differently but its not implemented yet
    pub fn in_use(&self, trait_account: &Pubkey) -> bool {
        match &self.operator {
            Operator::And | Operator::Or => self.traits.iter().any(|t| t.eq(trait_account)),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Clone, Debug)]
pub enum Operator {
    And,
    Or,
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
    pub trait_gate: Option<TraitGate>,
}

impl TraitData {
    pub fn new(
        attribute_ids: Vec<u16>,
        trait_id: u16,
        trait_address: Pubkey,
        variant_metadata: &[VariantMetadata],
        trait_gate: Option<TraitGate>,
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
            trait_gate,
        }
    }

    pub fn current_space(&self) -> usize {
        let mut total_bytes = (4 + (self.attribute_ids.len() * 2)) + // attribute ids
        2 + // trait_id
        32 + // trait address
        4 + // variant selection vector bytes
        1; // Option trait gate byte

        for variant in &self.variant_selection {
            total_bytes += variant.space();
        }

        if let Some(trait_gate) = &self.trait_gate {
            total_bytes += trait_gate.space();
        };

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
pub enum UpdateTargetSelection {
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
    },
    SwapTrait {
        equip_trait_account: Pubkey,
        remove_trait_account: Pubkey,
    },
}

impl UpdateTargetSelection {
    // this space calc is really based on UpdateTarget, not the UpdateTargetSelection struct
    // UpdateTargetSelection is just used by the caller of the instruction to select the appropriate variant
    pub fn space(&self) -> usize {
        let enum_bytes = 1;
        match &self {
            Self::ClassVariant {
                variant_id,
                option_id,
                ..
            } => {
                enum_bytes
                    + (4 + variant_id.len())
                    + (4 + option_id.len())
                    + (1 + PaymentState::SPACE)
            }
            Self::TraitVariant {
                variant_id,
                option_id,
                ..
            } => {
                enum_bytes
                    + (4 + variant_id.len())
                    + (4 + option_id.len())
                    + 32
                    + (1 + PaymentState::SPACE)
            }
            Self::EquipTrait { .. } => enum_bytes + 32 + (1 + PaymentState::SPACE),
            Self::RemoveTrait { .. } => enum_bytes + 32 + 32 + (1 + PaymentState::SPACE),
            Self::SwapTrait { .. } => {
                enum_bytes + 32 + 32 + 32 + (1 + PaymentState::SPACE) + (1 + PaymentState::SPACE)
            }
        }
    }

    // hash the update target so we can use it as an account seed
    pub fn hash(&self) -> Hash {
        match &self {
            Self::ClassVariant {
                variant_id,
                option_id,
                ..
            } => hash(format!("{variant_id}{option_id}").as_bytes()),
            Self::TraitVariant {
                variant_id,
                option_id,
                trait_account,
                ..
            } => hash(format!("{variant_id}{option_id}{trait_account}").as_bytes()),
            Self::EquipTrait { trait_account, .. } => hash(format!("{trait_account}").as_bytes()),
            Self::RemoveTrait { trait_account, .. } => hash(format!("{trait_account}").as_bytes()),
            Self::SwapTrait {
                equip_trait_account,
                remove_trait_account,
                ..
            } => hash(format!("{equip_trait_account}{remove_trait_account}").as_bytes()),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum UpdateTarget {
    ClassVariant {
        variant_id: String,
        option_id: String,
        payment_state: Option<PaymentState>,
    },
    TraitVariant {
        variant_id: String,
        option_id: String,
        trait_account: Pubkey,
        payment_state: Option<PaymentState>,
    },
    EquipTrait {
        trait_account: Pubkey,
        payment_state: Option<PaymentState>,
    },
    RemoveTrait {
        trait_account: Pubkey,
        payment_state: Option<PaymentState>,
    },
    SwapTrait {
        equip_trait_account: Pubkey,
        remove_trait_account: Pubkey,
        equip_payment_state: Option<PaymentState>,
        remove_payment_state: Option<PaymentState>,
    },
}

impl UpdateTarget {
    // update the payment state
    // for an atomic trait swap where both traits have the same payment method this will first
    // check the payment state of the equip trait, if that required_amount has already been fulfilled it will check the
    // payment state of the removed trait and update that one
    // if the payment state already meets the requirements for the update or the payment method does not match this will error
    pub fn update_payment_state(&mut self, payment_method: &Pubkey, amount: u64) -> Result<()> {
        match self {
            Self::ClassVariant { payment_state, .. }
            | Self::TraitVariant { payment_state, .. }
            | Self::EquipTrait { payment_state, .. }
            | Self::RemoveTrait { payment_state, .. } => match payment_state {
                Some(state) => {
                    if state.payment_method.eq(payment_method)
                        && state.current_amount < state.required_amount
                    {
                        state.current_amount += amount;
                        return Ok(());
                    }
                }
                None => return Err(ErrorCode::InvalidPaymentMethod.into()),
            },
            Self::SwapTrait {
                equip_payment_state,
                remove_payment_state,
                ..
            } => {
                match equip_payment_state {
                    Some(state) => {
                        if state.payment_method.eq(payment_method)
                            && state.current_amount < state.required_amount
                        {
                            state.current_amount += amount;
                            return Ok(());
                        }
                    }
                    None => return Err(ErrorCode::InvalidPaymentMethod.into()),
                }

                match remove_payment_state {
                    Some(state) => {
                        if state.payment_method.eq(payment_method)
                            && state.current_amount < state.required_amount
                        {
                            state.current_amount += amount;
                            return Ok(());
                        }
                    }
                    None => return Err(ErrorCode::InvalidPaymentMethod.into()),
                }
            }
        };

        Err(ErrorCode::InvalidPaymentMethod.into())
    }

    // hash the update target so we can use it as an account seed
    pub fn hash(&self) -> Hash {
        match &self {
            Self::ClassVariant {
                variant_id,
                option_id,
                ..
            } => hash(format!("{variant_id}{option_id}").as_bytes()),
            Self::TraitVariant {
                variant_id,
                option_id,
                trait_account,
                ..
            } => hash(format!("{variant_id}{option_id}{trait_account}").as_bytes()),
            Self::EquipTrait { trait_account, .. } => hash(format!("{trait_account}").as_bytes()),
            Self::RemoveTrait { trait_account, .. } => hash(format!("{trait_account}").as_bytes()),
            Self::SwapTrait {
                equip_trait_account,
                remove_trait_account,
                ..
            } => hash(format!("{equip_trait_account}{remove_trait_account}").as_bytes()),
        }
    }

    pub fn is_paid(&self) -> bool {
        match &self {
            Self::ClassVariant { payment_state, .. }
            | Self::TraitVariant { payment_state, .. }
            | Self::EquipTrait { payment_state, .. }
            | Self::RemoveTrait { payment_state, .. } => match payment_state {
                Some(state) => state.is_paid(),
                None => true,
            },
            Self::SwapTrait {
                equip_payment_state,
                remove_payment_state,
                ..
            } => {
                let equip_payment_is_paid = match equip_payment_state {
                    Some(state) => state.is_paid(),
                    None => true,
                };

                let remove_payment_is_paid = match remove_payment_state {
                    Some(state) => state.is_paid(),
                    None => true,
                };

                equip_payment_is_paid && remove_payment_is_paid
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct PaymentState {
    pub payment_method: Pubkey,
    pub current_amount: u64,
    pub required_amount: u64,
}

impl PaymentState {
    pub const SPACE: usize = 32 + 8 + 8;

    pub fn is_payment_method(&self, payment_method: &Pubkey) -> bool {
        self.payment_method.eq(payment_method)
    }

    pub fn is_paid(&self) -> bool {
        self.current_amount >= self.required_amount
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
    pub attribute_type: AttributeType,
    pub mutable: bool,
}

impl AttributeStatus {
    pub const SPACE: usize = 1 + // mutable flag
    AttributeType::SPACE; // attribute type
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum AttributeType {
    Optional,
    Essential,
}

impl AttributeType {
    pub const SPACE: usize = 1 + 1;
}

#[cfg(test)]
mod tests {
    use std::vec;

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
    fn test_trait_gate_and_operator_valid() {
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
    fn test_trait_gate_and_operator_invalid() {
        let trait_gate_requirements = create_pubkeys(10);
        let trait_gate = TraitGate {
            operator: Operator::And,
            traits: trait_gate_requirements.clone(),
        };
        let equipped_trait = trait_gate_requirements.clone().pop().unwrap();
        let valid = trait_gate.validate(&[equipped_trait]);
        assert!(!valid);
    }

    #[test]
    fn test_trait_gate_or_operator_valid() {
        let trait_gate_requirements = create_pubkeys(10);
        let trait_gate = TraitGate {
            operator: Operator::Or,
            traits: trait_gate_requirements.clone(),
        };
        let equipped_trait = trait_gate_requirements.clone().pop().unwrap();
        let valid = trait_gate.validate(&[equipped_trait]);
        assert!(valid);
    }

    #[test]
    fn test_trait_gate_or_operator_invalid() {
        let trait_gate_requirements = create_pubkeys(10);
        let trait_gate = TraitGate {
            operator: Operator::Or,
            traits: trait_gate_requirements.clone(),
        };
        let valid = trait_gate.validate(&create_pubkeys(5));
        assert!(!valid);
    }

    #[test]
    fn test_trait_gate_in_use() {
        let trait_gate_requirements = create_pubkeys(10);
        let trait_gate = TraitGate {
            operator: Operator::Or,
            traits: trait_gate_requirements.clone(),
        };
        let in_use = trait_gate.in_use(&trait_gate_requirements[0]);
        assert!(in_use);

        let not_in_use = trait_gate.in_use(&Pubkey::new_unique());
        assert!(!not_in_use);
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
            trait_gate: None,
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
            trait_gate: None,
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
