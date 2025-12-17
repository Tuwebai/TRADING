/**
 * Goal Contract System
 * Handles automatic consequences when binding goals are violated
 */

import type { TradingGoal, Settings } from '@/types/Trading';

/**
 * Apply consequences for a binding goal violation
 */
export function applyGoalConsequences(
  goal: TradingGoal,
  settings: Settings
): Partial<Settings> {
  if (!goal.isBinding || !goal.consequences) {
    return {};
  }

  const consequences = goal.consequences;
  const updates: Partial<Settings> = {};

  // Apply cooldown (block trading for X hours)
  if (consequences.cooldownHours) {
    const blockedUntil = new Date();
    blockedUntil.setHours(blockedUntil.getHours() + consequences.cooldownHours);
    
    if (!updates.advanced) {
      updates.advanced = { ...settings.advanced! };
    }
    if (!updates.advanced.ultraDisciplinedMode) {
      updates.advanced.ultraDisciplinedMode = {
        enabled: true,
        blockOnRuleBreak: true,
        blockedUntil: null,
      };
    }
    updates.advanced.ultraDisciplinedMode.blockedUntil = blockedUntil.toISOString();
    updates.advanced.ultraDisciplinedMode.enabled = true;
    updates.advanced.ultraDisciplinedMode.blockOnRuleBreak = true;
  }

  // Reduce risk per trade
  if (consequences.reduceRiskPercent) {
    const currentRisk = settings.riskPerTrade;
    const reducedRisk = currentRisk * (1 - consequences.reduceRiskPercent / 100);
    
    updates.riskPerTrade = Math.max(0.1, reducedRisk); // Don't go below 0.1%
  }

  return updates;
}

/**
 * Check if a goal violation should trigger consequences
 */
export function shouldApplyConsequences(
  goal: TradingGoal,
  previousCurrent: number
): boolean {
  if (!goal.isBinding) {
    return false;
  }

  // Check if goal just failed (crossed the threshold)
  const isMaxGoal = goal.type === 'numTrades';
  const wasPassing = isMaxGoal 
    ? previousCurrent <= goal.target 
    : previousCurrent >= goal.target;
  
  const isNowFailing = isMaxGoal
    ? goal.current > goal.target
    : goal.current < goal.target;

  return wasPassing && isNowFailing;
}

