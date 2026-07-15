import { MarketEvaluator, MarketEvent } from '../interfaces/market-evaluator.interface';
import { EventType } from '../../markets/schemas/market.schema';

export class ThresholdEvaluator implements MarketEvaluator {
  /**
   * Evaluates over/under threshold markets (e.g. "Total goals over 2.5").
   * Returns winning outcome index, or -1 if unresolved.
   */
  async evaluate(market: any, event: MarketEvent): Promise<number> {
    const scoreSoccer = event.scoreSoccer as any;
    const gameState = event.gameState as string;
    const action = event.action as string;

    if (!scoreSoccer) {
      return -1;
    }

    // Extract threshold value from the market question (e.g. "Over 2.5" -> 2.5)
    const threshold = this.parseThreshold(market.question);
    if (threshold === null) {
      return -1;
    }

    // Determine current count based on event type
    const homeGoals = scoreSoccer.Participant1?.Total?.Goals ?? 0;
    const awayGoals = scoreSoccer.Participant2?.Total?.Goals ?? 0;
    const homeYellows = scoreSoccer.Participant1?.Total?.YellowCards ?? 0;
    const awayYellows = scoreSoccer.Participant2?.Total?.YellowCards ?? 0;
    const homeReds = scoreSoccer.Participant1?.Total?.RedCards ?? 0;
    const awayReds = scoreSoccer.Participant2?.Total?.RedCards ?? 0;
    const homeCorners = scoreSoccer.Participant1?.Total?.Corners ?? 0;
    const awayCorners = scoreSoccer.Participant2?.Total?.Corners ?? 0;

    let currentCount = 0;
    if (market.eventType === EventType.GOAL) {
      currentCount = homeGoals + awayGoals;
    } else if (market.eventType === EventType.YELLOW_CARD) {
      currentCount = homeYellows + awayYellows;
    } else if (market.eventType === EventType.RED_CARD) {
      currentCount = homeReds + awayReds;
    } else if (market.eventType === EventType.CORNER) {
      currentCount = homeCorners + awayCorners;
    } else {
      return -1;
    }

    const isGameFinished = 
      gameState === 'F' || 
      gameState === 'FET' || 
      gameState === 'FPE' || 
      action === 'game_finalised';

    // If we've already exceeded the threshold, we can resolve as "Over" immediately
    if (currentCount > threshold) {
      return this.findOutcomeIndex(market.outcomes, 'OVER');
    }

    // Otherwise, we can only resolve as "Under" once the match has ended
    if (isGameFinished) {
      const winner = currentCount > threshold ? 'OVER' : 'UNDER';
      return this.findOutcomeIndex(market.outcomes, winner);
    }

    return -1;
  }

  /**
   * Extract numeric threshold from the question string
   */
  private parseThreshold(question: string): number | null {
    const match = question.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Helper to map over/under target to outcome index
   */
  private findOutcomeIndex(
    outcomes: { index: number; label: string }[],
    target: 'OVER' | 'UNDER',
  ): number {
    for (const outcome of outcomes) {
      const labelLower = outcome.label.toLowerCase();
      if (target === 'OVER' && (labelLower.includes('over') || labelLower.includes('yes') || labelLower.includes('>') || labelLower.includes('+'))) {
        return outcome.index;
      }
      if (target === 'UNDER' && (labelLower.includes('under') || labelLower.includes('no') || labelLower.includes('<') || labelLower.includes('-'))) {
        return outcome.index;
      }
    }

    // Fallback: Over is usually index 0, Under is index 1
    if (outcomes.length === 2) {
      return target === 'OVER' ? outcomes[0].index : outcomes[1].index;
    }

    return outcomes[0]?.index ?? 0;
  }
}
