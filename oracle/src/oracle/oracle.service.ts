import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketDocument, MarketStatus, MarketType } from '../markets/schemas/market.schema';
import { ProgramService } from '../solana/program.service';
import { SideBasedEvaluator } from './evaluators/side-based.evaluator';
import { ThresholdEvaluator } from './evaluators/threshold.evaluator';
import { ChronoEvaluator } from './evaluators/chrono.evaluator';

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  
  private readonly sideBasedEvaluator = new SideBasedEvaluator();
  private readonly thresholdEvaluator = new ThresholdEvaluator();
  private readonly chronoEvaluator = new ChronoEvaluator();

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
    if (market.status === MarketStatus.LOCKED || market.status === MarketStatus.RESOLVED) {
      return '';
    }
    const marketIdBytes = Buffer.from(market.marketId, 'hex');
    const sig = await this.programService.lockMarket(marketIdBytes);
    market.status = MarketStatus.LOCKED;
    await market.save();
    this.logger.log(`Market ${market.marketId} locked. Transaction: ${sig}`);
    return sig;
  }

  /**
   * resolveMarket
   *
   * Manually or automatically resolves a market via oracle authority.
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
   * processScoresUpdate
   * Called by TxoddsService for every incoming scores stream update.
   * Scans for matching open/locked markets and resolves them if they meet criteria.
   */
  async processScoresUpdate(event: any): Promise<void> {
    const fixtureId = event.fixtureId;
    if (!fixtureId) return;

    // Find all markets for this fixture that are not resolved yet
    const markets = await this.marketModel.find({
      fixtureId,
      status: { $in: [MarketStatus.OPEN, MarketStatus.LOCKED] },
    }).exec();

    if (markets.length === 0) return;

    this.logger.log(`Processing update for fixture ${fixtureId} against ${markets.length} active markets`);

    for (const market of markets) {
      try {
        let evaluator;
        if (market.marketType === MarketType.THRESHOLD) {
          evaluator = this.thresholdEvaluator;
        } else if (market.marketType === MarketType.CHRONO) {
          evaluator = this.chronoEvaluator;
        } else {
          // Default to SideBased for generic or side-based
          evaluator = this.sideBasedEvaluator;
        }

        const winningOutcome = await evaluator.evaluate(market, event);

        // If evaluator returned a valid outcome index (0 or higher)
        if (winningOutcome >= 0) {
          this.logger.log(
            `Market ${market.marketId} (${market.question}) resolved to outcome index ${winningOutcome}`,
          );

          // 1. Lock market first on Solana and MongoDB if it's still OPEN
          if (market.status === MarketStatus.OPEN) {
            await this.lockMarket(market.marketId);
          }

          // 2. Resolve market on Solana and MongoDB
          const nonce = event.seq ?? Math.floor(Math.random() * 1000000);
          const timestamp = Math.floor((event.ts ?? Date.now()) / 1000);

          await this.resolveMarket(market.marketId, winningOutcome, nonce, timestamp);
        }
      } catch (err) {
        this.logger.error(
          `Failed to evaluate market ${market.marketId} for fixture ${fixtureId}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * evaluate (Legacy / general wrapper)
   */
  async evaluate(marketId: string, event: any): Promise<number> {
    const market = await this.loadMarket(marketId);
    let evaluator;
    if (market.marketType === MarketType.THRESHOLD) {
      evaluator = this.thresholdEvaluator;
    } else if (market.marketType === MarketType.CHRONO) {
      evaluator = this.chronoEvaluator;
    } else {
      evaluator = this.sideBasedEvaluator;
    }
    return evaluator.evaluate(market, event);
  }
}
