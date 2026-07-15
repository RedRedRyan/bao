import { IsString, IsNotEmpty, IsInt, Min, IsNumber } from 'class-validator';

export class ResolveMarketDto {
  /** The hex marketId (32 bytes = 64 hex chars) */
  @IsString()
  @IsNotEmpty()
  marketId: string;

  /** The winning outcome index (0-based) */
  @IsInt()
  @Min(0)
  winningOutcome: number;

  /** Unique nonce to prevent replay attacks */
  @IsNumber()
  nonce: number;

  /** Unix timestamp (seconds) of the resolution event */
  @IsNumber()
  timestamp: number;
}
