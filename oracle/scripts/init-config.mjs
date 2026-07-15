/**
 * init-config.mjs
 *
 * One-shot script to initialize the FlashBao protocol Config PDA on Solana.
 *
 * 
 * Will fail gracefully if the config account already exists.
 *
 * Usage:
 *   node scripts/init-config.mjs
 *
 * Env vars read from .env:
 *   ORACLE_PRIVATE_KEY  – base58-encoded oracle keypair secret
 *   SOLANA_RPC_URL      – optional, defaults to devnet
 *   FEE_RECEIVER        – required pubkey for fees
 *   DEFAULT_FEE_BPS     – optional, defaults to 200 (2%)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

try {
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn('Could not load .env file – relying on shell environment');
}

// ── Validate required env ─────────────────────────────────────────────────────
const privateKeyB58 = process.env.ORACLE_PRIVATE_KEY;
if (!privateKeyB58) {
  console.error('❌  ORACLE_PRIVATE_KEY is not set in .env');
  process.exit(1);
}

// ── Decode wallet ─────────────────────────────────────────────────────────────
// bs58 v6 is ESM-only, use the CJS build directly
import bs58 from 'bs58';
const secretKey = bs58.decode(privateKeyB58);
const oracleKeypair = Keypair.fromSecretKey(secretKey);
const oraclePubkey = oracleKeypair.publicKey;

console.log('Oracle wallet:', oraclePubkey.toBase58());

// ── RPC connection ────────────────────────────────────────────────────────────
const rpcUrl = process.env.SOLANA_RPC_URL ?? clusterApiUrl('devnet');
console.log('Connecting to:', rpcUrl);
const connection = new Connection(rpcUrl, 'confirmed');

// ── Load IDL ──────────────────────────────────────────────────────────────────
const idlPath = resolve(__dirname, '../idl/flashBaoIdl.json');
const idl = JSON.parse(readFileSync(idlPath, 'utf8'));
const programId = new PublicKey(idl.address ?? idl.metadata?.address);
console.log('Program ID:', programId.toBase58());

// ── Anchor provider ───────────────────────────────────────────────────────────
// Dynamic import of NodeWallet (CJS export from anchor)
const { default: anchor } = await import('@coral-xyz/anchor');
const NodeWallet = anchor.Wallet ?? anchor.default?.Wallet;
const wallet = new NodeWallet(oracleKeypair);
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
setProvider(provider);

const program = new Program(idl, provider);

// ── Derive Config PDA ─────────────────────────────────────────────────────────
const [configPda, configBump] = PublicKey.findProgramAddressSync(
  [Buffer.from('config')],
  programId,
);
console.log(' Config PDA:', configPda.toBase58(), '(bump:', configBump + ')');

// ── Check if already initialized ─────────────────────────────────────────────
const existing = await connection.getAccountInfo(configPda);
if (existing) {
  console.log('Config PDA already exists – nothing to do.');
  console.log('    Owner:', existing.owner.toBase58());
  console.log('    Lamports:', existing.lamports);
  process.exit(0);
}

// ── Args ──────────────────────────────────────────────────────────────────────
const adminPubkey = oraclePubkey; // admin = oracle wallet
const feeReceiverEnv = process.env.FEE_RECEIVER;
if (!feeReceiverEnv) {
  console.error('❌  FEE_RECEIVER is not set in .env');
  process.exit(1);
}
const feeReceiverPubkey = new PublicKey(feeReceiverEnv);
const oracleAuthorityPubkey = oraclePubkey; // oracle authority = oracle wallet
const defaultFeeBps = parseInt(process.env.DEFAULT_FEE_BPS ?? '200', 10); // 2% default

console.log('\n📋  Initialization parameters:');
console.log('    admin:            ', adminPubkey.toBase58());
console.log('    fee_receiver:     ', feeReceiverPubkey.toBase58());
console.log('    oracle_authority: ', oracleAuthorityPubkey.toBase58());
console.log('    default_fee_bps:  ', defaultFeeBps, `(${defaultFeeBps / 100}%)`);

// ── Send transaction ──────────────────────────────────────────────────────────
console.log('\n🚀  Sending initialize transaction...');

try {
  const sig = await program.methods
    .initialize(
      adminPubkey,
      feeReceiverPubkey,
      oracleAuthorityPubkey,
      defaultFeeBps,
    )
    .accounts({
      payer:         oracleKeypair.publicKey,
      config:        configPda,
    })
    .signers([oracleKeypair])
    .rpc();

  console.log('\n✅  Config PDA initialized successfully!');
  console.log('    Transaction:', sig);
  console.log('    Explorer:   https://explorer.solana.com/tx/' + sig + '?cluster=devnet');
  console.log('    Config PDA: https://explorer.solana.com/address/' + configPda.toBase58() + '?cluster=devnet');

} catch (err) {
  // If already initialized, Anchor throws a custom error – catch it gracefully
  if (err?.message?.includes('already in use') || err?.message?.includes('already been processed')) {
    console.log('⚠️  Account already exists on-chain (race condition). Config is ready.');
    process.exit(0);
  }
  console.error('\n❌  Transaction failed:', err?.message ?? err);
  if (err?.logs) {
    console.error('\nProgram logs:');
    err.logs.forEach(l => console.error('   ', l));
  }
  process.exit(1);
}
