import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { SolanaModule } from './solana/solana.module';
import { MarketsModule } from './markets/markets.module';
import { OracleModule } from './oracle/oracle.module';

/**
 * AppModule – Phase 1
 *
 * Only the four core modules needed to:
 *  - Connect MongoDB
 *  - Connect Solana / Anchor
 *  - Create and list markets
 *  - Manually resolve markets (oracle)
 *
 * Phase 2 will add: TxoddsModule, WorkersModule, AttestationModule
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SolanaModule,
    MarketsModule,
    OracleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
