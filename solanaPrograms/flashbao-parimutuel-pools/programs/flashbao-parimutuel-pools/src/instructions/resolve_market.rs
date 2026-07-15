use anchor_lang::prelude::*;

use crate::{
    constants::{CONFIG_SEED, MARKET_SEED},
    error::ErrorCode,
    state::{Config, Market, MarketStatus},
    utils::{assert_market_locked, assert_protocol_active},
};

/// Accounts required to resolve a generic parimutuel market.
#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    /// The oracle authority expected to resolve this market.
    #[account(mut, address = market.oracle_authority @ ErrorCode::Unauthorized)]
    pub oracle_authority: Signer<'info>,

    /// Singleton protocol configuration PDA.
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The market being resolved.
    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
}

/// Event emitted after a market is resolved.
#[event]
pub struct MarketResolved {
    /// The market address.
    pub market: Pubkey,
    /// The winning outcome index.
    pub winning_outcome: u16,
    /// Nonce used in the oracle's signature payload.
    pub nonce: u64,
    /// Unix timestamp when the market was resolved.
    pub resolved_at: i64,
}

/// Resolves a generic parimutuel market via oracle signature.
pub fn handle_resolve_market(
    ctx: Context<ResolveMarket>,
    winning_outcome: u16,
    nonce: u64,
    timestamp: i64,
) -> Result<()> {
    assert_protocol_active(ctx.accounts.config.paused)?;
    assert_market_locked(&ctx.accounts.market.status)?;

    let market = &mut ctx.accounts.market;

    require!(
        usize::from(winning_outcome) < usize::from(market.outcome_count),
        ErrorCode::InvalidOutcome
    );

    let current_ts = Clock::get()?.unix_timestamp;

    market.winning_outcome = Some(winning_outcome);
    market.resolved_at = Some(current_ts);
    market.status = MarketStatus::Resolved;

    emit!(MarketResolved {
        market: market.key(),
        winning_outcome,
        nonce,
        resolved_at: current_ts,
    });

    Ok(())
}
