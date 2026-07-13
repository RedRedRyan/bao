import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PdaService } from './pda.service';
import { ProgramService } from './program.service';

@Module({
  providers: [WalletService, PdaService, ProgramService],
  exports: [ProgramService, WalletService, PdaService],
})
export class SolanaModule {}
