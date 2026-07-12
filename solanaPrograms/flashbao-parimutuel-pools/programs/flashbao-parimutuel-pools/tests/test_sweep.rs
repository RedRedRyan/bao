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
fn test_sweep() {
    let program_id = flashbao_parimutuel_pools::id();
    let admin = Keypair::new();
    let bettor = Keypair::new();
    let fee_receiver = Keypair::new().pubkey();
    let config_oracle_authority = Keypair::new().pubkey();
    let market_oracle_authority = Keypair::new();
    let default_fee_bps = 250;
    let market_fee_bps = 300;
    let outcome_count = 3;
    let market_id = [19_u8; 32];
    let metadata_uri = String::from("https://metadata.flashbao.example/markets/19.json");
    let metadata_hash = [20_u8; 32];
    let timeout_ts = 2_000_000_000;
    
    let bet_amount: u64 = 15_000_000_000; // 15 SOL
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
    svm.airdrop(&admin.pubkey(), 1_000_000_000_000).unwrap();
    svm.airdrop(&bettor.pubkey(), 20_000_000_000).unwrap();

    let mut clock = svm.get_sysvar::<anchor_lang::solana_program::clock::Clock>();
    clock.unix_timestamp = 1_000_000_000;
    svm.set_sysvar(&clock);

    // 1. Initialize
    let initialize_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::Initialize {
            admin: admin.pubkey(),
            fee_receiver,
            oracle_authority: config_oracle_authority,
            default_fee_bps,
        }.data(),
        flashbao_parimutuel_pools::accounts::Initialize {
            payer: admin.pubkey(),
            config,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[initialize_ix], Some(&admin.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&admin]).unwrap();
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
            payer: admin.pubkey(),
            config,
            market,
            vault,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[create_market_ix], Some(&admin.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&admin]).unwrap();
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
    let timestamp: i64 = 1_500_000_000;
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

    // Fast-forward past 90 days after resolution
    // 90 days = 7776000 seconds
    clock.unix_timestamp += 7776000 + 10;
    svm.set_sysvar(&clock);

    // 6. Sweep Market
    let vault_balance_before = svm.get_account(&vault).unwrap().lamports;
    let fee_receiver_balance_before = svm.get_account(&fee_receiver).map(|a| a.lamports).unwrap_or(0);
    
    // We also get the rent returned from closing the market account
    let market_account_rent = svm.get_account(&market).unwrap().lamports;
    let admin_balance_before = svm.get_account(&admin.pubkey()).unwrap().lamports;

    let sweep_ix = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::Sweep {}.data(),
        flashbao_parimutuel_pools::accounts::Sweep {
            admin: admin.pubkey(),
            config,
            market,
            vault,
            fee_receiver,
            system_program: system_program::ID,
        }.to_account_metas(None),
    );
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[sweep_ix], Some(&admin.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&admin]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    // 7. Verify Balances and State
    let fee_receiver_balance_after = svm.get_account(&fee_receiver).unwrap().lamports;
    let admin_balance_after = svm.get_account(&admin.pubkey()).unwrap().lamports;

    // Fee receiver should have received the entire vault balance
    assert_eq!(fee_receiver_balance_after, fee_receiver_balance_before + vault_balance_before);
    
    // Admin should have received the market account rent (minus tx fee)
    // tx fee is 5000 lamports
    assert_eq!(admin_balance_after, admin_balance_before + market_account_rent - 5000);

    // Ensure market account is closed
    let market_account_after = svm.get_account(&market);
    assert!(market_account_after.is_none());

    // Ensure vault account is closed (since it has 0 lamports)
    let vault_account_after = svm.get_account(&vault);
    assert!(vault_account_after.is_none());
}
