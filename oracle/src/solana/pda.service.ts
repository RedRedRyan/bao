import { Injectable } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';

/** Seeds used by the FlashBao Solana program */
const SEED_CONFIG = Buffer.from('config');
const SEED_MARKET = Buffer.from('market');
const SEED_VAULT = Buffer.from('vault');
const SEED_BET = Buffer.from('bet');

/**
 * PDAService
 *
 * Pure deterministic helpers – no RPC calls, no async.
 * Derives Program Derived Addresses for the FlashBao parimutuel program.
 */
@Injectable()
export class PdaService {
  /**
   * Derive the singleton protocol Config PDA.
   */
  deriveConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([SEED_CONFIG], programId);
  }

  /**
   * Derive the Market PDA for a given marketId (32-byte Uint8Array).
   */
  deriveMarketPDA(
    marketId: Uint8Array,
    programId: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SEED_MARKET, marketId],
      programId,
    );
  }

  /**
   * Derive the Vault PDA for a given market public key.
   */
  deriveVaultPDA(
    marketPubkey: PublicKey,
    programId: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SEED_VAULT, marketPubkey.toBytes()],
      programId,
    );
  }

  /**
   * Derive the Bet PDA for a bettor, market, and outcome.
   */
  deriveBetPDA(
    marketPubkey: PublicKey,
    bettorPubkey: PublicKey,
    outcome: number,
    programId: PublicKey,
  ): [PublicKey, number] {
    const outcomeBuffer = Buffer.alloc(2);
    outcomeBuffer.writeUInt16LE(outcome, 0);
    return PublicKey.findProgramAddressSync(
      [SEED_BET, marketPubkey.toBytes(), bettorPubkey.toBytes(), outcomeBuffer],
      programId,
    );
  }
}
