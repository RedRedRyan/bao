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
fn test_create_market() {
    let program_id = flashbao_parimutuel_pools::id();
    let payer = Keypair::new();
    let fee_receiver = Keypair::new().pubkey();
    let config_oracle_authority = Keypair::new().pubkey();
    let market_oracle_authority = Keypair::new().pubkey();
    let default_fee_bps = 250;
    let market_fee_bps = 300;
    let outcome_count = 3;
    let market_id = [7_u8; 32];
    let metadata_uri = String::from("https://metadata.flashbao.example/markets/7.json");
    let metadata_hash = [9_u8; 32];
    let timeout_ts = 2_000_000_000;

    let config = Pubkey::find_program_address(
        &[flashbao_parimutuel_pools::constants::CONFIG_SEED],
        &program_id,
    )
    .0;
    let market = Pubkey::find_program_address(
        &[
            flashbao_parimutuel_pools::constants::MARKET_SEED,
            market_id.as_ref(),
        ],
        &program_id,
    )
    .0;
    let vault = Pubkey::find_program_address(
        &[
            flashbao_parimutuel_pools::constants::VAULT_SEED,
            market.as_ref(),
        ],
        &program_id,
    )
    .0;

    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/flashbao_parimutuel_pools.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let initialize_instruction = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::Initialize {
            admin: payer.pubkey(),
            fee_receiver,
            oracle_authority: config_oracle_authority,
            default_fee_bps,
        }
        .data(),
        flashbao_parimutuel_pools::accounts::Initialize {
            payer: payer.pubkey(),
            config,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let msg =
        Message::new_with_blockhash(&[initialize_instruction], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    let create_market_instruction = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::CreateMarket {
            market_id,
            metadata_uri: metadata_uri.clone(),
            metadata_hash,
            outcome_count,
            fee_bps: market_fee_bps,
            oracle_authority: market_oracle_authority,
            timeout_ts,
        }
        .data(),
        flashbao_parimutuel_pools::accounts::CreateMarket {
            payer: payer.pubkey(),
            config,
            market,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(
        &[create_market_instruction],
        Some(&payer.pubkey()),
        &blockhash,
    );
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    let market_account = svm.get_account(&market).unwrap();
    let mut data: &[u8] = &market_account.data;
    let market_state =
        flashbao_parimutuel_pools::state::Market::try_deserialize(&mut data).unwrap();
    assert_eq!(market_state.market_id, market_id);
    assert_eq!(market_state.creator, payer.pubkey());
    assert_eq!(market_state.config, config);
    assert_eq!(market_state.vault, vault);
    assert_eq!(market_state.oracle_authority, market_oracle_authority);
    assert_eq!(
        market_state.status,
        flashbao_parimutuel_pools::state::MarketStatus::Open
    );
    assert_eq!(market_state.outcome_count, outcome_count);
    assert_eq!(market_state.fee_bps, market_fee_bps);
    assert_eq!(market_state.total_pool, 0);
    assert_eq!(market_state.outcome_totals, vec![0, 0, 0]);
    assert_eq!(market_state.winning_outcome, None);
    assert_eq!(market_state.timeout_ts, timeout_ts);
    assert_eq!(market_state.resolved_at, None);
    assert_eq!(market_state.metadata_uri, metadata_uri);
    assert_eq!(market_state.metadata_hash, metadata_hash);

    let vault_account = svm.get_account(&vault).unwrap();
    assert_eq!(vault_account.owner, system_program::ID);
    assert_eq!(vault_account.data.len(), 0);
}
