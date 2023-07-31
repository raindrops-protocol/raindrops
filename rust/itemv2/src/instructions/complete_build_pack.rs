use anchor_lang::prelude::*;

use crate::state::{
    accounts::{Build, BuildPermit, ItemClass, Pack},
    errors::ErrorCode,
    is_signer, BuildStatus, PackContents,
};

#[derive(Accounts)]
pub struct CompleteBuildPack<'info> {
    #[account(mut,
        has_one = item_class,
        seeds = [Pack::PREFIX.as_bytes(), item_class.key().as_ref(), &pack.id.to_le_bytes()], bump
    )]
    pub pack: Box<Account<'info, Pack>>,

    #[account(
        constraint = item_class.output_mode.is_pack(),
        seeds = [ItemClass::PREFIX.as_bytes(), item_class.authority_mint.key().as_ref()], bump)]
    pub item_class: Account<'info, ItemClass>,

    #[account(mut,
        has_one = item_class,
        constraint = build_permit.builder.eq(&build.builder.key()),
        seeds = [BuildPermit::PREFIX.as_bytes(), build.builder.key().as_ref(), item_class.key().as_ref()], bump)]
    pub build_permit: Option<Account<'info, BuildPermit>>,

    #[account(mut,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), build.builder.as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut, constraint = is_signer(&payer.key()))]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteBuildPackArgs {
    pub pack_contents: PackContents,
}

pub fn handler(ctx: Context<CompleteBuildPack>, args: CompleteBuildPackArgs) -> Result<()> {
    // check build requirements are met
    ctx.accounts.build.validate_build_criteria()?;

    // check that the pack_contents hash matches the one stored in the pack pda
    let args_hash = args.pack_contents.hash_pack_contents();
    let pda_hash = &ctx.accounts.pack.contents_hash;
    require!(args_hash.eq(pda_hash), ErrorCode::InvalidPackContents);

    let build_account = &ctx.accounts.build.to_account_info();

    // mark build as complete
    let build = &mut ctx.accounts.build;
    build.status = BuildStatus::Complete;

    // set the output data for this build based on the chosen pack
    for entry in &args.pack_contents.entries {
        build.add_output_item(
            entry.mint,
            entry.amount,
            build_account,
            ctx.accounts.payer.clone(),
            ctx.accounts.system_program.clone(),
        )?;
    }

    // if build permit is in use we must decrement the remaining builds
    if build.build_permit_in_use {
        match &mut ctx.accounts.build_permit {
            Some(build_permit) => {
                // decrement the remaining builds this build permit is allowed
                build_permit.remaining_builds -= 1;

                // if remaining builds are now 0, lets close the PDA
                if build_permit.remaining_builds == 0 {
                    ctx.accounts
                        .build_permit
                        .close(ctx.accounts.payer.to_account_info())?;
                };
            }
            None => return Err(ErrorCode::BuildPermitRequired.into()),
        }
    }

    // close the pack pda
    ctx.accounts
        .pack
        .close(ctx.accounts.payer.to_account_info())
}
