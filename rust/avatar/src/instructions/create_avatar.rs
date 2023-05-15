use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::state::{
    accounts::{Avatar, AvatarClass},
    data::{VariantMetadata, VariantOption},
};

use crate::utils::is_rain;

#[derive(Accounts)]
#[instruction(args: CreateAvatarArgs)]
pub struct CreateAvatar<'info> {
    #[account(seeds = [AvatarClass::PREFIX.as_bytes(), avatar_class.mint.as_ref()], bump)]
    pub avatar_class: Account<'info, AvatarClass>,

    #[account(
        constraint = avatar_class_mint_ata.amount >= 1,
        associated_token::mint = avatar_class.mint, associated_token::authority = authority)]
    pub avatar_class_mint_ata: Account<'info, token::TokenAccount>,

    #[account(init,
        payer = authority,
        space = Avatar::initial_space(get_variants(&avatar_class.variant_metadata, &args.variants)),
        seeds = [Avatar::PREFIX.as_bytes(), avatar_class.key().as_ref(), avatar_mint.key().as_ref()], bump)]
    pub avatar: Account<'info, Avatar>,

    pub avatar_mint: Account<'info, token::Mint>,

    #[account(mut, constraint = is_rain(rain_mint.key()))]
    pub rain_mint: Account<'info, token::Mint>,

    #[account(mut, associated_token::mint = rain_mint, associated_token::authority = authority)]
    pub authority_rain_ata: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, token::Token>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateAvatarArgs {
    pub variants: Vec<VariantArg>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VariantArg {
    pub variant_id: String,
    pub option_id: String,
}

pub fn handler(ctx: Context<CreateAvatar>, args: CreateAvatarArgs) -> Result<()> {
    // burn 1 $RAIN
    let burn_accounts = token::Burn {
        from: ctx.accounts.authority_rain_ata.to_account_info(),
        mint: ctx.accounts.rain_mint.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    token::burn(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_accounts),
        100000, // $RAIN has 5 decimals so this burns 1 token
    )?;

    // get the variant selection from the args
    let variants = get_variants(&ctx.accounts.avatar_class.variant_metadata, &args.variants);

    ctx.accounts.avatar.set_inner(Avatar {
        avatar_class: ctx.accounts.avatar_class.key(),
        mint: ctx.accounts.avatar_mint.key(),
        image_uri: "".to_string(),
        traits: vec![],
        variants,
    });

    Ok(())
}

// get the full variant data for the args
fn get_variants(
    variant_metadata: &Vec<VariantMetadata>,
    variants: &Vec<VariantArg>,
) -> Vec<VariantOption> {
    let mut variants_selected: Vec<VariantOption> = vec![];
    for arg in variants {
        for vm in variant_metadata {
            if vm.id == arg.variant_id {
                let variant_selection =
                    match vm.options.iter().find(|opt| opt.option_id == arg.option_id) {
                        Some(variant_selection) => variant_selection,
                        None => {
                            panic!(
                                "invalid option: {} for variant: {} and variant_metadata: {}",
                                arg.option_id, arg.variant_id, vm.id
                            );
                        }
                    };
                variants_selected.push(variant_selection.clone());
            }
        }
    }

    variants_selected
}
