import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketDocument = Market & Document;

export enum MarketStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum MarketType {
  SIDE_BASED = 'SIDE_BASED',
  CHRONO = 'CHRONO',
  THRESHOLD = 'THRESHOLD',
  GENERIC = 'GENERIC',
}

export enum EventType {
  GOAL = 'GOAL',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  CORNER = 'CORNER',
  PENALTY = 'PENALTY',
  MATCH_RESULT = 'MATCH_RESULT',
  HALF_TIME_RESULT = 'HALF_TIME_RESULT',
}

export enum TeamScope {
  HOME = 'HOME',
  AWAY = 'AWAY',
  ANY = 'ANY',
}

export enum Ordinal {
  NEXT = 'NEXT',       // Next occurrence of the event
  FIRST = 'FIRST',     // First occurrence in the match
  ANYTIME = 'ANYTIME', // Any occurrence (resolved at FT)
}

/**
 * MarketOutcome
 * One entry per betting option. index maps 1:1 to the on-chain outcome index.
 */
@Schema({ _id: false })
export class MarketOutcome {
  @Prop({ required: true })
  index: number;

  @Prop({ required: true })
  label: string;
}

/**
 * Market Schema
 *
 * Matches the shape the user specified:
 * {
 *   marketId, fixtureId, question, marketType,
 *   eventType, teamScope, ordinal,
 *   outcomes: [{ index, label }],
 *   status
 * }
 *
 * Financial data (pools, balances, payouts) lives on Solana.
 */
@Schema({ timestamps: true })
export class Market {
  /** 32-byte hex – the on-chain market_id */
  @Prop({ required: true, unique: true, index: true })
  marketId: string;

  /** TxODDS fixture ID */
  @Prop({ required: true, index: true })
  fixtureId: number;

  /** Human-readable question */
  @Prop({ required: true })
  question: string;

  @Prop({ required: true, enum: MarketType, default: MarketType.SIDE_BASED })
  marketType: MarketType;

  @Prop({ required: true, enum: EventType, default: EventType.GOAL })
  eventType: EventType;

  @Prop({ required: true, enum: TeamScope, default: TeamScope.ANY })
  teamScope: TeamScope;

  @Prop({ required: true, enum: Ordinal, default: Ordinal.NEXT })
  ordinal: Ordinal;

  @Prop({ type: [{ index: Number, label: String }], required: true })
  outcomes: MarketOutcome[];

  @Prop({ required: true, enum: MarketStatus, default: MarketStatus.OPEN })
  status: MarketStatus;

  @Prop({ required: true })
  oracleAuthority: string;

  @Prop()
  createTxSignature?: string;

  @Prop()
  resolveTxSignature?: string;

  @Prop()
  winningOutcome?: number;

  @Prop({ required: true })
  timeoutTs: number;

  @Prop()
  metadataUri?: string;
}

export const MarketSchema = SchemaFactory.createForClass(Market);
