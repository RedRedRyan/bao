import { MarketEvaluator, MarketEvent } from '../interfaces/market-evaluator.interface';
import { EventType, TeamScope, Ordinal } from '../../markets/schemas/market.schema';

export class SideBasedEvaluator implements MarketEvaluator {
  /**
   * Evaluates the market based on a scores record.
   * Returns the winning outcome index, or -1 if the event doesn't trigger resolution yet.
   */
  async evaluate(market: any, event: MarketEvent): Promise<number> {
    const dataSoccer = event.dataSoccer as any;
    const scoreSoccer = event.scoreSoccer as any;
    const gameState = event.gameState as string;
    const action = event.action as string;

    // ── Handle FT (Full Time) Match Result / Anytime Resolution ────────────────
    const isGameFinished = 
      gameState === 'F' || 
      gameState === 'FET' || 
      gameState === 'FPE' || 
      action === 'game_finalised';

    // 1. MATCH_RESULT is resolved at full time
    if (market.eventType === EventType.MATCH_RESULT) {
      if (!isGameFinished || !scoreSoccer) {
        return -1;
      }
      const homeGoals = scoreSoccer.Participant1?.Total?.Goals ?? 0;
      const awayGoals = scoreSoccer.Participant2?.Total?.Goals ?? 0;

      let winner: 'HOME' | 'AWAY' | 'DRAW';
      if (homeGoals > awayGoals) {
        winner = 'HOME';
      } else if (awayGoals > homeGoals) {
        winner = 'AWAY';
      } else {
        winner = 'DRAW';
      }

      return this.findOutcomeIndex(market.outcomes, winner);
    }

    // 2. ANYTIME markets are resolved at full time
    if (market.ordinal === Ordinal.ANYTIME) {
      if (!isGameFinished || !scoreSoccer) {
        return -1;
      }

      const homeGoals = scoreSoccer.Participant1?.Total?.Goals ?? 0;
      const awayGoals = scoreSoccer.Participant2?.Total?.Goals ?? 0;
      const homeYellows = scoreSoccer.Participant1?.Total?.YellowCards ?? 0;
      const awayYellows = scoreSoccer.Participant2?.Total?.YellowCards ?? 0;
      const homeReds = scoreSoccer.Participant1?.Total?.RedCards ?? 0;
      const awayReds = scoreSoccer.Participant2?.Total?.RedCards ?? 0;
      const homeCorners = scoreSoccer.Participant1?.Total?.Corners ?? 0;
      const awayCorners = scoreSoccer.Participant2?.Total?.Corners ?? 0;

      let eventCount = 0;
      if (market.eventType === EventType.GOAL) {
        eventCount = market.teamScope === TeamScope.HOME ? homeGoals :
                     market.teamScope === TeamScope.AWAY ? awayGoals : (homeGoals + awayGoals);
      } else if (market.eventType === EventType.YELLOW_CARD) {
        eventCount = market.teamScope === TeamScope.HOME ? homeYellows :
                     market.teamScope === TeamScope.AWAY ? awayYellows : (homeYellows + awayYellows);
      } else if (market.eventType === EventType.RED_CARD) {
        eventCount = market.teamScope === TeamScope.HOME ? homeReds :
                     market.teamScope === TeamScope.AWAY ? awayReds : (homeReds + awayReds);
      } else if (market.eventType === EventType.CORNER) {
        eventCount = market.teamScope === TeamScope.HOME ? homeCorners :
                     market.teamScope === TeamScope.AWAY ? awayCorners : (homeCorners + awayCorners);
      }

      const conditionMet = eventCount > 0;
      return this.findOutcomeIndex(market.outcomes, conditionMet ? 'YES' : 'NO');
    }

    // ── Handle In-Game Microevents (NEXT / FIRST) ─────────────────────────────
    if (!dataSoccer) {
      return -1;
    }

    // Check if the current microevent matches the market's eventType
    let isMatch = false;
    if (market.eventType === EventType.GOAL && (dataSoccer.Goal === true || dataSoccer.Action === 'Goal')) {
      isMatch = true;
    } else if (market.eventType === EventType.CORNER && (dataSoccer.Corner === true || dataSoccer.Action === 'Corner')) {
      isMatch = true;
    } else if (market.eventType === EventType.YELLOW_CARD && dataSoccer.YellowCard === true) {
      isMatch = true;
    } else if (market.eventType === EventType.RED_CARD && dataSoccer.RedCard === true) {
      isMatch = true;
    }

    if (!isMatch) {
      return -1;
    }

    // Determine event team (HOME or AWAY)
    const isP1Home = event.participant1IsHome !== false;
    const participant = dataSoccer.Participant; // 1 or 2
    let eventTeam: 'HOME' | 'AWAY' | null = null;
    if (participant === 1) {
      eventTeam = isP1Home ? 'HOME' : 'AWAY';
    } else if (participant === 2) {
      eventTeam = isP1Home ? 'AWAY' : 'HOME';
    }

    if (!eventTeam) {
      return -1;
    }

    // Evaluate microevent outcome
    if (market.teamScope === TeamScope.HOME) {
      const winner = eventTeam === 'HOME' ? 'YES' : 'NO';
      return this.findOutcomeIndex(market.outcomes, winner);
    }

    if (market.teamScope === TeamScope.AWAY) {
      const winner = eventTeam === 'AWAY' ? 'YES' : 'NO';
      return this.findOutcomeIndex(market.outcomes, winner);
    }

    if (market.teamScope === TeamScope.ANY) {
      // e.g. "Who scores the next goal?" -> outcomes: ["Home", "Away"]
      return this.findOutcomeIndex(market.outcomes, eventTeam);
    }

    return -1;
  }

  /**
   * Helper to map a logic outcome to the market's registered outcome index
   */
  private findOutcomeIndex(
    outcomes: { index: number; label: string }[],
    target: 'YES' | 'NO' | 'HOME' | 'AWAY' | 'DRAW',
  ): number {
    const targetLower = target.toLowerCase();

    // 1. Label-based match
    for (const outcome of outcomes) {
      const labelLower = outcome.label.toLowerCase();
      if (target === 'YES' && (labelLower.includes('yes') || labelLower.includes('true'))) {
        return outcome.index;
      }
      if (target === 'NO' && (labelLower.includes('no') || labelLower.includes('false'))) {
        return outcome.index;
      }
      if (target === 'HOME' && (labelLower.includes('home') || labelLower === '1')) {
        return outcome.index;
      }
      if (target === 'AWAY' && (labelLower.includes('away') || labelLower === '2')) {
        return outcome.index;
      }
      if (target === 'DRAW' && (labelLower.includes('draw') || labelLower === 'x')) {
        return outcome.index;
      }
    }

    // 2. Positional fallbacks if labels don't match standard keywords
    if (outcomes.length === 2) {
      if (target === 'YES' || target === 'HOME') return outcomes[0].index;
      if (target === 'NO' || target === 'AWAY') return outcomes[1].index;
    }
    if (outcomes.length === 3) {
      if (target === 'HOME') return outcomes[0].index;
      if (target === 'DRAW') return outcomes[1].index;
      if (target === 'AWAY') return outcomes[2].index;
    }

    return outcomes[0]?.index ?? 0;
  }
}
