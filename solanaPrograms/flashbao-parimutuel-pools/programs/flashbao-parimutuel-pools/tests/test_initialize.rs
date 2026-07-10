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
fn test_initialize() {
    let program_id = flashbao_parimutuel_pools::id();
    let payer = Keypair::new();
    let config = Pubkey::find_program_address(
        &[flashbao_parimutuel_pools::constants::CONFIG_SEED],
        &program_id,
    )
    .0;
    let admin = payer.pubkey();
    let fee_receiver = Keypair::new().pubkey();
    let oracle_authority = Keypair::new().pubkey();
    let default_fee_bps = 250;

    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/flashbao_parimutuel_pools.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let instruction = Instruction::new_with_bytes(
        program_id,
        &flashbao_parimutuel_pools::instruction::Initialize {
            admin,
            fee_receiver,
            oracle_authority,
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
    let msg = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    let config_account = svm.get_account(&config).unwrap();
    let mut data: &[u8] = &config_account.data;
    let config_state =
        flashbao_parimutuel_pools::state::Config::try_deserialize(&mut data).unwrap();
    assert_eq!(config_state.admin, admin);
    assert_eq!(config_state.fee_receiver, fee_receiver);
    assert_eq!(config_state.oracle_authority, oracle_authority);
    assert_eq!(config_state.default_fee_bps, default_fee_bps);
    assert!(!config_state.paused);
}
