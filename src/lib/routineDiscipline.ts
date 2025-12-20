/**
 * Routine discipline enforcement and validation
 * Checks if routines are completed before allowing trades
 */

import type { RoutineType, DailyRoutineExecution, RoutineBlockStatus } from '@/types/Trading';
import { routineExecutionStorage } from './storage';

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get today's routine execution or create a new one
 */
/**
 * Get today's routine execution (synchronous version - uses localStorage)
 * For Supabase sync, the routineStore handles synchronization automatically
 */
export function getTodayExecution(): DailyRoutineExecution {
  const today = getTodayDate();
  const existing = routineExecutionStorage.getByDate(today);
  
  if (existing) {
    return existing;
  }

  // Create new execution for today
  const now = new Date().toISOString();
  const defaultExecution: DailyRoutineExecution = {
    date: today,
    blocks: {
      morning: {
        status: 'pending',
        completedAt: null,
        skippedAt: null,
        skipReason: null,
        itemCompletions: {},
      },
      'pre-market': {
        status: 'pending',
        completedAt: null,
        skippedAt: null,
        skipReason: null,
        itemCompletions: {},
      },
      'pre-trade': {
        status: 'pending',
        completedAt: null,
        skippedAt: null,
        skipReason: null,
        itemCompletions: {},
      },
      'post-trade': {
        status: 'pending',
        completedAt: null,
        skippedAt: null,
        skipReason: null,
        itemCompletions: {},
      },
      'end-of-day': {
        status: 'pending',
        completedAt: null,
        skippedAt: null,
        skipReason: null,
        itemCompletions: {},
      },
    },
    endOfDay: {
      marked: false,
      markedAt: null,
      isValid: null,
      justification: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  routineExecutionStorage.save(defaultExecution);
  return defaultExecution;
}

/**
 * Check if pre-trade routine is 100% complete
 */
export function isPreTradeComplete(): {
  complete: boolean;
  missingItems: string[];
  message: string;
} {
  const today = getTodayExecution();
  const preTradeBlock = today.blocks['pre-trade'];

  // If skipped, it's not complete
  if (preTradeBlock.status === 'skipped') {
    return {
      complete: false,
      missingItems: [],
      message: `La lista Pre-Operación fue saltada. Motivo: ${preTradeBlock.skipReason || 'No especificado'}`,
    };
  }

  // If not completed, check items
  if (preTradeBlock.status !== 'completed') {
    return {
      complete: false,
      missingItems: [],
      message: 'La lista Pre-Operación no ha sido completada. Debes completarla antes de crear operaciones.',
    };
  }

  return {
    complete: true,
    missingItems: [],
    message: 'Pre-Operación completada correctamente.',
  };
}

/**
 * Calculate routine completion percentage for a block
 */
export function calculateBlockCompletion(
  execution: DailyRoutineExecution,
  blockType: RoutineType,
  totalItems: number
): number {
  const block = execution.blocks[blockType];
  if (block.status === 'completed') return 100;
  if (block.status === 'skipped') return 0;
  
  const completedItems = Object.values(block.itemCompletions).filter(
    item => item.completed
  ).length;
  
  return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
}

/**
 * Get block status based on item completions
 */
export function calculateBlockStatus(
  execution: DailyRoutineExecution,
  blockType: RoutineType,
  totalItems: number
): RoutineBlockStatus {
  const block = execution.blocks[blockType];
  
  if (block.status === 'skipped') return 'skipped';
  
  const completedItems = Object.values(block.itemCompletions).filter(
    item => item.completed
  ).length;
  
  if (completedItems === 0) return 'pending';
  if (completedItems === totalItems) return 'completed';
  return 'incomplete';
}

/**
 * Calculate discipline metrics
 */
export interface DisciplineMetrics {
  routinesCompletedPercent: number;
  daysOperatedWithoutRoutine: number;
  perfectDays: number;
  invalidDays: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
}

export function calculateDisciplineMetrics(
  executions: DailyRoutineExecution[]
): DisciplineMetrics {
  if (executions.length === 0) {
    return {
      routinesCompletedPercent: 0,
      daysOperatedWithoutRoutine: 0,
      perfectDays: 0,
      invalidDays: 0,
      totalDays: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  const sortedExecutions = [...executions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let perfectDays = 0;
  let invalidDays = 0;
  let daysOperatedWithoutRoutine = 0;
  let totalRoutineCompletions = 0;
  let totalRoutineBlocks = 0;

  sortedExecutions.forEach(exec => {
    // Check if all blocks are completed
    const allBlocksCompleted = Object.values(exec.blocks).every(
      block => block.status === 'completed'
    );
    
    if (allBlocksCompleted && exec.endOfDay.isValid === true) {
      perfectDays++;
    }
    
    if (exec.endOfDay.isValid === false) {
      invalidDays++;
    }

    // Check if pre-trade was skipped but trades were made (would need trades data)
    // For now, we'll count days where pre-trade was skipped
    if (exec.blocks['pre-trade'].status === 'skipped') {
      daysOperatedWithoutRoutine++;
    }

    // Count routine completions
    Object.values(exec.blocks).forEach(block => {
      totalRoutineBlocks++;
      if (block.status === 'completed') {
        totalRoutineCompletions++;
      }
    });
  });

  const routinesCompletedPercent = totalRoutineBlocks > 0
    ? (totalRoutineCompletions / totalRoutineBlocks) * 100
    : 0;

  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  sortedExecutions.forEach(exec => {
    const isPerfect = Object.values(exec.blocks).every(
      block => block.status === 'completed'
    ) && exec.endOfDay.isValid === true;

    if (isPerfect) {
      if (currentStreak === 0) currentStreak = 1;
      else currentStreak++;
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (currentStreak > 0 && tempStreak === currentStreak) {
        // Streak broken
      }
      tempStreak = 0;
    }
  });

  return {
    routinesCompletedPercent,
    daysOperatedWithoutRoutine,
    perfectDays,
    invalidDays,
    totalDays: executions.length,
    currentStreak,
    longestStreak,
  };
}

