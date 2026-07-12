use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

#[test]
fn test_refund() {
    let program_id = flashbao_parimutuel_pools::id();
    let payer = Keypair::new();
    let bettor = Keypair::new();
    let fee_receiver = Keypair::new().pubkey();
    let config_oracle_authority = Keypair::new().pubkey();
    let market_oracle_authority = Keypair::new();
    let default_fee_bps = 250;
    let market_fee_bps = 300;
    let outcome_count = 3;
    let market_id = [15_u8; 32];
    let metadata_uri = String::from("https://metadata.flashbao.example/markets/15.json");
    let metadata_hash = [16_u8; 32];
    
    let bet_amount: u64 = 10_000_000_000; // 10 SOL
    let outcome: u16 = 2;

    let config = Pubkey::find_program_address(
        &[flashbao_parimutuel_pools::constants::CONFIG_SEED],
        &program_id,
    ).0;
    let market = Pubkey::find_program_address(
        &[
            flashbao_parimutuel_pools::constants::MARKET_SEED,
            market_id.as_ref(),
        ],
        &program_id,
    ).0;
    let vault = Pubkey::find_program_address(
        &[
            flashbao_parimutuel_pools::constants::VAULT_SEED,
            market.as_ref(),
        ],
        &program_id,
    ).0;
    let bet = Pubkey::find_program_address(
        &[
            flashbao_parimutuel_pools::constants::BET_SEED,
            market.as_ref(),
            bettor.pubkey().as_ref(),
            outcome.to_le_bytes().as_ref(),
        ],
        &program_id,
    ).0;

    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/flashbao_parimutuel_pools.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000_000).unwrap();
    svm.airdrop(&bettor.pubkey(), 20_000_000_000).unwrap();

    // Get current clock to set a valid timeout
    let mut clock = svm.get_sysvar::<anchor_lang::solana_program::clock::Clock>();
    let current_ts = clock.unix_timestamp;
    let timeout_ts = current_ts + 100; // 100 seconds in the future

    // 1. Initialize
    let initialize_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::Initialize {
            admin: payer.pubkey(),
            fee_receiver,
            oracle_authority: config_oracle_authority,
            default_fee_bps,
        }.data(),
        flashbao_parimutuel_pools::accounts::Initialize {
            payer: payer.pubkey(),
            config,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[initialize_ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    svm.send_transaction(tx).unwrap();

    // 2. Create Market
    let create_market_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::CreateMarket {
            market_id,
            metadata_uri,
            metadata_hash,
            outcome_count,
            fee_bps: market_fee_bps,
            oracle_authority: market_oracle_authority.pubkey(),
            timeout_ts,
        }.data(),
        flashbao_parimutuel_pools::accounts::CreateMarket {
            payer: payer.pubkey(),
            config,
            market,
            vault,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[create_market_ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    svm.send_transaction(tx).unwrap();

    // 3. Place Bet
    let bettor_balance_before_bet = svm.get_account(&bettor.pubkey()).unwrap().lamports;
    
    let place_bet_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::PlaceBet { amount: bet_amount, outcome }.data(),
        flashbao_parimutuel_pools::accounts::PlaceBet {
            bettor: bettor.pubkey(),
            config,
            market,
            bet,
            vault,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[place_bet_ix], Some(&bettor.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&bettor]).unwrap();
    svm.send_transaction(tx).unwrap();

    let bet_account_rent = svm.get_account(&bet).unwrap().lamports;
    let bettor_balance_after_bet = svm.get_account(&bettor.pubkey()).unwrap().lamports;

    // 4. Warp Time
    clock.unix_timestamp += 200; // Fast forward past timeout
    svm.set_sysvar(&clock);

    // 5. Refund Bet
    let refund_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::Refund {}.data(),
        flashbao_parimutuel_pools::accounts::Refund {
            bettor: bettor.pubkey(),
            config,
            market,
            bet,
            vault,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[refund_ix], Some(&bettor.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&bettor]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    // 6. Verify Balances and State
    let bettor_balance_after_refund = svm.get_account(&bettor.pubkey()).unwrap().lamports;
    
    // The bettor should have received their bet_amount back, plus the rent from the closed Bet PDA,
    // minus the transaction fee for the refund transaction.
    // So balance_after_refund ≈ balance_after_bet + bet_amount + bet_account_rent
    let expected_refund = bettor_balance_after_bet + bet_amount + bet_account_rent;
    // We allow a small difference due to the refund transaction fee (usually 5000 lamports)
    let diff = expected_refund.abs_diff(bettor_balance_after_refund);
    assert!(diff <= 10000, "Refunded amount does not match expected");

    // Ensure bet account is closed
    let bet_account_after = svm.get_account(&bet);
    assert!(bet_account_after.is_none());

    // Ensure market status is Voided
    let market_account = svm.get_account(&market).unwrap();
    let mut data: &[u8] = &market_account.data;
    let market_state = flashbao_parimutuel_pools::state::Market::try_deserialize(&mut data).unwrap();
    assert_eq!(market_state.status, flashbao_parimutuel_pools::state::MarketStatus::Voided);
}
