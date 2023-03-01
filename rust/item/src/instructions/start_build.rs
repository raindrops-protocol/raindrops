use std::vec;

use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, ItemClassV1, Schema},
    errors::ErrorCode,
    BuildMaterialData, BuildStatus, PaymentState,
};

#[derive(Accounts)]
#[instruction(args: StartBuildArgs)]
pub struct StartBuild<'info> {
    #[account(init,
        payer = builder,
        space = Build::space(&schema.materials),
        seeds = [Build::PREFIX.as_bytes(), item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(seeds = [Schema::PREFIX.as_bytes(), &args.schema_index.to_le_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut, seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub builder: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StartBuildArgs {
    pub schema_index: u64,
}

pub fn handler(ctx: Context<StartBuild>, args: StartBuildArgs) -> Result<()> {
    // check this schema is enabled for building
    require!(ctx.accounts.schema.build_enabled, ErrorCode::BuildDisabled);

    // set initial build material state
    let mut materials: Vec<BuildMaterialData> =
        Vec::with_capacity(ctx.accounts.schema.materials.len());
    for required_material in ctx.accounts.schema.materials.clone() {
        materials.push(required_material.into());
    }

    let payment: Option<PaymentState> = match &ctx.accounts.schema.payment {
        Some(payment) => Some(PaymentState {
            paid: false,
            payment_details: payment.clone(),
        }),
        None => None,
    };

    // set build data
    ctx.accounts.build.set_inner(Build {
        schema_index: args.schema_index,
        builder: ctx.accounts.builder.key(),
        item_class: ctx.accounts.item_class.key(),
        item_mint: None,
        status: BuildStatus::InProgress,
        payment: payment,
        materials: materials,
    });

    Ok(())
}
