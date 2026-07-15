import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TxoddsService } from './txodds.service';
import { OracleModule } from '../oracle/oracle.module';

@Module({
  imports: [ConfigModule, OracleModule],
  providers: [TxoddsService],
  exports: [TxoddsService],
})
export class TxoddsModule {}
