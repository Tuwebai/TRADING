/**
 * Routine store using Zustand
 * Manages all routine checklist state and operations
 */

import { create } from 'zustand';
import type { Routine, RoutineItem, RoutineType } from '@/types/Trading';
import { routineStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface RoutineStore {
  routines: Routine[];
  isLoading: boolean;
  
  // Actions
  loadRoutines: () => void;
  getRoutine: (type: RoutineType) => Routine | null;
  addRoutineItem: (type: RoutineType, text: string) => void;
  updateRoutineItem: (type: RoutineType, itemId: string, updates: Partial<RoutineItem>) => void;
  deleteRoutineItem: (type: RoutineType, itemId: string) => void;
  toggleRoutineItem: (type: RoutineType, itemId: string) => void;
  reorderRoutineItems: (type: RoutineType, itemIds: string[]) => void;
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
    
    const updatedItems = routine.items.map(item =>
      item.id === itemId
        ? { ...item, completed: !item.completed, updatedAt: new Date().toISOString() }
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
}));

