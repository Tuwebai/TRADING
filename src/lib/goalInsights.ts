/**
 * Goal-based Insights Generation
 * Generates insights automatically when goals fail or succeed
 */

import type { TradingGoal, Trade, Settings } from '@/types/Trading';
import type { ProactiveInsight } from './proactiveInsights';
import { generateId } from './utils';

/**
 * Insight generated from a goal failure/success
 */
export interface GoalGeneratedInsight {
  id: string;
  goalId: string;
  goalTitle: string;
  severity: 'critical' | 'important';
  whatHappened: string;
  possibleCause: string;
  actionableQuestion: string;
  generatedAt: string; // ISO date string
  data?: Record<string, any>;
}

/**
 * Analyze why a goal failed based on trading data
 */
function inferFailureCause(
  goal: TradingGoal,
  trades: Trade[],
  _settings: Settings
): string {
  const now = new Date();
  const goalStartDate = new Date(goal.startDate);
  const recentTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    return tradeDate >= goalStartDate && tradeDate <= now;
  });

  // Check if failure happened after a loss
  const recentClosedTrades = recentTrades.filter(t => t.status === 'closed' && t.exitDate);
  if (recentClosedTrades.length > 0) {
    const lastTrades = recentClosedTrades
      .sort((a, b) => new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime())
      .slice(0, 3);
    
    const hadRecentLoss = lastTrades.some(t => (t.pnl || 0) < 0);
    if (hadRecentLoss) {
      return 'Ocurrió luego de una pérdida reciente.';
    }
  }

  // Check for overtrading
  if (goal.type === 'numTrades' && goal.current > goal.target) {
    const avgTradesPerDay = recentTrades.length / Math.max(1, (now.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));
    if (avgTradesPerDay > 3) {
      return 'Frecuencia de trading superior a tu promedio histórico.';
    }
  }

  // Check for emotional trading
  const recentEmotions = recentTrades
    .map(t => t.journal?.preTrade?.emotion || t.journal?.duringTrade?.emotion)
    .filter(e => e !== null && e !== undefined);
  
  if (recentEmotions.length > 0) {
    const negativeEmotions = recentEmotions.filter(e => 
      ['ansioso', 'temeroso', 'frustrado', 'deprimido'].includes(e!)
    );
    if (negativeEmotions.length / recentEmotions.length > 0.5) {
      return 'Patrón de emociones negativas detectado en operaciones recientes.';
    }
  }

  return 'Desviación del comportamiento esperado según tu historial.';
}

/**
 * Generate actionable question based on goal type and failure
 */
function generateActionableQuestion(
  goal: TradingGoal,
  possibleCause: string
): string {
  if (goal.type === 'numTrades') {
    if (goal.current > goal.target) {
      if (possibleCause.includes('pérdida')) {
        return '¿Qué estabas intentando recuperar?';
      }
      return '¿Qué te impulsó a exceder tu límite?';
    }
  }
  
  if (goal.type === 'pnl') {
    if (goal.current < goal.target) {
      if (possibleCause.includes('pérdida')) {
        return '¿Estás operando con el tamaño de posición correcto?';
      }
      return '¿Tu estrategia necesita ajustes o más disciplina?';
    }
  }

  if (goal.type === 'winRate') {
    if (goal.current < goal.target) {
      return '¿Estás entrando en setups que realmente conoces?';
    }
  }

  return '¿Qué puedes aprender de esta situación?';
}

/**
 * Generate insight when a goal fails
 */
export function generateGoalFailureInsight(
  goal: TradingGoal,
  trades: Trade[],
  settings: Settings
): GoalGeneratedInsight | null {
  // Only generate if goal is not completed and current exceeds target (for max goals)
  // or current is below target (for min goals)
  const isMaxGoal = goal.type === 'numTrades'; // Max trades is a "don't exceed" goal
  const hasFailed = isMaxGoal 
    ? goal.current > goal.target 
    : goal.current < goal.target;

  if (!hasFailed || goal.completed) {
    return null;
  }

  const possibleCause = inferFailureCause(goal, trades, settings);
  const actionableQuestion = generateActionableQuestion(goal, possibleCause);

  // Determine what happened
  const typeLabels: Record<TradingGoal['type'], string> = {
    pnl: 'PnL',
    winRate: 'Tasa de Éxito',
    numTrades: 'Número de Operaciones',
  };

  const periodLabels: Record<TradingGoal['period'], string> = {
    daily: 'diario',
    weekly: 'semanal',
    monthly: 'mensual',
    yearly: 'anual',
  };

  let whatHappened = '';
  if (goal.type === 'numTrades' && goal.current > goal.target) {
    whatHappened = `Superaste tu límite de ${goal.target} trades ${periodLabels[goal.period]}. Realizaste ${goal.current} operaciones.`;
  } else if (goal.type === 'pnl' && goal.current < goal.target) {
    whatHappened = `No alcanzaste tu objetivo de PnL ${periodLabels[goal.period]}. Objetivo: ${goal.target.toFixed(2)}, Actual: ${goal.current.toFixed(2)}.`;
  } else if (goal.type === 'winRate' && goal.current < goal.target) {
    whatHappened = `Tu tasa de éxito (${goal.current.toFixed(1)}%) está por debajo de tu objetivo ${periodLabels[goal.period]} (${goal.target.toFixed(1)}%).`;
  }

  // Determine severity
  const severity: 'critical' | 'important' = 
    goal.isBinding || goal.failureCount && goal.failureCount > 2 
      ? 'critical' 
      : 'important';

  return {
    id: generateId(),
    goalId: goal.id,
    goalTitle: `${typeLabels[goal.type]} ${periodLabels[goal.period]}`,
    severity,
    whatHappened,
    possibleCause,
    actionableQuestion,
    generatedAt: new Date().toISOString(),
    data: {
      goalType: goal.type,
      goalPeriod: goal.period,
      target: goal.target,
      current: goal.current,
      failureCount: (goal.failureCount || 0) + 1,
    },
  };
}

/**
 * Convert goal-generated insight to ProactiveInsight format for display
 */
export function goalInsightToProactiveInsight(
  insight: GoalGeneratedInsight
): ProactiveInsight {
  return {
    id: insight.id,
    severity: insight.severity,
    title: `Objetivo No Cumplido: ${insight.goalTitle}`,
    whatHappened: insight.whatHappened,
    whyHappened: insight.possibleCause,
    whatToDoNow: `🤔 ${insight.actionableQuestion}`,
    priority: insight.severity === 'critical' ? 90 : 60,
    data: insight.data,
  };
}

