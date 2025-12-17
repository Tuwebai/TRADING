/**
 * Goal Integration System
 * Integrates goals with insights, post-mortems, and consequences
 */

import type { TradingGoal, Trade, Settings } from '@/types/Trading';
import { generateGoalFailureInsight } from './goalInsights';
import { generateGoalPostMortem } from './goalPostMortem';
import { applyGoalConsequences, shouldApplyConsequences } from './goalContracts';
import { goalInsightsStorage } from './storage';
import { goalPostMortemsStorage } from './storage';
/**
 * Evaluate goals and generate insights/post-mortems when needed
 * This should be called whenever goals are updated
 * 
 * Note: This function should be called from components, not from stores directly
 * to avoid circular dependencies
 */
export function evaluateGoals(
  goals: TradingGoal[],
  trades: Trade[],
  settings: Settings,
  updateGoal: (id: string, updates: Partial<TradingGoal>) => void,
  updateSettings: (updates: Partial<Settings>) => void,
  previousGoalStates?: Map<string, number>
): void {
  for (const goal of goals) {
    const previousCurrent = previousGoalStates?.get(goal.id) ?? goal.current;
    
    // Check if goal just failed
    const isMaxGoal = goal.type === 'numTrades';
    
    const isNowFailing = isMaxGoal
      ? goal.current > goal.target
      : goal.current < goal.target;

    // Generate insight if goal failed
    if (isNowFailing && !goal.completed) {
      const insight = generateGoalFailureInsight(goal, trades, settings);
      if (insight) {
        // Store insight
        goalInsightsStorage.add(insight);
        
        // Update goal with insight ID
        const insightIds = goal.generatedInsightIds || [];
        if (!insightIds.includes(insight.id)) {
          updateGoal(goal.id, {
            generatedInsightIds: [...insightIds, insight.id],
            failureCount: (goal.failureCount || 0) + 1,
            failedAt: new Date().toISOString(),
            lastFailedAt: new Date().toISOString(),
          });
        }

        // Generate post-mortem if this is a critical failure or binding goal
        if (goal.isBinding || (goal.failureCount && goal.failureCount > 2)) {
          const postMortem = generateGoalPostMortem(goal, trades, settings);
          if (postMortem) {
            goalPostMortemsStorage.add(postMortem);
          }
        }
      }
    }

    // Apply consequences if binding goal was violated
    if (shouldApplyConsequences(goal, previousCurrent)) {
      const consequenceUpdates = applyGoalConsequences(goal, settings);
      if (Object.keys(consequenceUpdates).length > 0) {
        updateSettings(consequenceUpdates);
      }
    }
  }
}

