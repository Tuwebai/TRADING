/**
 * Goals store using Zustand
 * Manages trading goals and objectives
 */

import { create } from 'zustand';
import type { TradingGoal, GoalPeriod, GoalType } from '@/types/Trading';
import { generateId } from '@/lib/utils';

// Helper to get date range for period
const getDateRange = (period: GoalPeriod): { start: string; end: string } => {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

interface GoalsStore {
  goals: TradingGoal[];
  isLoading: boolean;
  
  // Actions
  loadGoals: () => void;
  addGoal: (
    period: GoalPeriod,
    type: GoalType,
    target: number,
    options?: {
      isPrimary?: boolean;
      isBinding?: boolean;
      constraintType?: TradingGoal['constraintType'];
      constraintConfig?: TradingGoal['constraintConfig'];
      consequences?: TradingGoal['consequences'];
    }
  ) => void;
  updateGoal: (id: string, updates: Partial<TradingGoal>) => void;
  deleteGoal: (id: string) => void;
  getGoalsByPeriod: (period: GoalPeriod) => TradingGoal[];
  updateGoalProgress: (goalId: string, current: number) => void;
  setPrimaryGoal: (goalId: string | null) => void;
  getPrimaryGoal: () => TradingGoal | null;
}

export const useGoalsStore = create<GoalsStore>((set, get) => ({
  goals: [],
  isLoading: false,

  loadGoals: () => {
    set({ isLoading: true });
    try {
      // Load from localStorage
      const stored = localStorage.getItem('trading_log_goals');
      const goals = stored ? JSON.parse(stored) : [];
      set({ goals, isLoading: false });
    } catch (error) {
      console.error('Error loading goals:', error);
      set({ isLoading: false });
    }
  },

  addGoal: (
    period: GoalPeriod,
    type: GoalType,
    target: number,
    options?: {
      isPrimary?: boolean;
      isBinding?: boolean;
      constraintType?: TradingGoal['constraintType'];
      constraintConfig?: TradingGoal['constraintConfig'];
      consequences?: TradingGoal['consequences'];
    }
  ) => {
    const now = new Date().toISOString();
    const dateRange = getDateRange(period);
    
    // If setting as primary, unset other primary goals
    const goals = get().goals;
    if (options?.isPrimary) {
      goals.forEach(g => {
        if (g.isPrimary) {
          g.isPrimary = false;
        }
      });
    }
    
    const newGoal: TradingGoal = {
      id: generateId(),
      period,
      type,
      target,
      current: 0,
      startDate: dateRange.start,
      endDate: dateRange.end,
      completed: false,
      createdAt: now,
      updatedAt: now,
      isPrimary: options?.isPrimary ?? false,
      isBinding: options?.isBinding ?? false,
      constraintType: options?.constraintType ?? 'none',
      constraintConfig: options?.constraintConfig,
      consequences: options?.consequences,
      failureCount: 0,
      generatedInsightIds: [],
    };

    const updatedGoals = [...goals, newGoal];
    set({ goals: updatedGoals });
    localStorage.setItem('trading_log_goals', JSON.stringify(updatedGoals));
  },

  setPrimaryGoal: (goalId: string | null) => {
    const goals = get().goals.map(goal => ({
      ...goal,
      isPrimary: goal.id === goalId,
    }));
    set({ goals });
    localStorage.setItem('trading_log_goals', JSON.stringify(goals));
  },

  getPrimaryGoal: () => {
    return get().goals.find(g => g.isPrimary) || null;
  },

  updateGoal: (id: string, updates: Partial<TradingGoal>) => {
    const goals = get().goals.map(goal =>
      goal.id === id
        ? { ...goal, ...updates, updatedAt: new Date().toISOString() }
        : goal
    );
    set({ goals });
    localStorage.setItem('trading_log_goals', JSON.stringify(goals));
  },

  deleteGoal: (id: string) => {
    const goals = get().goals.filter(goal => goal.id !== id);
    set({ goals });
    localStorage.setItem('trading_log_goals', JSON.stringify(goals));
  },

  getGoalsByPeriod: (period: GoalPeriod) => {
    return get().goals.filter(goal => goal.period === period);
  },

  updateGoalProgress: (goalId: string, current: number) => {
    const goals = get().goals.map(goal => {
      if (goal.id === goalId) {
        const completed = current >= goal.target;
        return {
          ...goal,
          current,
          completed,
          updatedAt: new Date().toISOString(),
        };
      }
      return goal;
    });
    set({ goals });
    localStorage.setItem('trading_log_goals', JSON.stringify(goals));
  },
}));

