import { MarketEvaluator, MarketEvent } from '../interfaces/market-evaluator.interface';
import { EventType } from '../../markets/schemas/market.schema';

export class ChronoEvaluator implements MarketEvaluator {
  /**
   * Evaluates time-based markets (e.g. "Goal scored before minute 30").
   * Returns winning outcome index, or -1 if unresolved.
   */
  async evaluate(market: any, event: MarketEvent): Promise<number> {
    const dataSoccer = event.dataSoccer as any;
    const gameState = event.gameState as string;
    const action = event.action as string;

    // Extract time threshold (e.g. "before minute 30" -> 30)
    const targetMinute = this.parseMinutes(market.question);
    if (targetMinute === null) {
      return -1;
    }

    const isGameFinished = 
      gameState === 'F' || 
      gameState === 'FET' || 
      gameState === 'FPE' || 
      action === 'game_finalised';

    // 1. If we have a microevent matching the market's eventType
    if (dataSoccer) {
      let isEventMatch = false;
      if (market.eventType === EventType.GOAL && (dataSoccer.Goal === true || dataSoccer.Action === 'Goal')) {
        isEventMatch = true;
      } else if (market.eventType === EventType.CORNER && (dataSoccer.Corner === true || dataSoccer.Action === 'Corner')) {
        isEventMatch = true;
      } else if (market.eventType === EventType.YELLOW_CARD && dataSoccer.YellowCard === true) {
        isEventMatch = true;
      } else if (market.eventType === EventType.RED_CARD && dataSoccer.RedCard === true) {
        isEventMatch = true;
      }

      if (isEventMatch) {
        const eventMinute = dataSoccer.Minutes ?? 0;
        // If the event happened before or at the target minute, resolve as "Yes"
        if (eventMinute <= targetMinute) {
          return this.findOutcomeIndex(market.outcomes, 'YES');
        }
      }

      // 2. If the current game minutes have already exceeded the target minute
      const currentMinute = dataSoccer.Minutes ?? 0;
      if (currentMinute > targetMinute) {
        return this.findOutcomeIndex(market.outcomes, 'NO');
      }
    }

    // 3. If the game finished and the event never occurred
    if (isGameFinished) {
      return this.findOutcomeIndex(market.outcomes, 'NO');
    }

    return -1;
  }

  /**
   * Extract target minute from the question string
   */
  private parseMinutes(question: string): number | null {
    const match = question.match(/minute\s+(\d+)/i) || question.match(/min\s+(\d+)/i) || question.match(/(\d+)\s*minute/i) || question.match(/(\d+)\s*min/i);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Helper to map yes/no target to outcome index
   */
  private findOutcomeIndex(
    outcomes: { index: number; label: string }[],
    target: 'YES' | 'NO',
  ): number {
    for (const outcome of outcomes) {
      const labelLower = outcome.label.toLowerCase();
      if (target === 'YES' && (labelLower.includes('yes') || labelLower.includes('true') || labelLower.includes('before'))) {
        return outcome.index;
      }
      if (target === 'NO' && (labelLower.includes('no') || labelLower.includes('false') || labelLower.includes('after'))) {
        return outcome.index;
      }
    }

    if (outcomes.length === 2) {
      return target === 'YES' ? outcomes[0].index : outcomes[1].index;
    }

    return outcomes[0]?.index ?? 0;
  }
}
