use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Building is disabled for this Item Class")]
    BuildDisabled,

    #[msg("Cannot Complete Build, Missing at least one build material")]
    MissingBuildMaterial,

    #[msg("Incorrect material for build")]
    IncorrectMaterial,

    #[msg("Must complete build before receiving item")]
    BuildIncomplete,
}
