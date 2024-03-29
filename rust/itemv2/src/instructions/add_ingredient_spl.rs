use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Build, DeterministicIngredient, ItemClass},
    errors::ErrorCode,
    BuildStatus,
};

#[derive(Accounts)]
pub struct AddIngredientSpl<'info> {
    pub ingredient_mint: Box<Account<'info, token::Mint>>,

    #[account(
        seeds = [ItemClass::PREFIX.as_bytes(), ingredient_item_class.authority_mint.key().as_ref()], bump)]
    pub ingredient_item_class: Account<'info, ItemClass>,

    #[account(
        has_one = ingredient_mint,
        seeds = [DeterministicIngredient::PREFIX.as_bytes(), build.item_class.as_ref(), ingredient_mint.key().as_ref()], bump
    )]
    pub deterministic_ingredient: Option<Account<'info, DeterministicIngredient>>,

    #[account(mut, constraint = ingredient_source.mint.eq(&ingredient_mint.key()))]
    pub ingredient_source: Box<Account<'info, token::TokenAccount>>,

    #[account(init_if_needed,
        payer = payer,
        associated_token::mint = ingredient_mint,
        associated_token::authority = build)]
    pub ingredient_destination: Box<Account<'info, token::TokenAccount>>,

    #[account(mut,
        has_one = builder,
        seeds = [Build::PREFIX.as_bytes(), build.item_class.key().as_ref(), builder.key().as_ref()], bump)]
    pub build: Account<'info, Build>,

    #[account(mut)]
    pub builder: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddIngredientSplArgs {
    pub amount: u64,
}

pub fn handler(ctx: Context<AddIngredientSpl>, args: AddIngredientSplArgs) -> Result<()> {
    let build_account = &ctx.accounts.build.to_account_info();
    let build = &mut ctx.accounts.build;

    // check that the build is in progress
    require!(
        build.status.eq(&BuildStatus::InProgress),
        ErrorCode::InvalidBuildStatus
    );

    // increment current_amount by transfer amount
    build
        .increment_build_amount(ctx.accounts.ingredient_mint.key(), args.amount)
        .unwrap();

    // find matching build ingredient for the mint
    let build_ingredient = build
        .find_build_ingredient(
            ctx.accounts.ingredient_item_class.key(),
            ctx.accounts.ingredient_mint.key(),
        )
        .unwrap();

    // add deterministic outputs to build outputs
    if build_ingredient.is_deterministic {
        match &ctx.accounts.deterministic_ingredient {
            Some(deterministic_ingredient) => {
                for output in &deterministic_ingredient.outputs {
                    build.add_output_item(
                        output.mint,
                        output.amount,
                        build_account,
                        ctx.accounts.payer.clone(),
                        ctx.accounts.system_program.clone(),
                    )?;
                }
            }
            None => return Err(ErrorCode::IncorrectIngredient.into()),
        }
    };

    // transfer tokens to build pda
    let transfer_accounts = token::Transfer {
        from: ctx.accounts.ingredient_source.to_account_info(),
        to: ctx.accounts.ingredient_destination.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        ),
        args.amount,
    )
}
