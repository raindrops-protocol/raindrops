use anchor_lang::prelude::*;

use crate::state::{
    accounts::{ItemClassV1, Schema},
    Payment, SchemaMaterialData,
};

#[derive(Accounts)]
#[instruction(args: AddSchemaArgs)]
pub struct AddSchema<'info> {
    #[account(init,
        payer = authority,
        space = Schema::space(args.materials.len()),
        seeds = [Schema::PREFIX.as_bytes(), &(item_class.schema_index + 1).to_le_bytes(), item_class.key().as_ref()], bump)]
    pub schema: Account<'info, Schema>,

    #[account(mut,
        has_one = authority,
        seeds = [ItemClassV1::PREFIX.as_bytes(), item_class.items.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClassV1>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddSchemaArgs {
    pub build_enabled: bool,
    pub payment: Option<Payment>,
    pub materials: Vec<SchemaMaterialData>,
}

pub fn handler(ctx: Context<AddSchema>, args: AddSchemaArgs) -> Result<()> {
    // increment schema index on item class
    let item_class = &mut ctx.accounts.item_class;
    item_class.schema_index += 1;

    // init schema
    ctx.accounts.schema.set_inner(Schema {
        schema_index: ctx.accounts.item_class.schema_index,
        item_class: ctx.accounts.item_class.key(),
        build_enabled: args.build_enabled,
        materials: args.materials,
        payment: args.payment,
    });

    Ok(())
}
