import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OracleService } from './oracle.service';
import { ResolveMarketDto } from './dto/resolve-market.dto';

/**
 * OracleController
 *
 * Phase 1: Exposes a single manual resolution endpoint for testing.
 *
 * POST /oracle/resolve  – manually resolve a market (Phase 1 testing)
 */
@Controller('oracle')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(@Body() dto: ResolveMarketDto) {
    const result = await this.oracleService.resolveMarket(
      dto.marketId,
      dto.winningOutcome,
      dto.nonce,
      dto.timestamp,
    );
    return {
      success: true,
      txSignature: result.txSignature,
      marketId: result.market.marketId,
      winningOutcome: result.market.winningOutcome,
      status: result.market.status,
    };
  }
}
