import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketDocument, MarketStatus } from '../markets/schemas/market.schema';
import { ProgramService } from '../solana/program.service';

/**
 * OracleService
 *
 * Phase 1: Wraps ProgramService.resolveMarket() for manual resolution.
 * Phase 2: Will integrate evaluators and the TxODDS feed.
 */
@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);

  constructor(
    @InjectModel(Market.name)
    private readonly marketModel: Model<MarketDocument>,
    private readonly programService: ProgramService,
  ) {}

  /**
   * loadMarket
   * Fetches the MongoDB market document by marketId.
   */
  async loadMarket(marketId: string): Promise<MarketDocument> {
    const market = await this.marketModel.findOne({ marketId }).exec();
    if (!market) {
      throw new NotFoundException(`Market ${marketId} not found.`);
    }
    return market;
  }

  /**
   * lockMarket
   * Locks a market (no more bets). Delegates to ProgramService.
   */
  async lockMarket(marketId: string): Promise<string> {
    const market = await this.loadMarket(marketId);
    const marketIdBytes = Buffer.from(market.marketId, 'hex');
    const sig = await this.programService.lockMarket(marketIdBytes);
    market.status = MarketStatus.LOCKED;
    await market.save();
    return sig;
  }

  /**
   * resolveMarket
   *
   * Manually resolves a market via oracle authority.
   * In Phase 2, this will be called automatically by the resolution engine.
   */
  async resolveMarket(
    marketId: string,
    winningOutcome: number,
    nonce: number,
    timestamp: number,
  ): Promise<{ txSignature: string; market: MarketDocument }> {
    const market = await this.loadMarket(marketId);

    if (market.status === MarketStatus.RESOLVED) {
      throw new Error(`Market ${marketId} is already resolved.`);
    }

    const marketIdBytes = Buffer.from(marketId, 'hex');

    const sig = await this.programService.resolveMarket({
      marketId: marketIdBytes,
      winningOutcome,
      nonce: BigInt(nonce),
      timestamp: BigInt(timestamp),
    });

    market.status = MarketStatus.RESOLVED;
    market.winningOutcome = winningOutcome;
    market.resolveTxSignature = sig;
    await market.save();

    this.logger.log(
      `Market ${marketId} resolved. Outcome: ${winningOutcome}. Tx: ${sig}`,
    );

    return { txSignature: sig, market };
  }

  /**
   * evaluate (Phase 1 stub)
   *
   * In Phase 2, this will select the correct evaluator based on marketType,
   * fetch the event from TxODDS, and call evaluator.evaluate().
   */
  async evaluate(
    _marketId: string,
    _event: Record<string, unknown>,
  ): Promise<number> {
    throw new Error(
      'evaluate() is not yet implemented. This will be powered by TxODDS in Phase 2.',
    );
  }
}
