/**
 * Trading setup store using Zustand
 * Manages trading setups catalog
 */

import { create } from 'zustand';
import type { TradingSetup } from '@/types/Trading';
import { setupStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { calculateAnalytics } from '@/lib/calculations';
import type { Trade } from '@/types/Trading';

interface SetupStore {
  setups: TradingSetup[];
  isLoading: boolean;
  
  // Actions
  loadSetups: () => void;
  addSetup: (setup: Omit<TradingSetup, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => void;
  updateSetup: (id: string, updates: Partial<TradingSetup>) => void;
  deleteSetup: (id: string) => void;
  getSetup: (id: string) => TradingSetup | null;
  updateSetupStats: (id: string, trades: Trade[]) => void;
}

export const useSetupStore = create<SetupStore>((set, get) => ({
  setups: [],
  isLoading: false,

  loadSetups: () => {
    set({ isLoading: true });
    try {
      const setups = setupStorage.getAll();
      set({ setups, isLoading: false });
    } catch (error) {
      console.error('Error loading setups:', error);
      set({ isLoading: false });
    }
  },

  addSetup: (setupData) => {
    const now = new Date().toISOString();
    const newSetup: TradingSetup = {
      id: generateId(),
      ...setupData,
      stats: {
        totalTrades: 0,
        winRate: 0,
        avgPnl: 0,
        profitFactor: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    const setups = [...get().setups, newSetup];
    set({ setups });
    setupStorage.add(newSetup);
  },

  updateSetup: (id: string, updates: Partial<TradingSetup>) => {
    const setups = get().setups;
    const setupIndex = setups.findIndex(s => s.id === id);
    
    if (setupIndex === -1) return;

    const updatedSetup: TradingSetup = {
      ...setups[setupIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const newSetups = [...setups];
    newSetups[setupIndex] = updatedSetup;
    
    set({ setups: newSetups });
    setupStorage.update(id, updatedSetup);
  },

  deleteSetup: (id: string) => {
    const setups = get().setups.filter(s => s.id !== id);
    set({ setups });
    setupStorage.delete(id);
  },

  getSetup: (id: string) => {
    return get().setups.find(s => s.id === id) || null;
  },

  updateSetupStats: (id: string, trades: Trade[]) => {
    const setupTrades = trades.filter(t => t.setupId === id && t.status === 'closed');
    
    if (setupTrades.length === 0) {
      get().updateSetup(id, {
        stats: {
          totalTrades: 0,
          winRate: 0,
          avgPnl: 0,
          profitFactor: 0,
        },
      });
      return;
    }

    const analytics = calculateAnalytics(setupTrades);
    
    get().updateSetup(id, {
      stats: {
        totalTrades: analytics.totalTrades,
        winRate: analytics.winRate,
        avgPnl: analytics.averagePnl,
        profitFactor: analytics.profitFactor,
      },
    });
  },
}));

