import { NotImplementedException } from '@nestjs/common';
import { MarketEvaluator, MarketEvent } from '../interfaces/market-evaluator.interface';

/**
 * ChronoEvaluator (Phase 2 stub)
 *
 * Will evaluate time-based markets.
 * e.g. "Next goal scored before/after minute 45"
 */
export class ChronoEvaluator implements MarketEvaluator {
  evaluate(
    _market: Record<string, unknown>,
    _event: MarketEvent,
  ): Promise<number> {
    throw new NotImplementedException(
      'ChronoEvaluator is not yet implemented. Coming in Phase 2.',
    );
  }
}
