use anchor_lang::prelude::*;

use crate::{
    constants::{CONFIG_SEED, MARKET_SEED, VAULT_SEED},
    error::ErrorCode,
    state::{Config, Market, MarketStatus},
    utils::{assert_protocol_active, transfer_from_vault},
};

/// 90 days expressed in seconds.
pub const SWEEP_DELAY_SECONDS: i64 = 90 * 24 * 60 * 60;

/// Accounts required to sweep a stale market's unclaimed funds.
#[derive(Accounts)]
pub struct Sweep<'info> {
    /// The admin authority.
    #[account(mut, address = config.admin @ ErrorCode::Unauthorized)]
    pub admin: Signer<'info>,

    /// Singleton protocol configuration PDA.
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The stale market to be closed.
    #[account(
        mut,
        close = admin,
        seeds = [MARKET_SEED, market.market_id.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// The market's SOL vault PDA to be emptied.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The protocol fee receiver.
    /// CHECK: Validated by the config PDA.
    #[account(mut, address = config.fee_receiver)]
    pub fee_receiver: UncheckedAccount<'info>,

    /// System program used for transferring SOL.
    pub system_program: Program<'info, System>,
}

/// Event emitted after a stale market is swept and closed.
#[event]
pub struct MarketSwept {
    /// The market address.
    pub market: Pubkey,
    /// The amount of lamports swept from the vault.
    pub amount: u64,
}

/// Sweeps unclaimed funds from a stale market vault and closes the market accounts.
pub fn handle_sweep(ctx: Context<Sweep>) -> Result<()> {
    assert_protocol_active(ctx.accounts.config.paused)?;

    let market = &ctx.accounts.market;
    let current_ts = Clock::get()?.unix_timestamp;

    let sweep_threshold = match market.status {
        MarketStatus::Resolved => market
            .resolved_at
            .unwrap()
            .checked_add(SWEEP_DELAY_SECONDS)
            .ok_or(ErrorCode::MathOverflow)?,
        MarketStatus::Voided => market
            .timeout_ts
            .checked_add(SWEEP_DELAY_SECONDS)
            .ok_or(ErrorCode::MathOverflow)?,
        _ => return err!(ErrorCode::MarketNotSweepable),
    };

    require!(current_ts > sweep_threshold, ErrorCode::SweepNotReady);

    let vault_lamports = ctx.accounts.vault.lamports();
    if vault_lamports > 0 {
        // Transferring 100% of the lamports logically closes the SystemAccount PDA.
        transfer_from_vault(
            &ctx.accounts.system_program.to_account_info(),
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.fee_receiver.to_account_info(),
            vault_lamports,
            &market.key(),
            market.vault_bump,
        )?;
    }

    emit!(MarketSwept {
        market: market.key(),
        amount: vault_lamports,
    });

    Ok(())
}
