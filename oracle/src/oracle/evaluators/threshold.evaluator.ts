import { NotImplementedException } from '@nestjs/common';
import { MarketEvaluator, MarketEvent } from '../interfaces/market-evaluator.interface';

/**
 * ThresholdEvaluator (Phase 2 stub)
 *
 * Will evaluate over/under numeric threshold markets.
 * e.g. "Total goals over/under 2.5"
 */
export class ThresholdEvaluator implements MarketEvaluator {
  evaluate(
    _market: Record<string, unknown>,
    _event: MarketEvent,
  ): Promise<number> {
    throw new NotImplementedException(
      'ThresholdEvaluator is not yet implemented. Coming in Phase 2.',
    );
  }
}
