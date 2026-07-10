use anchor_lang::prelude::*;

use crate::{constants::*, error::ErrorCode, state::Config};

/// Accounts required to initialize the singleton protocol configuration.
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Payer funding the configuration account rent.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Protocol configuration PDA.
    #[account(
        init,
        payer = payer,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,

    /// System program used to create the configuration account.
    pub system_program: Program<'info, System>,
}

/// Event emitted after the protocol configuration is initialized.
#[event]
pub struct ConfigInitialized {
    /// Configuration account address.
    pub config: Pubkey,
    /// Administrative authority for protocol-level settings.
    pub admin: Pubkey,
    /// Account that receives protocol fees.
    pub fee_receiver: Pubkey,
    /// Authority expected to sign future oracle attestations.
    pub oracle_authority: Pubkey,
    /// Default fee for newly created markets, expressed in basis points.
    pub default_fee_bps: u16,
    /// PDA bump for the configuration account.
    pub bump: u8,
}

/// Initializes the singleton protocol configuration PDA.
pub fn handle_initialize(
    ctx: Context<Initialize>,
    admin: Pubkey,
    fee_receiver: Pubkey,
    oracle_authority: Pubkey,
    default_fee_bps: u16,
) -> Result<()> {
    require!(default_fee_bps <= MAX_FEE_BPS, ErrorCode::InvalidFeeBps);
    require!(admin != Pubkey::default(), ErrorCode::InvalidAuthority);
    require!(
        fee_receiver != Pubkey::default(),
        ErrorCode::InvalidAuthority
    );
    require!(
        oracle_authority != Pubkey::default(),
        ErrorCode::InvalidAuthority
    );

    let config = &mut ctx.accounts.config;
    config.admin = admin;
    config.fee_receiver = fee_receiver;
    config.oracle_authority = oracle_authority;
    config.default_fee_bps = default_fee_bps;
    config.paused = false;
    config.bump = ctx.bumps.config;

    emit!(ConfigInitialized {
        config: config.key(),
        admin,
        fee_receiver,
        oracle_authority,
        default_fee_bps,
        bump: config.bump,
    });

    Ok(())
}
