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
import {
  Market,
  MarketDocument,
  MarketStatus,
  MarketType,
  EventType,
  TeamScope,
  Ordinal,
} from './schemas/market.schema';
import { CreateMarketDto } from './dto/create-market.dto';
import { ProgramService } from '../solana/program.service';
import { WalletService } from '../solana/wallet.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';


@Injectable()
export class MarketsService {
  private readonly logger = new Logger(MarketsService.name);

  constructor(
    @InjectModel(Market.name)
    private readonly marketModel: Model<MarketDocument>,
    private readonly programService: ProgramService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
  ) {}

  private async getGuestJwt(): Promise<string> {
    const apiOrigin = this.configService.get<string>('TXLINE_API_ORIGIN') ?? 'https://txline-dev.txodds.com';
    const authUrl = `${apiOrigin}/auth/guest/start`;
    const response = await axios.post(authUrl, {}, { timeout: 15000 });
    return response.data.token;
  }

  async syncFixturesAndCreateMarkets(): Promise<{ synced: number; created: number }> {
    const apiOrigin = this.configService.get<string>('TXLINE_API_ORIGIN') ?? 'https://txline-dev.txodds.com';
    const apiToken = this.configService.get<string>('TXODDS_API');
    if (!apiToken) {
      throw new Error('TXODDS_API is not set in env');
    }

    this.logger.log('Syncing fixtures from TxLINE API...');
    const jwt = await this.getGuestJwt();

    const snapshotUrl = `${apiOrigin}/api/fixtures/snapshot`;
    const response = await axios.get(snapshotUrl, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'X-Api-Token': apiToken,
      },
      timeout: 20000,
    });

    const fixtures = response.data || [];
    this.logger.log(`Retrieved ${fixtures.length} fixtures from snapshot`);

    let syncedCount = 0;
    let createdCount = 0;

    const nowSec = Math.floor(Date.now() / 1000);

    for (const fixture of fixtures) {
      const fixtureId = fixture.FixtureId;
      const startTime = fixture.StartTime;
      const p1 = fixture.Participant1 || 'Home';
      const p2 = fixture.Participant2 || 'Away';

      // Skip past/ongoing games (allow a 5 minute safety buffer)
      if (startTime < nowSec - 300) {
        continue;
      }

      // Limit lookahead to 7 days to conserve SOL/fees
      if (startTime > nowSec + (2 * 24 * 3600)) { // Limit lookahead to 48 hours to conserve SOL/fees
        continue;
      }

      syncedCount++;

      // Check if markets already exist for this fixtureId
      const count = await this.marketModel.countDocuments({ fixtureId }).exec();
      if (count > 0) {
        continue; // Already synchronized
      }

      this.logger.log(`Auto-creating default markets for new fixture ${fixtureId}: ${p1} vs ${p2}`);
      try {
        const timeoutTs = startTime + 14400; // 4 hours after start

        // 1. Match Result (1X2)
        await this.createMarket({
          fixtureId,
          marketType: MarketType.SIDE_BASED,
          eventType: EventType.MATCH_RESULT,
          teamScope: TeamScope.ANY,
          ordinal: Ordinal.NEXT,
          outcomes: [
            { index: 0, label: p1 },
            { index: 1, label: 'Draw' },
            { index: 2, label: p2 },
          ],
          timeoutTs,
          question: `Match Winner (1X2): ${p1} vs ${p2}?`,
        });

        // 2. Next Goal (Goal 1)
        await this.createMarket({
          fixtureId,
          marketType: MarketType.SIDE_BASED,
          eventType: EventType.GOAL,
          teamScope: TeamScope.ANY,
          ordinal: Ordinal.NEXT,
          outcomes: [
            { index: 0, label: p1 },
            { index: 1, label: p2 },
            { index: 2, label: 'No Goal' },
          ],
          timeoutTs,
          question: `Which team will score Goal 1 (First Goal)?`,
        });



	        // 3. Total Goals Over/Under 2.5
        await this.createMarket({
          fixtureId,
          marketType: MarketType.THRESHOLD,
          eventType: EventType.GOAL,
          teamScope: TeamScope.ANY,
          ordinal: Ordinal.ANYTIME,
          outcomes: [
            { index: 0, label: 'Over 2.5' },
            { index: 1, label: 'Under 2.5' },
          ],
          timeoutTs,
	          question: `Total goals over 2.5?`,
	        });
	
	        // 4. Away Team to Score Anytime (Yes / No)
	        await this.createMarket({
	          fixtureId,
	          marketType: MarketType.THRESHOLD,
	          eventType: EventType.GOAL,
	          teamScope: TeamScope.AWAY,
	          ordinal: Ordinal.ANYTIME,
	          outcomes: [
	            { index: 0, label: 'Yes' },
	            { index: 1, label: 'No' },
	          ],
	          timeoutTs,
	          question: `${p2} to score anytime?`,
	        });

        createdCount++;
      } catch (err) {
        this.logger.error(`Failed to auto-create default markets for fixture ${fixtureId}: ${(err as Error).message}`);
      }
    }

    return { synced: syncedCount, created: createdCount };
  }

  async createMarket(dto: CreateMarketDto): Promise<MarketDocument> {
    // ── Generate 32-byte market ID ─────────────────────────────────────────
    const rawId = `${dto.fixtureId}:${dto.question}:${Date.now()}`;
    const marketIdBytes = crypto.createHash('sha256').update(rawId).digest();
    const marketIdHex = marketIdBytes.toString('hex');

    const existing = await this.marketModel.findOne({ marketId: marketIdHex });
    if (existing) {
      throw new ConflictException(`Market ${marketIdHex} already exists.`);
    }

    const oracleAuthority = this.walletService.getPublicKey();

    // ── Persist to MongoDB ─────────────────────────────────────────────────
    const created = await this.marketModel.create({
      marketId: marketIdHex,
      fixtureId: dto.fixtureId,
      question: dto.question,
      marketType: dto.marketType ?? MarketType.SIDE_BASED,
      eventType: dto.eventType ?? EventType.GOAL,
      teamScope: dto.teamScope ?? TeamScope.ANY,
      ordinal: dto.ordinal ?? Ordinal.NEXT,
      outcomes: dto.outcomes,
      status: MarketStatus.OPEN,
      oracleAuthority,
      timeoutTs: dto.timeoutTs,
      metadataUri: dto.metadataUri ?? '',
    });

    this.logger.log(`Market created in MongoDB: ${marketIdHex}`);

    // ── Build metadata hash ────────────────────────────────────────────────
    const metadataHash = crypto
      .createHash('sha256')
      .update(dto.metadataUri ?? marketIdHex)
      .digest();

    // ── Submit on-chain ────────────────────────────────────────────────────
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
      await this.marketModel.deleteOne({ marketId: marketIdHex });
      this.logger.error(`On-chain createMarket failed`, (err as Error).stack);
      throw err;
    }

    return created;
  }

  async getMarkets(fixtureId?: number, status?: MarketStatus): Promise<MarketDocument[]> {
    const filter: Record<string, unknown> = {};
    if (fixtureId !== undefined) filter.fixtureId = fixtureId;
    if (status !== undefined) filter.status = status;
    return this.marketModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getMarket(marketId: string): Promise<MarketDocument> {
    const market = await this.marketModel.findOne({ marketId }).exec();
    if (!market) throw new NotFoundException(`Market ${marketId} not found.`);
    return market;
  }

  async closeMarket(marketId: string): Promise<MarketDocument> {
    const market = await this.getMarket(marketId);
    if (market.status !== MarketStatus.OPEN) {
      throw new ConflictException(`Market ${marketId} is already ${market.status}.`);
    }
    const marketIdBytes = Buffer.from(marketId, 'hex');
    await this.programService.lockMarket(marketIdBytes);
    market.status = MarketStatus.LOCKED;
    await market.save();
    return market;
  }

  /** Used by the resolution engine to find all open LOCKED markets for a fixture */
  async getLockedMarketsForFixture(fixtureId: number): Promise<MarketDocument[]> {
    return this.marketModel
      .find({ fixtureId, status: MarketStatus.LOCKED })
      .exec();
  }

  /** Used by the resolution engine to find all OPEN markets for a fixture */
  async getOpenMarketsForFixture(fixtureId: number): Promise<MarketDocument[]> {
    return this.marketModel
      .find({ fixtureId, status: MarketStatus.OPEN })
      .exec();
  }

  async markResolved(
    marketId: string,
    winningOutcome: number,
    txSignature: string,
  ): Promise<void> {
    await this.marketModel.updateOne(
      { marketId },
      {
        status: MarketStatus.RESOLVED,
        winningOutcome,
        resolveTxSignature: txSignature,
      },
    );
  }
}
