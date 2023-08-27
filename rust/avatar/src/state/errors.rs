use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Attribute is Available")]
    AttributeAvailable,

    #[msg("Attribute is not Mutable")]
    AttributeImmutable,

    #[msg("Attribute is Unavailable")]
    AttributeUnavailable,

    #[msg("Invalid Attribute ID")]
    InvalidAttributeId,

    #[msg("Trait Not Equipped")]
    TraitNotEquipped,

    #[msg("Trait Conflict")]
    TraitConflict,

    #[msg("Trait in Use")]
    TraitInUse,

    #[msg("Invalid Variant")]
    InvalidVariant,

    #[msg("Invalid Payment Method")]
    InvalidPaymentMethod,

    #[msg("Invalid Payment Mint")]
    InvalidPaymentMint,

    #[msg("Payment Not Paid")]
    PaymentNotPaid,

    #[msg("Incorrect Asset Class for Instruction")]
    IncorrectAssetClass,

    #[msg("Invalid Trait Account for Update")]
    InvalidTrait,

    #[msg("Trait Is Disabled")]
    TraitDisabled,

    #[msg("Variant Is Disabled")]
    VariantDisabled,

    #[msg("Invalid UpdateTarget")]
    InvalidUpdateTarget,

    #[msg("Token Account Delegate Not Allowed")]
    TokenDelegateNotAllowed,

    #[msg("Missing Essential Attribute Relacement")]
    MissingEssentialAttribute,

    #[msg("Migration Error")]
    MigrationError,
}
