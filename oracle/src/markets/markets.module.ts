import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Market, MarketSchema } from './schemas/market.schema';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Market.name, schema: MarketSchema }]),
    SolanaModule,
  ],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
