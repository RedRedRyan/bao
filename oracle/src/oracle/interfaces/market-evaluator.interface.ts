/**
 * MarketEvaluator interface
 *
 * Every evaluator in Phase 2 will implement this contract.
 * The evaluate() method receives the MongoDB market document and
 * a raw event payload from TxODDS, and returns the winning outcome index.
 *
 * During Phase 1, evaluators simply throw NotImplementedException.
 */
export interface MarketEvent {
  /** TxODDS event / fixture data (shape will be defined in Phase 2) */
  [key: string]: unknown;
}

export interface MarketEvaluator {
  /**
   * Evaluate the market outcome based on the event data.
   * @returns The winning outcome index (0-based, matches on-chain index)
   */
  evaluate(market: Record<string, unknown>, event: MarketEvent): Promise<number>;
}
