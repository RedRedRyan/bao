import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';
import { Market, MarketDocument, MarketStatus, MarketType } from './schemas/market.schema';
import { CreateMarketDto } from './dto/create-market.dto';
import { ProgramService } from '../solana/program.service';
import { WalletService } from '../solana/wallet.service';

@Injectable()
export class MarketsService {
  private readonly logger = new Logger(MarketsService.name);

  constructor(
    @InjectModel(Market.name)
    private readonly marketModel: Model<MarketDocument>,
    private readonly programService: ProgramService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * createMarket
   *
   * 1. Generate a 32-byte market ID from fixtureId + timestamp
   * 2. Persist to MongoDB
   * 3. Call ProgramService.createMarket (on-chain)
   * 4. Update MongoDB with the tx signature
   * 5. Return the document
   */
  async createMarket(dto: CreateMarketDto): Promise<MarketDocument> {
    // ── Generate deterministic 32-byte market ID ──────────────────────────
    const rawId = `${dto.fixtureId}:${dto.question}:${Date.now()}`;
    const marketIdBytes = crypto
      .createHash('sha256')
      .update(rawId)
      .digest();                                 // Buffer (32 bytes)
    const marketIdHex = marketIdBytes.toString('hex');

    // ── Guard against duplicate marketId ─────────────────────────────────
    const existing = await this.marketModel.findOne({ marketId: marketIdHex });
    if (existing) {
      throw new ConflictException(
        `Market with id ${marketIdHex} already exists.`,
      );
    }

    // ── Persist initial MongoDB document ─────────────────────────────────
    const oracleAuthority = this.walletService.getPublicKey();
    const created = await this.marketModel.create({
      marketId: marketIdHex,
      fixtureId: dto.fixtureId,
      question: dto.question,
      marketType: dto.marketType ?? MarketType.GENERIC,
      status: MarketStatus.OPEN,
      outcomes: dto.outcomes,
      oracleAuthority,
      timeoutTs: dto.timeoutTs,
      metadataUri: dto.metadataUri ?? '',
    });

    this.logger.log(`Market document created in MongoDB: ${marketIdHex}`);

    // ── Build metadata hash ───────────────────────────────────────────────
    const metadataHash = crypto
      .createHash('sha256')
      .update(dto.metadataUri ?? marketIdHex)
      .digest();

    // ── Submit on-chain transaction ───────────────────────────────────────
    try {
      const sig = await this.programService.createMarket({
        marketId: marketIdBytes,
        metadataUri: dto.metadataUri ?? '',
        metadataHash,
        outcomeCount: dto.outcomes.length,
        feeBps: dto.feeBps ?? 200,
        oracleAuthority: new PublicKey(oracleAuthority),
        timeoutTs: BigInt(dto.timeoutTs),
      });

      created.createTxSignature = sig;
      await created.save();
      this.logger.log(`Market ${marketIdHex} anchored on-chain: ${sig}`);
    } catch (err) {
      // Roll back MongoDB document if on-chain tx fails
      await this.marketModel.deleteOne({ marketId: marketIdHex });
      this.logger.error(
        `On-chain createMarket failed for ${marketIdHex}`,
        (err as Error).stack,
      );
      throw err;
    }

    return created;
  }

  /** Return all markets, newest first */
  async getMarkets(): Promise<MarketDocument[]> {
    return this.marketModel.find().sort({ createdAt: -1 }).exec();
  }

  /** Return a single market by its marketId (hex) */
  async getMarket(marketId: string): Promise<MarketDocument> {
    const market = await this.marketModel.findOne({ marketId }).exec();
    if (!market) {
      throw new NotFoundException(`Market ${marketId} not found.`);
    }
    return market;
  }

  /**
   * closeMarket
   *
   * Locks the market on-chain and updates status in MongoDB.
   */
  async closeMarket(marketId: string): Promise<MarketDocument> {
    const market = await this.getMarket(marketId);

    if (market.status !== MarketStatus.OPEN) {
      throw new ConflictException(
        `Market ${marketId} is already ${market.status}.`,
      );
    }

    const marketIdBytes = Buffer.from(marketId, 'hex');

    const sig = await this.programService.lockMarket(marketIdBytes);

    market.status = MarketStatus.LOCKED;
    await market.save();

    this.logger.log(`Market ${marketId} locked. Tx: ${sig}`);
    return market;
  }
}
