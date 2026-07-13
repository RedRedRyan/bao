import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';
import { MarketType } from '../schemas/market.schema';

export class CreateMarketDto {
  /**
   * External fixture / event identifier.
   * Used to associate this market with a real-world event.
   */
  @IsString()
  @IsNotEmpty()
  fixtureId: string;

  /**
   * Human-readable question.
   * e.g. "Who will win Arsenal vs Chelsea?"
   */
  @IsString()
  @IsNotEmpty()
  question: string;

  /** Market type determines which evaluator will resolve it in Phase 2 */
  @IsEnum(MarketType)
  @IsOptional()
  marketType?: MarketType;

  /**
   * Ordered list of outcome labels.
   * The index maps to the on-chain outcome index.
   * e.g. ['Home', 'Draw', 'Away']
   */
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  outcomes: string[];

  /**
   * Fee in basis points (100 bps = 1%).
   * Defaults to 200 (2%) if not provided.
   */
  @IsInt()
  @Min(0)
  @Max(10_000)
  @IsOptional()
  feeBps?: number;

  /**
   * Unix timestamp (seconds) after which the market times out.
   * Bettors may claim refunds after this timestamp if the market is unresolved.
   */
  @IsNumber()
  @IsNotEmpty()
  timeoutTs: number;

  /**
   * Optional off-chain metadata URI.
   * Will be stored on-chain and in MongoDB.
   */
  @IsString()
  @IsOptional()
  metadataUri?: string;
}
