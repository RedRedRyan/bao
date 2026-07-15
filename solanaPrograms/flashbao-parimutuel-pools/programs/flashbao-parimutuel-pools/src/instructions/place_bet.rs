use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::{
    constants::{BET_SEED, CONFIG_SEED, MARKET_SEED, VAULT_SEED},
    error::ErrorCode,
    state::{Bet, Config, Market},
    utils::{assert_market_open, assert_protocol_active},
};

/// Accounts required to place a bet on a parimutuel market.
#[derive(Accounts)]
#[instruction(amount: u64, outcome: u16)]
pub struct PlaceBet<'info> {
    /// The user placing the bet. They must sign to authorize the SOL transfer.
    #[account(mut)]
    pub bettor: Signer<'info>,

    /// Singleton protocol configuration PDA.
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The market being bet on.
    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// The new bet PDA representing this user's position on the specific outcome.
    #[account(
        init,
        payer = bettor,
        space = 8 + Bet::INIT_SPACE,
        seeds = [BET_SEED, market.key().as_ref(), bettor.key().as_ref(), outcome.to_le_bytes().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    /// The market's SOL vault PDA that will hold the funds.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// System program used for creating the bet account and transferring SOL.
    pub system_program: Program<'info, System>,
}

/// Event emitted after a successful bet placement.
#[event]
pub struct BetPlaced {
    /// The market address.
    pub market: Pubkey,
    /// The user who placed the bet.
    pub bettor: Pubkey,
    /// The specific bet PDA.
    pub bet: Pubkey,
    /// The chosen outcome index.
    pub outcome: u16,
    /// The amount wagered in lamports.
    pub amount: u64,
    /// The new total pool for this specific outcome.
    pub new_outcome_total: u64,
    /// The new total pool for the entire market.
    pub new_market_total: u64,
}

/// Places a bet on a specific outcome in a generic parimutuel market.
pub fn handle_place_bet(
    ctx: Context<PlaceBet>,
    amount: u64,
    outcome: u16,
) -> Result<()> {
    assert_protocol_active(ctx.accounts.config.paused)?;
    assert_market_open(&ctx.accounts.market.status)?;

    require!(amount > 0, ErrorCode::InvalidBetAmount);
    require!(
        usize::from(outcome) < usize::from(ctx.accounts.market.outcome_count),
        ErrorCode::InvalidOutcome
    );

    let bet = &mut ctx.accounts.bet;
    bet.market = ctx.accounts.market.key();
    bet.bettor = ctx.accounts.bettor.key();
    bet.outcome = outcome;
    bet.amount = amount;
    bet.bump = ctx.bumps.bet;

    let market = &mut ctx.accounts.market;
    market.total_pool = market
        .total_pool
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    
    market.outcome_totals[usize::from(outcome)] = market.outcome_totals[usize::from(outcome)]
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.key(),
        Transfer {
            from: ctx.accounts.bettor.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    transfer(cpi_context, amount)?;

    emit!(BetPlaced {
        market: market.key(),
        bettor: bet.bettor,
        bet: bet.key(),
        outcome,
        amount,
        new_outcome_total: market.outcome_totals[usize::from(outcome)],
        new_market_total: market.total_pool,
    });

    Ok(())
}
