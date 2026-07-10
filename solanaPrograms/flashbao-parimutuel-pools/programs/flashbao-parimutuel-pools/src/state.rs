use anchor_lang::prelude::*;

use crate::constants::{MAX_METADATA_URI_LEN, MAX_OUTCOMES};

/// Singleton protocol configuration for FlashBao parimutuel pools.
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Administrative authority allowed to manage protocol-level settings.
    pub admin: Pubkey,
    /// Account that receives protocol fees collected from resolved markets.
    pub fee_receiver: Pubkey,
    /// Authority expected to provide future oracle resolution attestations.
    pub oracle_authority: Pubkey,
    /// Default fee charged by newly created markets, expressed in basis points.
    pub default_fee_bps: u16,
    /// Global pause flag reserved for emergency protocol controls.
    pub paused: bool,
    /// PDA bump for the configuration account.
    pub bump: u8,
}

/// Lifecycle state for a generic parimutuel market.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    /// The market accepts bets.
    Open,
    /// The market no longer accepts bets and awaits oracle resolution.
    Locked,
    /// The market has a verified winning outcome.
    Resolved,
    /// The market is unavailable for payouts and can be refunded.
    Voided,
}

/// Generic reusable market account for all parimutuel market types.
#[account]
#[derive(InitSpace)]
pub struct Market {
    /// External caller-provided market identifier used in PDA seeds.
    pub market_id: [u8; 32],
    /// Market creator that paid rent for the account.
    pub creator: Pubkey,
    /// Protocol configuration account used when the market was created.
    pub config: Pubkey,
    /// SOL vault PDA that will custody bets for this market.
    pub vault: Pubkey,
    /// Oracle authority expected to resolve this market.
    pub oracle_authority: Pubkey,
    /// Current lifecycle state.
    pub status: MarketStatus,
    /// Number of generic outcomes supported by this market.
    pub outcome_count: u16,
    /// Fee charged on payout, expressed in basis points.
    pub fee_bps: u16,
    /// Total pooled stake across every outcome.
    pub total_pool: u64,
    /// Pooled stake per outcome index.
    #[max_len(MAX_OUTCOMES)]
    pub outcome_totals: Vec<u64>,
    /// Winning outcome index after resolution.
    pub winning_outcome: Option<u16>,
    /// Unix timestamp when the market was created.
    pub created_at: i64,
    /// Unix timestamp after which unresolved markets may become refundable.
    pub timeout_ts: i64,
    /// Unix timestamp when the market was resolved.
    pub resolved_at: Option<i64>,
    /// Off-chain metadata URI.
    #[max_len(MAX_METADATA_URI_LEN)]
    pub metadata_uri: String,
    /// Hash of the off-chain metadata document.
    pub metadata_hash: [u8; 32],
    /// PDA bump for the market account.
    pub bump: u8,
    /// PDA bump for the market SOL vault account.
    pub vault_bump: u8,
}
