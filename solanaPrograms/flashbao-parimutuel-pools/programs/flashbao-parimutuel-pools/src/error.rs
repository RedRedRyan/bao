use anchor_lang::prelude::*;

/// Program errors returned by the FlashBao parimutuel pools protocol.
#[error_code]
pub enum ErrorCode {
    /// The signer is not authorized to perform the requested action.
    #[msg("Signer is not authorized to perform this action")]
    Unauthorized,

    /// The configured protocol fee exceeds the maximum basis-point value.
    #[msg("Fee basis points must be less than or equal to 10,000")]
    InvalidFeeBps,

    /// A required authority address was the default all-zero public key.
    #[msg("Authority public keys must not be the default public key")]
    InvalidAuthority,

    /// The protocol is paused and cannot accept the requested instruction.
    #[msg("Protocol is paused")]
    ProtocolPaused,

    /// The requested number of outcomes is outside the supported range.
    #[msg("Market outcome count must be greater than one and within the configured maximum")]
    InvalidOutcomeCount,

    /// The metadata URI is empty or exceeds the maximum supported byte length.
    #[msg("Metadata URI is empty or too long")]
    InvalidMetadataUri,

    /// The market timeout must be in the future.
    #[msg("Market timeout must be in the future")]
    InvalidTimeout,
}
