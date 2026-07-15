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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MarketType, EventType, TeamScope, Ordinal } from '../schemas/market.schema';

export class OutcomeDto {
  @IsInt()
  @Min(0)
  index: number;

  @IsString()
  @IsNotEmpty()
  label: string;
}

export class CreateMarketDto {
  /** TxODDS fixture ID */
  @IsInt()
  fixtureId: number;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsEnum(MarketType)
  @IsOptional()
  marketType?: MarketType;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @IsEnum(TeamScope)
  @IsOptional()
  teamScope?: TeamScope;

  @IsEnum(Ordinal)
  @IsOptional()
  ordinal?: Ordinal;

  /** Ordered list of outcome objects [{ index, label }] */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutcomeDto)
  @ArrayMinSize(2)
  outcomes: OutcomeDto[];

  @IsInt()
  @Min(0)
  @Max(10_000)
  @IsOptional()
  feeBps?: number;

  /** Unix timestamp (seconds) for market timeout */
  @IsNumber()
  @IsNotEmpty()
  timeoutTs: number;

  @IsString()
  @IsOptional()
  metadataUri?: string;
}
