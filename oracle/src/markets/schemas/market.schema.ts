import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketDocument = Market & Document;

export enum MarketStatus {
  OPEN = 'open',
  LOCKED = 'locked',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export enum MarketType {
  SIDE_BASED = 'side_based',      // Win / Draw / Loss style
  CHRONO = 'chrono',              // Time-based (e.g. next goal minute)
  THRESHOLD = 'threshold',        // Over/under numeric threshold
  GENERIC = 'generic',            // No specific evaluator
}

/**
 * Market Schema
 *
 * MongoDB stores only the metadata and coordination fields.
 * All financial data (pools, balances, payouts) live on Solana.
 */
@Schema({ timestamps: true })
export class Market {
  /** Unique market identifier – 32-byte hex string (matches on-chain market_id) */
  @Prop({ required: true, unique: true, index: true })
  marketId: string;

  /** External fixture / event identifier (e.g. TxODDS fixture ID) */
  @Prop({ required: true, index: true })
  fixtureId: string;

  /** Human-readable question for the market */
  @Prop({ required: true })
  question: string;

  @Prop({ required: true, enum: MarketType, default: MarketType.GENERIC })
  marketType: MarketType;

  @Prop({ required: true, enum: MarketStatus, default: MarketStatus.OPEN })
  status: MarketStatus;

  /**
   * Ordered list of outcome labels.
   * The index corresponds to the on-chain outcome index.
   * e.g. ['Home', 'Draw', 'Away'] or ['Over', 'Under']
   */
  @Prop({ type: [String], required: true })
  outcomes: string[];

  /** Public key (base58) of the oracle authority for this market */
  @Prop({ required: true })
  oracleAuthority: string;

  /** On-chain transaction signature from createMarket */
  @Prop()
  createTxSignature?: string;

  /** On-chain transaction signature from resolveMarket */
  @Prop()
  resolveTxSignature?: string;

  /** Winning outcome index (set after resolution) */
  @Prop()
  winningOutcome?: number;

  /** Unix timestamp after which bettors may claim refunds */
  @Prop({ required: true })
  timeoutTs: number;

  /** Off-chain metadata URI stored on-chain */
  @Prop()
  metadataUri?: string;
}

export const MarketSchema = SchemaFactory.createForClass(Market);
