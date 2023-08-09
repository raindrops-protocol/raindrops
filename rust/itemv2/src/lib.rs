use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub use instructions::*;

declare_id!("itEm2FtqJWqUmMTYrUxoFcmFtBxEpd68VTmxJamQXA3");

#[program]
pub mod itemv2 {
    use super::*;

    pub fn create_item_class(
        ctx: Context<CreateItemClass>,
        args: CreateItemClassArgs,
    ) -> Result<()> {
        create_item_class::handler(ctx, args)
    }

    pub fn create_recipe(ctx: Context<CreateRecipe>, args: CreateRecipeArgs) -> Result<()> {
        create_recipe::handler(ctx, args)
    }

    pub fn add_item_to_item_class(ctx: Context<AddItemToItemClass>) -> Result<()> {
        add_item_to_item_class::handler(ctx)
    }

    pub fn create_pack(ctx: Context<CreatePack>, args: CreatePackArgs) -> Result<()> {
        create_pack::handler(ctx, args)
    }

    pub fn start_build(ctx: Context<StartBuild>, args: StartBuildArgs) -> Result<()> {
        start_build::handler(ctx, args)
    }

    pub fn add_ingredient_pnft(ctx: Context<AddIngredientPNft>) -> Result<()> {
        add_ingredient_pnft::handler(ctx)
    }

    pub fn add_ingredient_spl(
        ctx: Context<AddIngredientSpl>,
        args: AddIngredientSplArgs,
    ) -> Result<()> {
        add_ingredient_spl::handler(ctx, args)
    }

    pub fn verify_ingredient<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, VerifyIngredient<'info>>,
        args: VerifyIngredientArgs,
    ) -> Result<()> {
        verify_ingredient::handler(ctx, args)
    }

    pub fn verify_ingredient_test<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, VerifyIngredientTest<'info>>,
        args: VerifyIngredientTestArgs,
    ) -> Result<()> {
        verify_ingredient_test::handler(ctx, args)
    }

    pub fn receive_item_pnft(ctx: Context<ReceiveItemPNft>) -> Result<()> {
        receive_item_pnft::handler(ctx)
    }

    pub fn receive_item_spl(ctx: Context<ReceiveItemSpl>) -> Result<()> {
        receive_item_spl::handler(ctx)
    }

    pub fn complete_build_item<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CompleteBuildItem<'info>>,
        args: CompleteBuildItemArgs,
    ) -> Result<()> {
        complete_build_item::handler(ctx, args)
    }

    pub fn complete_build_pack<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CompleteBuildPack<'info>>,
        args: CompleteBuildPackArgs,
    ) -> Result<()> {
        complete_build_pack::handler(ctx, args)
    }

    pub fn complete_build_preset_only(ctx: Context<CompleteBuildPresetOnly>) -> Result<()> {
        complete_build_preset_only::handler(ctx)
    }

    pub fn apply_build_effect(ctx: Context<ApplyBuildEffect>) -> Result<()> {
        apply_build_effect::handler(ctx)
    }

    pub fn return_ingredient_pnft(ctx: Context<ReturnIngredientPNft>) -> Result<()> {
        return_ingredient_pnft::handler(ctx)
    }

    pub fn return_ingredient_spl(ctx: Context<ReturnIngredientSpl>) -> Result<()> {
        return_ingredient_spl::handler(ctx)
    }

    pub fn destroy_ingredient_spl(ctx: Context<DestroyIngredientSpl>) -> Result<()> {
        destroy_ingredient_spl::handler(ctx)
    }

    pub fn destroy_ingredient_pnft(ctx: Context<DestroyIngredientPNft>) -> Result<()> {
        destroy_ingredient_pnft::handler(ctx)
    }

    pub fn close_build(ctx: Context<CloseBuild>) -> Result<()> {
        close_build::handler(ctx)
    }

    pub fn escrow_payment(ctx: Context<EscrowPayment>) -> Result<()> {
        escrow_payment::handler(ctx)
    }

    pub fn transfer_payment(ctx: Context<TransferPayment>) -> Result<()> {
        transfer_payment::handler(ctx)
    }

    pub fn create_build_permit(
        ctx: Context<CreateBuildPermit>,
        args: CreateBuildPermitArgs,
    ) -> Result<()> {
        create_build_permit::handler(ctx, args)
    }

    pub fn create_deterministic_ingredient(
        ctx: Context<CreateDeterministicIngredient>,
        args: CreateDeterministicIngredientArgs,
    ) -> Result<()> {
        create_deterministic_ingredient::handler(ctx, args)
    }

    pub fn mint_authority_tokens(
        ctx: Context<MintAuthorityTokens>,
        args: MintAuthorityTokensArgs,
    ) -> Result<()> {
        mint_authority_tokens::handler(ctx, args)
    }

    pub fn release_from_escrow_spl(
        ctx: Context<ReleaseFromEscrowSpl>,
        args: ReleaseFromEscrowSplArgs,
    ) -> Result<()> {
        release_from_escrow_spl::handler(ctx, args)
    }

    pub fn release_from_escrow_pnft(ctx: Context<ReleaseFromEscrowPNft>) -> Result<()> {
        release_from_escrow_pnft::handler(ctx)
    }
}
