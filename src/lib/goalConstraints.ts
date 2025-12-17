/**
 * Goal Constraint System
 * Determines if UI elements should be disabled based on active goal constraints
 */

import type { TradingGoal, Trade, Settings } from '@/types/Trading';

/**
 * Check if a goal constraint is currently active
 */
export function isGoalConstraintActive(
  goal: TradingGoal,
  trades: Trade[],
  _settings: Settings
): {
  active: boolean;
  message: string;
  reason?: string;
} {
  if (!goal.constraintType || goal.constraintType === 'none') {
    return { active: false, message: '' };
  }

  const now = new Date();
  const goalStartDate = new Date(goal.startDate);
  const goalEndDate = new Date(goal.endDate);

  // Check if goal period is active
  if (now < goalStartDate || now > goalEndDate) {
    return { active: false, message: '' };
  }

  switch (goal.constraintType) {
    case 'session': {
      if (!goal.constraintConfig?.session) {
        return { active: false, message: '' };
      }

      const session = goal.constraintConfig.session;
      const currentHour = now.getHours();
      
      // Session hours (approximate)
      const sessionHours: Record<string, { start: number; end: number }> = {
        'asian': { start: 0, end: 9 },
        'london': { start: 8, end: 17 },
        'new-york': { start: 13, end: 22 },
        'overlap': { start: 13, end: 17 },
      };

      const hours = sessionHours[session];
      if (!hours) {
        return { active: false, message: '' };
      }

      const isInSession = currentHour >= hours.start && currentHour < hours.end;
      
      if (!isInSession) {
        const sessionLabels: Record<string, string> = {
          'asian': 'Asian',
          'london': 'London',
          'new-york': 'New York',
          'overlap': 'Overlap',
        };
        return {
          active: true,
          message: `Fuera del horario permitido por tu plan. Solo puedes operar durante la sesión ${sessionLabels[session]} (${hours.start}:00 - ${hours.end}:00).`,
          reason: 'session',
        };
      }
      break;
    }

    case 'hours': {
      const startHour = goal.constraintConfig?.startHour ?? 0;
      const endHour = goal.constraintConfig?.endHour ?? 23;
      const currentHour = now.getHours();

      if (currentHour < startHour || currentHour >= endHour) {
        return {
          active: true,
          message: `Fuera del horario permitido por tu plan. Solo puedes operar entre las ${startHour}:00 y ${endHour}:00.`,
          reason: 'hours',
        };
      }
      break;
    }

    case 'max-trades': {
      const maxValue = goal.constraintConfig?.maxValue ?? goal.target;
      const goalStartDate = new Date(goal.startDate);
      
      const periodTrades = trades.filter(t => {
        const tradeDate = new Date(t.entryDate);
        return tradeDate >= goalStartDate && tradeDate <= now;
      });

      if (periodTrades.length >= maxValue) {
        return {
          active: true,
          message: `Has alcanzado tu límite de ${maxValue} operaciones para este período.`,
          reason: 'max-trades',
        };
      }
      break;
    }

    case 'max-loss': {
      const maxValue = goal.constraintConfig?.maxValue ?? goal.target;
      const goalStartDate = new Date(goal.startDate);
      
      const periodTrades = trades.filter(t => {
        const tradeDate = new Date(t.entryDate);
        return tradeDate >= goalStartDate && tradeDate <= now && t.status === 'closed';
      });

      const totalLoss = periodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      
      if (totalLoss <= -Math.abs(maxValue)) {
        return {
          active: true,
          message: `Has alcanzado tu límite de pérdida para este período (${Math.abs(maxValue).toFixed(2)}).`,
          reason: 'max-loss',
        };
      }
      break;
    }

    case 'custom':
      // Custom constraints should be handled by the calling code
      return { active: false, message: '' };
  }

  return { active: false, message: '' };
}

/**
 * Get all active goal constraints
 */
export function getActiveGoalConstraints(
  goals: TradingGoal[],
  trades: Trade[],
  settings: Settings
): Array<{
  goal: TradingGoal;
  message: string;
  reason?: string;
}> {
  const activeConstraints: Array<{
    goal: TradingGoal;
    message: string;
    reason?: string;
  }> = [];

  for (const goal of goals) {
    const constraint = isGoalConstraintActive(goal, trades, settings);
    if (constraint.active) {
      activeConstraints.push({
        goal,
        message: constraint.message,
        reason: constraint.reason,
      });
    }
  }

  return activeConstraints;
}

/**
 * Check if trading should be blocked based on goals
 */
export function shouldBlockTradingDueToGoals(
  goals: TradingGoal[],
  trades: Trade[],
  settings: Settings
): {
  blocked: boolean;
  message: string;
  blockingGoals: TradingGoal[];
} {
  const primaryGoal = goals.find(g => g.isPrimary);
  if (!primaryGoal) {
    return { blocked: false, message: '', blockingGoals: [] };
  }

  const constraints = getActiveGoalConstraints([primaryGoal], trades, settings);
  const blockingConstraints = constraints.filter(c => 
    c.goal.isPrimary || (c.goal.isBinding && c.goal.constraintType !== 'none')
  );

  if (blockingConstraints.length > 0) {
    return {
      blocked: true,
      message: blockingConstraints[0].message,
      blockingGoals: blockingConstraints.map(c => c.goal),
    };
  }

  return { blocked: false, message: '', blockingGoals: [] };
}

