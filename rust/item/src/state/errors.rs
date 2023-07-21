use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Build still owns tokens")]
    BuildNotEmpty,

    #[msg("Building is disabled for this Item Class")]
    BuildDisabled,

    #[msg("Cannot Complete Build, Missing at least one build material")]
    MissingIngredient,

    #[msg("Incorrect material for build")]
    IncorrectIngredient,

    #[msg("Build Status is incompatible with this instruction")]
    InvalidBuildStatus,

    #[msg("Item cannot be returned")]
    ItemNotReturnable,

    #[msg("Item cannot be destroyed")]
    ItemIneligibleForDestruction,

    #[msg("Build Effect Already Applied")]
    BuildEffectAlreadyApplied,

    #[msg("Build Effect Not Applied")]
    BuildEffectNotApplied,

    #[msg("Item is on Cooldown")]
    ItemOnCooldown,

    #[msg("Invalid Payment Treasury Account")]
    InvalidPaymentTreasury,

    #[msg("Must make build payment")]
    BuildNotPaid,
}
