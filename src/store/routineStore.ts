/**
 * Routine store using Zustand
 * Manages all routine checklist state and operations
 */

import { create } from 'zustand';
import type { Routine, RoutineItem, RoutineType, DailyRoutineExecution, RoutineBlockStatus, PostTradeData } from '@/types/Trading';
import { routineStorage, routineExecutionStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { getTodayExecution, getTodayDate, calculateBlockStatus } from '@/lib/routineDiscipline';

interface RoutineStore {
  routines: Routine[];
  dailyExecutions: DailyRoutineExecution[];
  isLoading: boolean;
  
  // Actions
  loadRoutines: () => void;
  loadDailyExecutions: () => void;
  getRoutine: (type: RoutineType) => Routine | null;
  getTodayExecution: () => DailyRoutineExecution;
  addRoutineItem: (type: RoutineType, text: string) => void;
  updateRoutineItem: (type: RoutineType, itemId: string, updates: Partial<RoutineItem>) => void;
  deleteRoutineItem: (type: RoutineType, itemId: string) => void;
  toggleRoutineItem: (type: RoutineType, itemId: string) => void;
  reorderRoutineItems: (type: RoutineType, itemIds: string[]) => void;
  
  // Daily execution actions
  markBlockComplete: (type: RoutineType) => void;
  markBlockSkipped: (type: RoutineType, reason: string) => void;
  toggleItemCompletion: (type: RoutineType, itemId: string, completed: boolean, note?: string) => void;
  markEndOfDay: (isValid: boolean, justification?: string) => void;
  savePostTradeData: (data: PostTradeData) => void;
}

const createDefaultRoutine = (type: RoutineType): Routine => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    type,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  routines: [],
  dailyExecutions: [],
  isLoading: false,

  loadRoutines: () => {
    set({ isLoading: true });
    try {
      const routines = routineStorage.getAll();
      set({ routines, isLoading: false });
    } catch (error) {
      console.error('Error loading routines:', error);
      set({ isLoading: false });
    }
  },

  loadDailyExecutions: () => {
    try {
      const executions = routineExecutionStorage.getAll();
      set({ dailyExecutions: executions });
    } catch (error) {
      console.error('Error loading daily executions:', error);
    }
  },

  getRoutine: (type: RoutineType) => {
    const routines = get().routines;
    let routine = routines.find(r => r.type === type);
    
    if (!routine) {
      // Create default routine if it doesn't exist
      routine = createDefaultRoutine(type);
      const newRoutines = [...routines, routine];
      set({ routines: newRoutines });
      routineStorage.upsert(routine);
    }
    
    return routine;
  },

  getTodayExecution: () => {
    const execution = getTodayExecution();
    // Sync with store
    const executions = get().dailyExecutions;
    const existingIndex = executions.findIndex(exec => exec.date === execution.date);
    if (existingIndex === -1) {
      set({ dailyExecutions: [...executions, execution] });
    } else {
      const updated = [...executions];
      updated[existingIndex] = execution;
      set({ dailyExecutions: updated });
    }
    return execution;
  },

  addRoutineItem: (type: RoutineType, text: string) => {
    const routines = get().routines;
    let routine = routines.find(r => r.type === type);
    
    if (!routine) {
      routine = createDefaultRoutine(type);
    }
    
    const now = new Date().toISOString();
    const newItem: RoutineItem = {
      id: generateId(),
      text,
      completed: false,
      order: routine.items.length,
      createdAt: now,
      updatedAt: now,
    };
    
    const updatedRoutine: Routine = {
      ...routine,
      items: [...routine.items, newItem],
      updatedAt: now,
    };
    
    const updatedRoutines = routine
      ? routines.map(r => r.type === type ? updatedRoutine : r)
      : [...routines, updatedRoutine];
    
    set({ routines: updatedRoutines });
    routineStorage.upsert(updatedRoutine);
  },

  updateRoutineItem: (type: RoutineType, itemId: string, updates: Partial<RoutineItem>) => {
    const routines = get().routines;
    const routine = routines.find(r => r.type === type);
    
    if (!routine) return;
    
    const updatedItems = routine.items.map(item =>
      item.id === itemId
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item
    );
    
    const updatedRoutine: Routine = {
      ...routine,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedRoutines = routines.map(r => r.type === type ? updatedRoutine : r);
    set({ routines: updatedRoutines });
    routineStorage.upsert(updatedRoutine);
  },

  deleteRoutineItem: (type: RoutineType, itemId: string) => {
    const routines = get().routines;
    const routine = routines.find(r => r.type === type);
    
    if (!routine) return;
    
    const updatedItems = routine.items
      .filter(item => item.id !== itemId)
      .map((item, index) => ({ ...item, order: index }));
    
    const updatedRoutine: Routine = {
      ...routine,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedRoutines = routines.map(r => r.type === type ? updatedRoutine : r);
    set({ routines: updatedRoutines });
    routineStorage.upsert(updatedRoutine);
  },

  toggleRoutineItem: (type: RoutineType, itemId: string) => {
    const routines = get().routines;
    const routine = routines.find(r => r.type === type);
    
    if (!routine) return;
    
    const item = routine.items.find(i => i.id === itemId);
    if (!item) return;
    
    const newCompleted = !item.completed;
    
    // Update routine item
    const updatedItems = routine.items.map(item =>
      item.id === itemId
        ? { ...item, completed: newCompleted, updatedAt: new Date().toISOString() }
        : item
    );
    
    const updatedRoutine: Routine = {
      ...routine,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedRoutines = routines.map(r => r.type === type ? updatedRoutine : r);
    set({ routines: updatedRoutines });
    routineStorage.upsert(updatedRoutine);
    
    // Update daily execution
    get().toggleItemCompletion(type, itemId, newCompleted);
  },

  reorderRoutineItems: (type: RoutineType, itemIds: string[]) => {
    const routines = get().routines;
    const routine = routines.find(r => r.type === type);
    
    if (!routine) return;
    
    // Create a map for quick lookup
    const itemMap = new Map(routine.items.map(item => [item.id, item]));
    
    // Reorder items based on the new order
    const reorderedItems = itemIds
      .map((id, index) => {
        const item = itemMap.get(id);
        return item ? { ...item, order: index, updatedAt: new Date().toISOString() } : null;
      })
      .filter((item): item is RoutineItem => item !== null);
    
    const updatedRoutine: Routine = {
      ...routine,
      items: reorderedItems,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedRoutines = routines.map(r => r.type === type ? updatedRoutine : r);
    set({ routines: updatedRoutines });
    routineStorage.upsert(updatedRoutine);
  },

  // Daily execution actions
  markBlockComplete: (type: RoutineType) => {
    const execution = get().getTodayExecution();
    const routine = get().getRoutine(type);
    
    if (!routine) return;
    
    const now = new Date().toISOString();
    const block = execution.blocks[type];
    
    // Check if all items are completed
    const allCompleted = routine.items.every(item => {
      const itemCompletion = block.itemCompletions[item.id];
      return itemCompletion?.completed || false;
    });
    
    const updatedBlock = {
      ...block,
      status: allCompleted ? 'completed' : 'incomplete',
      completedAt: allCompleted ? now : null,
      skippedAt: null,
      skipReason: null,
    };
    
    const updatedExecution: DailyRoutineExecution = {
      ...execution,
      blocks: {
        ...execution.blocks,
        [type]: updatedBlock,
      },
      updatedAt: now,
    };
    
    routineExecutionStorage.save(updatedExecution);
    get().loadDailyExecutions();
  },

  markBlockSkipped: (type: RoutineType, reason: string) => {
    if (!reason.trim()) {
      alert('Debes proporcionar un motivo para saltar esta rutina.');
      return;
    }
    
    const execution = get().getTodayExecution();
    const now = new Date().toISOString();
    const block = execution.blocks[type];
    
    const updatedBlock = {
      ...block,
      status: 'skipped' as RoutineBlockStatus,
      skippedAt: now,
      skipReason: reason,
      completedAt: null,
    };
    
    const updatedExecution: DailyRoutineExecution = {
      ...execution,
      blocks: {
        ...execution.blocks,
        [type]: updatedBlock,
      },
      updatedAt: now,
    };
    
    routineExecutionStorage.save(updatedExecution);
    get().loadDailyExecutions();
  },

  toggleItemCompletion: (type: RoutineType, itemId: string, completed: boolean, note?: string) => {
    const execution = get().getTodayExecution();
    const routine = get().getRoutine(type);
    
    if (!routine) return;
    
    const now = new Date().toISOString();
    const block = execution.blocks[type];
    
    const updatedItemCompletions = {
      ...block.itemCompletions,
      [itemId]: {
        completed,
        completedAt: completed ? now : null,
        note: note || block.itemCompletions[itemId]?.note,
      },
    };
    
    // Recalculate block status
    const totalItems = routine.items.length;
    const completedItems = Object.values(updatedItemCompletions).filter(
      item => item.completed
    ).length;
    
    let newStatus: RoutineBlockStatus = block.status;
    if (completedItems === 0) {
      newStatus = 'pending';
    } else if (completedItems === totalItems) {
      newStatus = 'completed';
    } else {
      newStatus = 'incomplete';
    }
    
    const updatedBlock = {
      ...block,
      status: newStatus,
      itemCompletions: updatedItemCompletions,
      completedAt: newStatus === 'completed' ? now : block.completedAt,
    };
    
    const updatedExecution: DailyRoutineExecution = {
      ...execution,
      blocks: {
        ...execution.blocks,
        [type]: updatedBlock,
      },
      updatedAt: now,
    };
    
    routineExecutionStorage.save(updatedExecution);
    get().loadDailyExecutions();
  },

  markEndOfDay: (isValid: boolean, justification?: string) => {
    if (!isValid && !justification?.trim()) {
      alert('Debes proporcionar una justificación si el día fue inválido.');
      return;
    }
    
    const execution = get().getTodayExecution();
    const now = new Date().toISOString();
    
    const updatedExecution: DailyRoutineExecution = {
      ...execution,
      endOfDay: {
        marked: true,
        markedAt: now,
        isValid,
        justification: isValid ? null : (justification || null),
      },
      updatedAt: now,
    };
    
    routineExecutionStorage.save(updatedExecution);
    get().loadDailyExecutions();
  },

  savePostTradeData: (data: PostTradeData) => {
    // This would be stored separately or attached to trades
    // For now, we'll store it in the daily execution
    const execution = get().getTodayExecution();
    const now = new Date().toISOString();
    
    // Store post-trade data in the post-trade block
    const postTradeBlock = execution.blocks['post-trade'];
    // We could extend this to store multiple post-trade entries
    // For now, we'll just mark the block as having data
    
    const updatedExecution: DailyRoutineExecution = {
      ...execution,
      blocks: {
        ...execution.blocks,
        'post-trade': {
          ...postTradeBlock,
          status: 'completed',
          completedAt: now,
        },
      },
      updatedAt: now,
    };
    
    routineExecutionStorage.save(updatedExecution);
    get().loadDailyExecutions();
  },
}));
