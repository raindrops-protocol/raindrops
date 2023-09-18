#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("AvAtARWmYZLbUFfoQc3RzT7zR5zLRs92VSMm8CsCadYN");

pub mod instructions;
pub mod state;
pub mod utils;
pub use instructions::*;

#[program]
pub mod raindrops_avatar {
    use super::*;

    pub fn create_avatar_class(
        ctx: Context<CreateAvatarClass>,
        args: CreateAvatarClassArgs,
    ) -> Result<()> {
        instructions::create_avatar_class::handler(ctx, args)
    }

    pub fn create_avatar(ctx: Context<CreateAvatar>, args: CreateAvatarArgs) -> Result<()> {
        instructions::create_avatar::handler(ctx, args)
    }

    pub fn create_trait(ctx: Context<CreateTrait>, args: CreateTraitArgs) -> Result<()> {
        instructions::create_trait::handler(ctx, args)
    }

    pub fn create_payment_method(
        ctx: Context<CreatePaymentMethod>,
        args: CreatePaymentMethodArgs,
    ) -> Result<()> {
        instructions::create_payment_method::handler(ctx, args)
    }

    pub fn equip_trait(ctx: Context<EquipTrait>) -> Result<()> {
        instructions::equip_trait::handler(ctx)
    }

    pub fn equip_trait_authority(ctx: Context<EquipTraitAuthority>) -> Result<()> {
        instructions::equip_trait_authority::handler(ctx)
    }

    pub fn remove_trait(ctx: Context<RemoveTrait>) -> Result<()> {
        instructions::remove_trait::handler(ctx)
    }

    pub fn remove_trait_authority(ctx: Context<RemoveTraitAuthority>) -> Result<()> {
        instructions::remove_trait_authority::handler(ctx)
    }

    pub fn swap_trait(ctx: Context<SwapTrait>) -> Result<()> {
        instructions::swap_trait::handler(ctx)
    }

    pub fn update_trait_variant(ctx: Context<UpdateVariant>) -> Result<()> {
        instructions::update_variant::handler(ctx)
    }

    pub fn update_trait_variant_authority(
        ctx: Context<UpdateTraitVariantAuthority>,
        args: UpdateTraitVariantAuthorityArgs,
    ) -> Result<()> {
        instructions::update_trait_variant_authority::handler(ctx, args)
    }

    pub fn update_class_variant_authority(
        ctx: Context<UpdateClassVariantAuthority>,
        args: UpdateClassVariantAuthorityArgs,
    ) -> Result<()> {
        instructions::update_class_variant_authority::handler(ctx, args)
    }

    pub fn update_trait(
        ctx: Context<UpdateTrait>,
        args: UpdateTraitArgs,
    ) -> Result<()> {
        instructions::update_trait::handler(ctx, args)
    }

    pub fn update_class_variant_metadata(
        ctx: Context<UpdateClassVariantMetadata>,
        args: UpdateClassVariantMetadataArgs,
    ) -> Result<()> {
        instructions::update_class_variant_metadata::handler(ctx, args)
    }

    pub fn update_attribute_metadata(
        ctx: Context<UpdateAttributeMetadata>,
        args: UpdateAttributeMetadataArgs,
    ) -> Result<()> {
        instructions::update_attribute_metadata::handler(ctx, args)
    }

    pub fn begin_variant_update(
        ctx: Context<BeginVariantUpdate>,
        args: BeginVariantUpdateArgs,
    ) -> Result<()> {
        instructions::begin_variant_update::handler(ctx, args)
    }

    pub fn begin_trait_update(
        ctx: Context<BeginTraitUpdate>,
        args: BeginTraitUpdateArgs,
    ) -> Result<()> {
        instructions::begin_trait_update::handler(ctx, args)
    }

    pub fn begin_trait_swap_update(
        ctx: Context<BeginTraitSwapUpdate>,
        args: BeginTraitSwapUpdateArgs,
    ) -> Result<()> {
        instructions::begin_trait_swap_update::handler(ctx, args)
    }

    pub fn cancel_update(ctx: Context<CancelUpdate>, args: CancelUpdateArgs) -> Result<()> {
        instructions::cancel_update::handler(ctx, args)
    }

    pub fn update_variant(ctx: Context<UpdateVariant>) -> Result<()> {
        instructions::update_variant::handler(ctx)
    }

    pub fn transfer_payment(
        ctx: Context<TransferPayment>,
        args: TransferPaymentArgs,
    ) -> Result<()> {
        instructions::transfer_payment::handler(ctx, args)
    }

    pub fn burn_payment(ctx: Context<BurnPayment>, args: BurnPaymentArgs) -> Result<()> {
        instructions::burn_payment::handler(ctx, args)
    }

    pub fn burn_payment_tree(
        ctx: Context<BurnPaymentTree>,
        args: BurnPaymentTreeArgs,
    ) -> Result<()> {
        instructions::burn_payment_tree::handler(ctx, args)
    }

    pub fn transfer_payment_tree(
        ctx: Context<TransferPaymentTree>,
        args: TransferPaymentTreeArgs,
    ) -> Result<()> {
        instructions::transfer_payment_tree::handler(ctx, args)
    }

    pub fn add_payment_mint_payment_method(
        ctx: Context<AddPaymentMintToPaymentMethod>,
    ) -> Result<()> {
        instructions::add_payment_mint_to_payment_method::handler(ctx)
    }

    pub fn add_trait_conflicts(
        ctx: Context<AddTraitConflicts>,
        args: AddTraitConflictsArgs,
    ) -> Result<()> {
        instructions::add_trait_conflicts::handler(ctx, args)
    }

    pub fn verify_payment_mint<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, VerifyPaymentMint<'info>>,
        args: VerifyPaymentMintArgs,
    ) -> Result<()> {
        instructions::verify_payment_mint::handler(ctx, args)
    }

    pub fn verify_payment_mint_test<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, VerifyPaymentMintTest<'info>>,
        args: VerifyPaymentMintTestArgs,
    ) -> Result<()> {
        instructions::verify_payment_mint_test::handler(ctx, args)
    }

    pub fn migrate_avatar_class_account(
        ctx: Context<MigrateAvatarClassAccount>,
        args: MigrateAvatarClassAccountArgs,
    ) -> Result<()> {
        migrate_avatar_class_account::handler(ctx, args)
    }
}
