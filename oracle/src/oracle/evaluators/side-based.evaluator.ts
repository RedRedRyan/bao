import { NotImplementedException } from '@nestjs/common';
import { MarketEvaluator, MarketEvent } from '../interfaces/market-evaluator.interface';

/**
 * SideBasedEvaluator (Phase 2 stub)
 *
 * Will evaluate Win / Draw / Loss style markets.
 * e.g. "Home wins", "Draw", "Away wins"
 *
 * Outcome mapping (Phase 2):
 *   0 → Home
 *   1 → Draw
 *   2 → Away
 */
export class SideBasedEvaluator implements MarketEvaluator {
  evaluate(
    _market: Record<string, unknown>,
    _event: MarketEvent,
  ): Promise<number> {
    throw new NotImplementedException(
      'SideBasedEvaluator is not yet implemented. Coming in Phase 2.',
    );
  }
}
