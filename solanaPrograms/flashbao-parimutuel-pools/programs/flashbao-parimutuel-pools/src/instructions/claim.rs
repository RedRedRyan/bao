use anchor_lang::prelude::*;

use crate::{
    constants::{BET_SEED, CONFIG_SEED, MARKET_SEED, VAULT_SEED},
    error::ErrorCode,
    state::{Bet, Config, Market},
    utils::{assert_market_resolved, assert_protocol_active, calculate_fee, calculate_payout, transfer_from_vault},
};

/// Accounts required to claim a winning bet.
#[derive(Accounts)]
pub struct Claim<'info> {
    /// The user claiming their winning bet.
    #[account(mut)]
    pub bettor: Signer<'info>,

    /// Singleton protocol configuration PDA.
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The resolved market the bet was placed on.
    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// The winning bet PDA to be closed and claimed.
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

    /// The protocol fee receiver.
    /// CHECK: Validated by the config PDA.
    #[account(mut, address = config.fee_receiver)]
    pub fee_receiver: UncheckedAccount<'info>,

    /// System program used for transferring SOL.
    pub system_program: Program<'info, System>,
}

/// Event emitted after a winning bet is claimed.
#[event]
pub struct BetClaimed {
    /// The market address.
    pub market: Pubkey,
    /// The bet PDA address.
    pub bet: Pubkey,
    /// The bettor address.
    pub bettor: Pubkey,
    /// The reward amount transferred to the bettor.
    pub reward: u64,
    /// The fee amount transferred to the protocol.
    pub fee: u64,
}

/// Claims the payout for a winning bet and closes the bet account.
pub fn handle_claim(ctx: Context<Claim>) -> Result<()> {
    assert_protocol_active(ctx.accounts.config.paused)?;
    assert_market_resolved(&ctx.accounts.market.status)?;

    let market = &ctx.accounts.market;
    let bet = &ctx.accounts.bet;

    require!(
        market.winning_outcome == Some(bet.outcome),
        ErrorCode::LosingBet
    );

    let payout = calculate_payout(
        bet.amount,
        market.outcome_totals[usize::from(bet.outcome)],
        market.total_pool,
    )?;

    let fee = calculate_fee(payout, market.fee_bps)?;
    let reward = payout.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;

    // Transfer reward to the bettor
    if reward > 0 {
        transfer_from_vault(
            &ctx.accounts.system_program.to_account_info(),
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.bettor.to_account_info(),
            reward,
            &market.key(),
            market.vault_bump,
        )?;
    }

    // Transfer fee to the protocol fee receiver
    if fee > 0 {
        transfer_from_vault(
            &ctx.accounts.system_program.to_account_info(),
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.fee_receiver.to_account_info(),
            fee,
            &market.key(),
            market.vault_bump,
        )?;
    }

    emit!(BetClaimed {
        market: market.key(),
        bet: bet.key(),
        bettor: bet.bettor,
        reward,
        fee,
    });

    Ok(())
}
