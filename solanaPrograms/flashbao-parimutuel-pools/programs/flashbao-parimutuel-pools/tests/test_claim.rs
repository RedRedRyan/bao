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
fn test_claim() {
    let program_id = flashbao_parimutuel_pools::id();
    let payer = Keypair::new();
    let bettor = Keypair::new();
    let fee_receiver = Keypair::new().pubkey();
    let config_oracle_authority = Keypair::new().pubkey();
    let market_oracle_authority = Keypair::new();
    let default_fee_bps = 250;
    let market_fee_bps = 300; // 3%
    let outcome_count = 3;
    let market_id = [13_u8; 32];
    let metadata_uri = String::from("https://metadata.flashbao.example/markets/13.json");
    let metadata_hash = [14_u8; 32];
    let timeout_ts = 2_000_000_000;
    
    let bet_amount: u64 = 5_000_000_000; // 5 SOL
    let outcome: u16 = 1;

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
    svm.airdrop(&bettor.pubkey(), 10_000_000_000).unwrap();

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

    // 4. Lock Market
    let lock_market_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::LockMarket {}.data(),
        flashbao_parimutuel_pools::accounts::LockMarket {
            oracle_authority: market_oracle_authority.pubkey(),
            config,
            market,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[lock_market_ix], Some(&market_oracle_authority.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&market_oracle_authority]).unwrap();
    svm.send_transaction(tx).unwrap();

    // 5. Resolve Market
    let nonce: u64 = 12345;
    let timestamp: i64 = 1_600_000_000;
    let resolve_market_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::ResolveMarket {
            winning_outcome: outcome,
            nonce,
            timestamp,
        }.data(),
        flashbao_parimutuel_pools::accounts::ResolveMarket {
            oracle_authority: market_oracle_authority.pubkey(),
            config,
            market,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[resolve_market_ix], Some(&market_oracle_authority.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&market_oracle_authority]).unwrap();
    svm.send_transaction(tx).unwrap();

    // 6. Claim Bet
    let fee_receiver_balance_before = svm.get_account(&fee_receiver).map(|a| a.lamports).unwrap_or(0);

    let claim_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::Claim {}.data(),
        flashbao_parimutuel_pools::accounts::Claim {
            bettor: bettor.pubkey(),
            config,
            market,
            bet,
            vault,
            fee_receiver,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[claim_ix], Some(&bettor.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&bettor]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    // 7. Verify Balances
    let expected_payout = bet_amount;
    let expected_fee = (expected_payout as u128 * market_fee_bps as u128 / 10000) as u64;

    let fee_receiver_balance_after = svm.get_account(&fee_receiver).unwrap().lamports;
    assert_eq!(fee_receiver_balance_after, fee_receiver_balance_before + expected_fee);
    
    // Ensure bet account is closed
    let bet_account_after = svm.get_account(&bet);
    assert!(bet_account_after.is_none());
}
