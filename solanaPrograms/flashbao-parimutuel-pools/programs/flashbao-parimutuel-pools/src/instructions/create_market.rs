use anchor_lang::prelude::*;

use crate::{
    constants::{CONFIG_SEED, MARKET_SEED, VAULT_SEED},
    error::ErrorCode,
    state::{Config, Market, MarketStatus},
    utils::{
        assert_protocol_active, validate_fee_bps, validate_future_timeout, validate_metadata_uri,
        validate_outcome_count,
    },
};

/// Accounts required to create a generic parimutuel market.
#[derive(Accounts)]
#[instruction(market_id: [u8; 32])]
pub struct CreateMarket<'info> {
    /// Payer funding rent for the market and vault accounts.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Singleton protocol configuration PDA.
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// Newly created generic market PDA.
    #[account(
        init,
        payer = payer,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, market_id.as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// CHECK: This zero-data PDA is initialized by this instruction with deterministic vault seeds,
    /// owned by the system program, and used only as a SOL custody account.
    #[account(
        init,
        payer = payer,
        space = 0,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump,
        owner = system_program.key()
    )]
    pub vault: UncheckedAccount<'info>,

    /// System program used to create the market and vault accounts.
    pub system_program: Program<'info, System>,
}

/// Event emitted after a market is created.
#[event]
pub struct MarketCreated {
    /// Newly created market account address.
    pub market: Pubkey,
    /// Caller-provided market identifier.
    pub market_id: [u8; 32],
    /// Market creator that funded account rent.
    pub creator: Pubkey,
    /// SOL vault PDA for this market.
    pub vault: Pubkey,
    /// Oracle authority expected to resolve this market.
    pub oracle_authority: Pubkey,
    /// Number of outcomes available in this market.
    pub outcome_count: u16,
    /// Fee charged on payout, expressed in basis points.
    pub fee_bps: u16,
    /// Unix timestamp after which unresolved markets may become refundable.
    pub timeout_ts: i64,
    /// Hash of the off-chain metadata document.
    pub metadata_hash: [u8; 32],
    /// PDA bump for the market account.
    pub market_bump: u8,
    /// PDA bump for the vault account.
    pub vault_bump: u8,
}

/// Creates a reusable generic parimutuel market without accepting any bets.
pub fn handle_create_market(
    ctx: Context<CreateMarket>,
    market_id: [u8; 32],
    metadata_uri: String,
    metadata_hash: [u8; 32],
    outcome_count: u16,
    fee_bps: u16,
    oracle_authority: Pubkey,
    timeout_ts: i64,
) -> Result<()> {
    let current_ts = Clock::get()?.unix_timestamp;

    assert_protocol_active(ctx.accounts.config.paused)?;
    validate_outcome_count(outcome_count)?;
    validate_fee_bps(fee_bps)?;
    validate_metadata_uri(&metadata_uri)?;
    validate_future_timeout(timeout_ts, current_ts)?;
    require!(
        oracle_authority != Pubkey::default(),
        ErrorCode::InvalidAuthority
    );

    let market = &mut ctx.accounts.market;
    market.market_id = market_id;
    market.creator = ctx.accounts.payer.key();
    market.config = ctx.accounts.config.key();
    market.vault = ctx.accounts.vault.key();
    market.oracle_authority = oracle_authority;
    market.status = MarketStatus::Open;
    market.outcome_count = outcome_count;
    market.fee_bps = fee_bps;
    market.total_pool = 0;
    market.outcome_totals = vec![0; usize::from(outcome_count)];
    market.winning_outcome = None;
    market.created_at = current_ts;
    market.timeout_ts = timeout_ts;
    market.resolved_at = None;
    market.metadata_uri = metadata_uri;
    market.metadata_hash = metadata_hash;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;

    emit!(MarketCreated {
        market: market.key(),
        market_id,
        creator: market.creator,
        vault: market.vault,
        oracle_authority,
        outcome_count,
        fee_bps,
        timeout_ts,
        metadata_hash,
        market_bump: market.bump,
        vault_bump: market.vault_bump,
    });

    Ok(())
}
