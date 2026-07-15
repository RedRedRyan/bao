pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("251CWh7GNsFWcqnCPw55R6A4LdSQ6qnD94Jkczr6JxAQ");

#[program]
pub mod flashbao_parimutuel_pools {
    use super::*;

    /// Initializes the singleton protocol configuration PDA.
    pub fn initialize(
        ctx: Context<Initialize>,
        admin: Pubkey,
        fee_receiver: Pubkey,
        oracle_authority: Pubkey,
        default_fee_bps: u16,
    ) -> Result<()> {
        crate::instructions::initialize::handle_initialize(
            ctx,
            admin,
            fee_receiver,
            oracle_authority,
            default_fee_bps,
        )
    }

    /// Creates a generic parimutuel market and its SOL vault PDA.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: [u8; 32],
        metadata_uri: String,
        metadata_hash: [u8; 32],
        outcome_count: u16,
        fee_bps: u16,
        oracle_authority: Pubkey,
        timeout_ts: i64,
    ) -> Result<()> {
        crate::instructions::create_market::handle_create_market(
            ctx,
            market_id,
            metadata_uri,
            metadata_hash,
            outcome_count,
            fee_bps,
            oracle_authority,
            timeout_ts,
        )
    }

    /// Places a bet on a specific outcome in a generic parimutuel market.
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        outcome: u16,
    ) -> Result<()> {
        crate::instructions::place_bet::handle_place_bet(ctx, amount, outcome)
    }

    /// Locks a parimutuel market to prevent further betting.
    pub fn lock_market(ctx: Context<LockMarket>) -> Result<()> {
        crate::instructions::lock_market::handle_lock_market(ctx)
    }

    /// Resolves a parimutuel market via oracle signature.
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: u16,
        nonce: u64,
        timestamp: i64,
    ) -> Result<()> {
        crate::instructions::resolve_market::handle_resolve_market(
            ctx,
            winning_outcome,
            nonce,
            timestamp,
        )
    }

    /// Claims a winning bet and closes the bet account.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        crate::instructions::claim::handle_claim(ctx)
    }

    /// Refunds a bet if the market has timed out and failed to resolve.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        crate::instructions::refund::handle_refund(ctx)
    }

    /// Admin sweeps unclaimed funds from a stale market vault and closes the market accounts.
    pub fn sweep(ctx: Context<Sweep>) -> Result<()> {
        crate::instructions::sweep::handle_sweep(ctx)
    }
}
