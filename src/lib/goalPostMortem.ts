/**
 * Goal Post-Mortem System
 * Automatically generates post-mortems when goals fail
 */

import type { TradingGoal, Trade, Settings } from '@/types/Trading';
import type { GoalPostMortem } from './storage';
import { generateId } from './utils';
import { evaluateTradeRules } from './tradeRuleEvaluation';
import { generateGoalFailureInsight } from './goalInsights';

/**
 * Find similar historical patterns
 */
function findHistoricalPatterns(
  goal: TradingGoal,
  trades: Trade[]
): string[] {
  const patterns: string[] = [];
  
  // Check if this goal has failed before
  if (goal.failureCount && goal.failureCount > 1) {
    patterns.push(`Este objetivo ha fallado ${goal.failureCount} veces anteriormente.`);
  }

  // Check for similar goals that failed
  // This would require access to all goals, so we'll keep it simple for now
  const recentFailures = trades.filter(t => {
    if (t.status !== 'closed' || !t.exitDate) return false;
    const tradeDate = new Date(t.exitDate);
    const goalStartDate = new Date(goal.startDate);
    return tradeDate >= goalStartDate && (t.pnl || 0) < 0;
  }).length;

  if (recentFailures > 3) {
    patterns.push(`${recentFailures} pérdidas consecutivas detectadas durante el período del objetivo.`);
  }

  return patterns;
}

/**
 * Find related rule violations
 */
function findRelatedRuleViolations(
  goal: TradingGoal,
  trades: Trade[],
  settings: Settings
): string[] {
  const violations: string[] = [];
  const goalStartDate = new Date(goal.startDate);
  const now = new Date();

  // Get trades in goal period
  const periodTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    return tradeDate >= goalStartDate && tradeDate <= now && t.status === 'closed';
  });

  // Evaluate rules for each trade
  for (const trade of periodTrades) {
    const evaluation = evaluateTradeRules(trade, trades, settings);
    if (evaluation.violatedRules.length > 0) {
      evaluation.violatedRules.forEach(vr => {
        if (!violations.includes(vr.ruleKey)) {
          violations.push(vr.ruleKey);
        }
      });
    }
  }

  return violations;
}

/**
 * Generate post-mortem for a failed goal
 */
export function generateGoalPostMortem(
  goal: TradingGoal,
  trades: Trade[],
  settings: Settings
): GoalPostMortem | null {
  // Check if goal has actually failed
  const isMaxGoal = goal.type === 'numTrades';
  const hasFailed = isMaxGoal 
    ? goal.current > goal.target 
    : goal.current < goal.target;

  if (!hasFailed || goal.completed) {
    return null;
  }

  // Generate insight to get cause analysis
  const insight = generateGoalFailureInsight(goal, trades, settings);
  if (!insight) {
    return null;
  }

  const cause = insight.possibleCause;
  const relatedRuleViolations = findRelatedRuleViolations(goal, trades, settings);
  const historicalPatterns = findHistoricalPatterns(goal, trades);

  const typeLabels: Record<TradingGoal['type'], string> = {
    pnl: 'PnL',
    winRate: 'Tasa de Éxito',
    numTrades: 'Número de Operaciones',
  };

  const periodLabels: Record<TradingGoal['period'], string> = {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    yearly: 'Anual',
  };

  const goalTitle = `${typeLabels[goal.type]} ${periodLabels[goal.period]}`;

  return {
    id: generateId(),
    goalId: goal.id,
    goalTitle,
    failedAt: new Date().toISOString(),
    cause,
    relatedRuleViolations,
    historicalPatterns,
    createdAt: new Date().toISOString(),
  };
}

