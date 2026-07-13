import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Market, MarketSchema } from '../markets/schemas/market.schema';
import { OracleService } from './oracle.service';
import { OracleController } from './oracle.controller';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Market.name, schema: MarketSchema }]),
    SolanaModule,
  ],
  controllers: [OracleController],
  providers: [OracleService],
  exports: [OracleService],
})
export class OracleModule {}
