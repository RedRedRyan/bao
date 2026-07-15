use anchor_lang::prelude::*;

use crate::{
    constants::{BET_SEED, CONFIG_SEED, MARKET_SEED, VAULT_SEED},
    state::{Bet, Config, Market, MarketStatus},
    utils::{assert_market_not_resolved, assert_protocol_active, assert_timeout_passed, transfer_from_vault},
};

/// Accounts required to refund a bet from a timed-out market.
#[derive(Accounts)]
pub struct Refund<'info> {
    /// The user requesting their bet refund.
    #[account(mut)]
    pub bettor: Signer<'info>,

    /// Singleton protocol configuration PDA.
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The timed-out market.
    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// The bet PDA to be closed and refunded.
    #[account(
        mut,
        close = bettor,
        seeds = [BET_SEED, market.key().as_ref(), bettor.key().as_ref(), bet.outcome.to_le_bytes().as_ref()],
        bump = bet.bump,
        has_one = market,
        has_one = bettor,
    )]
    pub bet: Account<'info, Bet>,

    /// The market's SOL vault PDA that holds the pooled funds.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// System program used for transferring SOL.
    pub system_program: Program<'info, System>,
}

/// Event emitted after a bet is refunded due to market timeout.
#[event]
pub struct BetRefunded {
    /// The market address.
    pub market: Pubkey,
    /// The bet PDA address.
    pub bet: Pubkey,
    /// The bettor address.
    pub bettor: Pubkey,
    /// The original amount refunded to the bettor.
    pub amount: u64,
}

/// Refunds the original bet amount to the user if the market failed to resolve in time.
pub fn handle_refund(ctx: Context<Refund>) -> Result<()> {
    assert_protocol_active(ctx.accounts.config.paused)?;
    assert_market_not_resolved(&ctx.accounts.market.status)?;

    let current_ts = Clock::get()?.unix_timestamp;
    assert_timeout_passed(current_ts, ctx.accounts.market.timeout_ts)?;

    let market = &mut ctx.accounts.market;
    let bet = &ctx.accounts.bet;

    // The first refund shifts the market permanently into Voided status
    if market.status != MarketStatus::Voided {
        market.status = MarketStatus::Voided;
    }

    if bet.amount > 0 {
        transfer_from_vault(
            &ctx.accounts.system_program.to_account_info(),
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.bettor.to_account_info(),
            bet.amount,
            &market.key(),
            market.vault_bump,
        )?;
    }

    emit!(BetRefunded {
        market: market.key(),
        bet: bet.key(),
        bettor: bet.bettor,
        amount: bet.amount,
    });

    Ok(())
}
