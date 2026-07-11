use anchor_lang::prelude::*;

use crate::{
    constants::{MAX_FEE_BPS, MAX_METADATA_URI_LEN, MAX_OUTCOMES},
    error::ErrorCode,
    state::MarketStatus,
};

/// Validates that the protocol is not paused.
pub fn assert_protocol_active(paused: bool) -> Result<()> {
    require!(!paused, ErrorCode::ProtocolPaused);
    Ok(())
}

/// Validates a fee value expressed in basis points.
pub fn validate_fee_bps(fee_bps: u16) -> Result<()> {
    require!(fee_bps <= MAX_FEE_BPS, ErrorCode::InvalidFeeBps);
    Ok(())
}

/// Validates the number of outcomes supported by a market.
pub fn validate_outcome_count(outcome_count: u16) -> Result<()> {
    let outcome_count = usize::from(outcome_count);
    require!(outcome_count > 1, ErrorCode::InvalidOutcomeCount);
    require!(
        outcome_count <= MAX_OUTCOMES,
        ErrorCode::InvalidOutcomeCount
    );
    Ok(())
}

/// Validates an off-chain metadata URI before it is stored on-chain.
pub fn validate_metadata_uri(metadata_uri: &str) -> Result<()> {
    require!(!metadata_uri.is_empty(), ErrorCode::InvalidMetadataUri);
    require!(
        metadata_uri.len() <= MAX_METADATA_URI_LEN,
        ErrorCode::InvalidMetadataUri
    );
    Ok(())
}

/// Validates that a timeout is strictly after the current unix timestamp.
pub fn validate_future_timeout(timeout_ts: i64, current_ts: i64) -> Result<()> {
    require!(timeout_ts > current_ts, ErrorCode::InvalidTimeout);
    Ok(())
}

/// Validates that a market is in the Open state.
pub fn assert_market_open(status: &MarketStatus) -> Result<()> {
    require!(*status == MarketStatus::Open, ErrorCode::MarketNotOpen);
    Ok(())
}
