import {
  Controller, Get, Post, Patch, Param, Body,
  UsePipes, ValidationPipe, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { MarketsService } from './markets.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { MarketStatus } from './schemas/market.schema';

@Controller('markets')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  /** POST /api/markets */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMarketDto) {
    return this.marketsService.createMarket(dto);
  }

  /** GET /api/markets?fixtureId=185623&status=OPEN */
  @Get()
  findAll(
    @Query('fixtureId') fixtureId?: string,
    @Query('status') status?: MarketStatus,
  ) {
    return this.marketsService.getMarkets(
      fixtureId ? parseInt(fixtureId, 10) : undefined,
      status,
    );
  }

  /** GET /api/markets/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketsService.getMarket(id);
  }

  /** PATCH /api/markets/:id/close */
  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.marketsService.closeMarket(id);
  }
}
