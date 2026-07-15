use anchor_lang::prelude::*;

use crate::{
    constants::{CONFIG_SEED, MARKET_SEED},
    error::ErrorCode,
    state::{Config, Market, MarketStatus},
    utils::{assert_market_open, assert_protocol_active},
};

/// Accounts required to lock a parimutuel market.
#[derive(Accounts)]
pub struct LockMarket<'info> {
    /// The oracle authority authorized to lock the market.
    #[account(mut)]
    pub oracle_authority: Signer<'info>,

    /// Singleton protocol configuration PDA.
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The market being locked.
    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.as_ref()],
        bump = market.bump,
        has_one = oracle_authority @ ErrorCode::Unauthorized
    )]
    pub market: Account<'info, Market>,
}

/// Event emitted after a market is locked.
#[event]
pub struct MarketLocked {
    /// The market address.
    pub market: Pubkey,
    /// The oracle authority that locked the market.
    pub oracle_authority: Pubkey,
}

/// Locks a generic parimutuel market to prevent further betting.
pub fn handle_lock_market(ctx: Context<LockMarket>) -> Result<()> {
    assert_protocol_active(ctx.accounts.config.paused)?;
    assert_market_open(&ctx.accounts.market.status)?;

    let market = &mut ctx.accounts.market;
    market.status = MarketStatus::Locked;

    emit!(MarketLocked {
        market: market.key(),
        oracle_authority: ctx.accounts.oracle_authority.key(),
    });

    Ok(())
}
