import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Cluster,
} from '@solana/web3.js';
import { AnchorProvider, Program, Idl, setProvider } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';
import { WalletService } from './wallet.service';
import { PdaService } from './pda.service';

export interface CreateMarketParams {
  marketId: Uint8Array;       // 32-byte unique market ID
  metadataUri: string;        // Off-chain metadata URI
  metadataHash: Uint8Array;   // 32-byte SHA-256 of metadata
  outcomeCount: number;       // Number of outcomes (e.g. 2 for home/away)
  feeBps: number;             // Fee in basis points
  oracleAuthority: PublicKey; // Who can resolve the market
  timeoutTs: bigint;          // Unix timestamp after which market can be refunded
}

export interface ResolveMarketParams {
  marketId: Uint8Array;
  winningOutcome: number;
  nonce: bigint;
  timestamp: bigint;
}

/**
 * ProgramService
 *
 * The single entry point into the FlashBao Anchor program.
 * Nothing outside the Solana module should import Anchor directly.
 */
@Injectable()
export class ProgramService implements OnModuleInit {
  private readonly logger = new Logger(ProgramService.name);

  private connection: Connection;
  private program: Program;
  programId: PublicKey;

  constructor(
    private readonly config: ConfigService,
    private readonly walletService: WalletService,
    private readonly pdaService: PdaService,
  ) {}

  onModuleInit(): void {
    // ── RPC connection ──────────────────────────────────────────────────────
    const rpcUrl =
      this.config.get<string>('SOLANA_RPC_URL') ??
      clusterApiUrl((this.config.get<string>('SOLANA_CLUSTER') ?? 'devnet') as Cluster);

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.logger.log(`Solana connection established → ${rpcUrl}`);

    // ── Load IDL ───────────────────────────────────────────────────────────
    const idlPath = path.resolve(
      process.cwd(),
      this.config.get<string>('IDL_PATH') ?? 'idl/flashBaoIdl.json',
    );

    let idl: Idl;
    try {
      idl = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as Idl;
      this.logger.log(`IDL loaded from ${idlPath}`);
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to load IDL from ${idlPath}: ${(err as Error).message}`,
      );
    }

    // ── Program ID from IDL ────────────────────────────────────────────────
    const idlAny = idl as any;
    const programIdStr: string = idlAny.address ?? idlAny.metadata?.address;
    if (!programIdStr) {
      throw new InternalServerErrorException(
        'IDL does not contain a program address.',
      );
    }
    this.programId = new PublicKey(programIdStr);
    this.logger.log(`Program ID: ${this.programId.toBase58()}`);

    // ── Anchor provider ────────────────────────────────────────────────────
    // In Node.js, Anchor exports NodeWallet as `Wallet` from the main package
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NodeWallet = require('@coral-xyz/anchor').Wallet;
    const wallet = new NodeWallet(this.walletService.getKeypair());
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });
    setProvider(provider);

    this.program = new Program(idl, provider);
    this.logger.log('Anchor program instantiated successfully.');
  }

  // ── Public accessors ───────────────────────────────────────────────────────

  getConnection(): Connection {
    return this.connection;
  }

  getProgram(): Program {
    return this.program;
  }

  // ── Instructions ───────────────────────────────────────────────────────────

  /**
   * Creates a generic parimutuel market on-chain.
   * Returns the transaction signature.
   */
  async createMarket(params: CreateMarketParams): Promise<string> {
    const {
      marketId,
      metadataUri,
      metadataHash,
      outcomeCount,
      feeBps,
      oracleAuthority,
      timeoutTs,
    } = params;

    const [configPda] = this.pdaService.deriveConfigPDA(this.programId);
    const [marketPda] = this.pdaService.deriveMarketPDA(marketId, this.programId);
    const [vaultPda] = this.pdaService.deriveVaultPDA(marketPda, this.programId);

    const sig = await (this.program.methods as any)
      .createMarket(
        Array.from(marketId),
        metadataUri,
        Array.from(metadataHash),
        outcomeCount,
        feeBps,
        oracleAuthority,
        timeoutTs,
      )
      .accounts({
        payer: this.walletService.getKeypair().publicKey,
        config: configPda,
        market: marketPda,
        vault: vaultPda,
      })
      .signers([this.walletService.getKeypair()])
      .rpc();

    this.logger.log(`createMarket tx: ${sig}`);
    return sig;
  }

  /**
   * Locks a market (no more bets accepted).
   */
  async lockMarket(marketId: Uint8Array): Promise<string> {
    const [configPda] = this.pdaService.deriveConfigPDA(this.programId);
    const [marketPda] = this.pdaService.deriveMarketPDA(marketId, this.programId);

    const sig = await (this.program.methods as any)
      .lockMarket()
      .accounts({
        oracleAuthority: this.walletService.getKeypair().publicKey,
        config: configPda,
        market: marketPda,
      })
      .signers([this.walletService.getKeypair()])
      .rpc();

    this.logger.log(`lockMarket tx: ${sig}`);
    return sig;
  }

  /**
   * Resolves a parimutuel market via oracle signature.
   */
  async resolveMarket(params: ResolveMarketParams): Promise<string> {
    const { marketId, winningOutcome, nonce, timestamp } = params;

    const [configPda] = this.pdaService.deriveConfigPDA(this.programId);
    const [marketPda] = this.pdaService.deriveMarketPDA(marketId, this.programId);

    const sig = await (this.program.methods as any)
      .resolveMarket(winningOutcome, nonce, timestamp)
      .accounts({
        oracleAuthority: this.walletService.getKeypair().publicKey,
        config: configPda,
        market: marketPda,
      })
      .signers([this.walletService.getKeypair()])
      .rpc();

    this.logger.log(`resolveMarket tx: ${sig}`);
    return sig;
  }
}
