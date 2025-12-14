/**
 * Hook to evaluate trades against rules
 * Evaluates trades on-demand and caches results
 */

import { useMemo } from 'react';
import type { Trade, Settings } from '@/types/Trading';
import { evaluateAndUpdateTrade } from '@/lib/tradeRuleEvaluation';

export function useEvaluatedTrades(trades: Trade[], settings: Settings): Trade[] {
  return useMemo(() => {
    if (!settings.advanced?.tradingRules) {
      return trades;
    }

    return trades.map(trade => {
      // If already evaluated and rules haven't changed, return as-is
      if (trade.evaluatedRules && trade.violatedRules) {
        return trade;
      }

      // Evaluate trade
      return evaluateAndUpdateTrade(trade, trades, settings);
    });
  }, [trades, settings.advanced?.tradingRules]);
}

