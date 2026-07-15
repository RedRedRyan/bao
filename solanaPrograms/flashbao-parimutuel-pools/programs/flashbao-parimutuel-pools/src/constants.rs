use anchor_lang::prelude::*;

/// Seed used to derive the singleton protocol configuration PDA.
#[constant]
pub const CONFIG_SEED: &[u8] = b"config";

/// Seed prefix used to derive market PDAs.
#[constant]
pub const MARKET_SEED: &[u8] = b"market";

/// Seed prefix used to derive SOL vault PDAs for markets.
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

/// Maximum fee accepted by the protocol, expressed in basis points.
#[constant]
pub const MAX_FEE_BPS: u16 = 10_000;

/// Maximum number of outcomes supported by a single market.
pub const MAX_OUTCOMES: usize = 20;

/// Maximum byte length for an off-chain metadata URI.
pub const MAX_METADATA_URI_LEN: usize = 200;

/// Seed prefix used to derive Bet PDAs.
#[constant]
pub const BET_SEED: &[u8] = b"bet";
