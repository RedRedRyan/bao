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

/// Validates that a market is in the Locked state.
pub fn assert_market_locked(status: &MarketStatus) -> Result<()> {
    require!(*status == MarketStatus::Locked, ErrorCode::MarketNotLocked);
    Ok(())
}



/// Validates that a market is in the Resolved state.
pub fn assert_market_resolved(status: &MarketStatus) -> Result<()> {
    require!(*status == MarketStatus::Resolved, ErrorCode::MarketNotResolved);
    Ok(())
}

/// Validates that a market has not yet been resolved.
pub fn assert_market_not_resolved(status: &MarketStatus) -> Result<()> {
    require!(*status != MarketStatus::Resolved, ErrorCode::MarketAlreadyResolved);
    Ok(())
}

/// Validates that the current timestamp is strictly after the market's timeout.
pub fn assert_timeout_passed(current_ts: i64, timeout_ts: i64) -> Result<()> {
    require!(current_ts > timeout_ts, ErrorCode::TimeoutNotPassed);
    Ok(())
}

/// Calculates the payout for a winning bet.
pub fn calculate_payout(bet_amount: u64, outcome_total: u64, total_pool: u64) -> Result<u64> {
    if outcome_total == 0 {
        return Ok(0);
    }
    let payout = bet_amount
        .checked_mul(total_pool)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(outcome_total)
        .ok_or(ErrorCode::MathOverflow)?;
    Ok(payout)
}

/// Calculates the protocol fee from a given payout.
pub fn calculate_fee(payout: u64, fee_bps: u16) -> Result<u64> {
    let fee = payout
        .checked_mul(u64::from(fee_bps))
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;
    Ok(fee)
}

/// Transfers SOL from the market vault PDA using system program CPI.
pub fn transfer_from_vault<'info>(
    system_program: &AccountInfo<'info>,
    vault: &AccountInfo<'info>,
    destination: &AccountInfo<'info>,
    amount: u64,
    market_key: &Pubkey,
    vault_bump: u8,
) -> Result<()> {
    let seeds = &[
        crate::constants::VAULT_SEED,
        market_key.as_ref(),
        &[vault_bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_context = CpiContext::new_with_signer(
        system_program.key(),
        anchor_lang::system_program::Transfer {
            from: vault.clone(),
            to: destination.clone(),
        },
        signer,
    );
    anchor_lang::system_program::transfer(cpi_context, amount)
}
