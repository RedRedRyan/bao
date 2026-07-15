import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * WalletService
 *
 * Loads the oracle authority keypair from environment.
 * Every blockchain transaction signed by this backend uses this wallet.
 *
 * Expected env var (one of):
 *   ORACLE_PRIVATE_KEY  – base58-encoded secret key
 *   Falls back to reading oracle.json in the project root (optional).
 */
@Injectable()
export class WalletService implements OnModuleInit {
  private readonly logger = new Logger(WalletService.name);
  private keypair: Keypair;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const privateKeyEnv = this.config.get<string>('ORACLE_PRIVATE_KEY');

    if (privateKeyEnv) {
      const secretKey = bs58.decode(privateKeyEnv);
      this.keypair = Keypair.fromSecretKey(secretKey);
      this.logger.log(
        `Oracle wallet loaded from env. Public key: ${this.keypair.publicKey.toBase58()}`,
      );
      return;
    }

    // Fallback: generate an ephemeral wallet (dev / CI only)
    this.keypair = Keypair.generate();
    this.logger.warn(
      `ORACLE_PRIVATE_KEY not set – using ephemeral keypair: ${this.keypair.publicKey.toBase58()}`,
    );
  }

  getKeypair(): Keypair {
    return this.keypair;
  }

  getPublicKey(): string {
    return this.keypair.publicKey.toBase58();
  }
}
