import * as anchor from "@coral-xyz/anchor";
import type { Txoracle } from "./types/txoracle.js"; // Use the matching mainnet/devnet type
import txoracleIdl from "./idl/txoracle.json" with { type: "json" }; // Use the matching mainnet/devnet IDL

//import txoracleIdl from "./idl/txoracledevnet.partial.json" with { type: "json" };
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import axios from "axios";
import bs58 from "bs58";
import dotenv from "dotenv";
import nacl from "tweetnacl";

dotenv.config();

const NETWORK = "mainnet";

const CONFIG = {
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const;

const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];
const apiBaseUrl = `${apiOrigin}/api`;

const PRIVATE_KEY = process.env.PHANTOM_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("PHANTOM_PRIVATE_KEY not found in .env");
}

let payer: Keypair;

try {
  // Phantom private-key exports are usually base58.
  payer = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
} catch {
  // Solana CLI keypairs are usually JSON number arrays.
  payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(PRIVATE_KEY)));
}

const wallet = new anchor.Wallet(payer);
console.log("Wallet:", payer.publicKey.toBase58());

const connection = new Connection(rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

async function ensureAtaExists({
  ata,
  mint,
  owner,
  payer,
}: {
  ata: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  payer: Keypair;
}) {
  const existingAccount = await connection.getAccountInfo(ata, "confirmed");

  if (existingAccount) {
    console.log("ATA already exists:", ata.toBase58());
    return;
  }

  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    payer.publicKey,
    ata,
    owner,
    mint,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const tx = new Transaction().add(createAtaIx);
  const txSig = await provider.sendAndConfirm(tx, [payer]);
  console.log("Created ATA:", ata.toBase58(), txSig);
}

const program = new anchor.Program(
  txoracleIdl as anchor.Idl,
  provider
);

if (!program.programId.equals(programId)) {
  throw new Error(
    `Loaded IDL program ${program.programId.toBase58()} does not match ${NETWORK} program ${programId.toBase58()}`
  );
}
// Free tier configuration - choose one:
//const SERVICE_LEVEL_ID = 1;  // World Cup & Int Friendlies (60-second delay)
const SERVICE_LEVEL_ID = 12; // Mainnet real-time World Cup & Int Friendlies
const DURATION_WEEKS = 4; // Subscribe for 4 weeks at a time
const SELECTED_LEAGUES: number[] = []; // Empty for standard bundle

const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("token_treasury_v2")],
  program.programId
);

const tokenTreasuryVault = getAssociatedTokenAddressSync(
  txlTokenMint,
  tokenTreasuryPda,
  true,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("pricing_matrix")],
  program.programId
);

const userTokenAccount = getAssociatedTokenAddressSync(
  txlTokenMint,
  provider.wallet.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

await ensureAtaExists({
  ata: userTokenAccount,
  mint: txlTokenMint,
  owner: provider.wallet.publicKey,
  payer,
});

const subscribe = program.methods.subscribe;

if (!subscribe) {
  throw new Error("Partial IDL does not include the subscribe instruction.");
}

// Subscribe on-chain
const txSig = await subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
  .accounts({
    user: provider.wallet.publicKey,
    pricingMatrix: pricingMatrixPda,
    tokenMint: txlTokenMint,
    userTokenAccount,
    tokenTreasuryVault,
    tokenTreasuryPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log("Subscription transaction:", txSig);
// Get guest authentication token
const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
const jwt = authResponse.data.token;

// Create message to sign
const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
const message = new TextEncoder().encode(messageString);

// For SELECTED_LEAGUES = [], this signs `${txSig}::${jwt}`.
async function signActivationMessage(message: Uint8Array): Promise<Uint8Array> {
  return nacl.sign.detached(message, payer.secretKey);
}

const signatureBytes = await signActivationMessage(message);
const walletSignature = Buffer.from(signatureBytes).toString("base64");

// Activate your API access
const activationResponse = await axios.post(
  `${apiBaseUrl}/token/activate`,
  {
    txSig,
    walletSignature,
    leagues: SELECTED_LEAGUES,
  },
  {
    headers: { Authorization: `Bearer ${jwt}` }
  }
);

// Save your API token
const apiToken = activationResponse.data.token || activationResponse.data;
console.log("API Token activated successfully!");
console.log("API Token:", apiToken);
