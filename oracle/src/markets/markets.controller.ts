import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MarketsService } from './markets.service';
import { CreateMarketDto } from './dto/create-market.dto';

/**
 * MarketsController
 *
 * REST endpoints:
 *   POST   /markets          – create a new market
 *   GET    /markets          – list all markets
 *   GET    /markets/:id      – get a single market by marketId
 *   PATCH  /markets/:id/close – lock (close) a market
 */
@Controller('markets')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMarketDto) {
    return this.marketsService.createMarket(dto);
  }

  @Get()
  findAll() {
    return this.marketsService.getMarkets();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketsService.getMarket(id);
  }

  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.marketsService.closeMarket(id);
  }
}
