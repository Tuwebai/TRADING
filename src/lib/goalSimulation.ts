/**
 * Goal Future Simulation
 * Projects future performance based on goal and historical data
 */

import type { TradingGoal, Trade, Settings } from '@/types/Trading';
import { calculateAnalytics } from './calculations';

export interface GoalSimulationResult {
  projectedValue: number;
  projectedDays: number;
  isRealistic: boolean;
  warning?: string;
  projectionBreakdown: {
    conservative: number;
    moderate: number;
    optimistic: number;
  };
}

/**
 * Simulate future performance for a goal
 */
export function simulateGoalFuture(
  goal: TradingGoal,
  trades: Trade[],
  _settings: Settings,
  projectionDays: number = 90
): GoalSimulationResult {
  const analytics = calculateAnalytics(trades.filter(t => t.status === 'closed'));

  // Get historical performance
  const closedTrades = trades.filter(t => t.status === 'closed');
  if (closedTrades.length === 0) {
    return {
      projectedValue: 0,
      projectedDays: projectionDays,
      isRealistic: false,
      warning: 'Insuficientes datos históricos para hacer proyecciones.',
      projectionBreakdown: {
        conservative: 0,
        moderate: 0,
        optimistic: 0,
      },
    };
  }

  let projectedValue = 0;
  let conservative = 0;
  let moderate = 0;
  let optimistic = 0;
  let isRealistic = true;
  let warning: string | undefined;

  switch (goal.type) {
    case 'pnl': {
      // Calculate average daily PnL
      const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const firstTradeDate = new Date(Math.min(...closedTrades.map(t => new Date(t.entryDate).getTime())));
      const lastTradeDate = new Date(Math.max(...closedTrades.map(t => new Date(t.exitDate || t.entryDate).getTime())));
      const daysDiff = Math.max(1, (lastTradeDate.getTime() - firstTradeDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgDailyPnL = totalPnL / daysDiff;

      // Projections
      moderate = avgDailyPnL * projectionDays;
      conservative = moderate * 0.7; // 30% lower
      optimistic = moderate * 1.3; // 30% higher

      projectedValue = moderate;

      // Check if goal is realistic
      if (goal.period === 'daily' && goal.target > avgDailyPnL * 2) {
        isRealistic = false;
        warning = `Tu promedio diario histórico (${avgDailyPnL.toFixed(2)}) es mucho menor que tu objetivo (${goal.target.toFixed(2)}). Considera ajustar el objetivo.`;
      } else if (goal.period === 'monthly' && goal.target > moderate * 1.5) {
        isRealistic = false;
        warning = `Tu proyección mensual conservadora (${(moderate / 30).toFixed(2)} por día) es mucho menor que tu objetivo mensual. Considera ajustar el objetivo.`;
      }
      break;
    }

    case 'winRate': {
      // Win rate doesn't project linearly, use current win rate
      moderate = analytics.winRate;
      conservative = Math.max(0, moderate - 5); // 5% lower
      optimistic = Math.min(100, moderate + 5); // 5% higher

      projectedValue = moderate;

      // Check if goal is realistic
      if (goal.target > analytics.winRate + 15) {
        isRealistic = false;
        warning = `Tu win rate histórico (${analytics.winRate.toFixed(1)}%) es significativamente menor que tu objetivo (${goal.target.toFixed(1)}%). Considera ajustar el objetivo o revisar tu estrategia.`;
      }
      break;
    }

    case 'numTrades': {
      // Calculate average trades per day
      const totalTrades = closedTrades.length;
      const firstTradeDate = new Date(Math.min(...closedTrades.map(t => new Date(t.entryDate).getTime())));
      const lastTradeDate = new Date(Math.max(...closedTrades.map(t => new Date(t.exitDate || t.entryDate).getTime())));
      const daysDiff = Math.max(1, (lastTradeDate.getTime() - firstTradeDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgTradesPerDay = totalTrades / daysDiff;

      // Projections
      moderate = avgTradesPerDay * projectionDays;
      conservative = moderate * 0.8; // 20% lower
      optimistic = moderate * 1.2; // 20% higher

      projectedValue = moderate;

      // Check if goal is realistic (for daily/weekly)
      if (goal.period === 'daily' && goal.target < avgTradesPerDay * 0.5) {
        isRealistic = false;
        warning = `Tu promedio diario histórico (${avgTradesPerDay.toFixed(1)} trades/día) es mucho mayor que tu objetivo (${goal.target}). Considera si esto es intencional (reducción de frecuencia).`;
      }
      break;
    }
  }

  return {
    projectedValue,
    projectedDays: projectionDays,
    isRealistic,
    warning,
    projectionBreakdown: {
      conservative,
      moderate,
      optimistic,
    },
  };
}

