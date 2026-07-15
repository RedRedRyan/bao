import { Test, TestingModule } from '@nestjs/testing';
import { TxoddsService } from './txodds.service';

describe('TxoddsService', () => {
  let service: TxoddsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TxoddsService],
    }).compile();

    service = module.get<TxoddsService>(TxoddsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
