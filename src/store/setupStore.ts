/**
 * Trading setup store using Zustand
 * Manages trading setups catalog
 */

import { create } from 'zustand';
import type { TradingSetup } from '@/types/Trading';
import { setupStorage } from '@/lib/storage';
import { storageAdapter } from '@/lib/storageAdapter';
import { generateId } from '@/lib/utils';
import { calculateAnalytics } from '@/lib/calculations';
import type { Trade } from '@/types/Trading';

interface SetupStore {
  setups: TradingSetup[];
  isLoading: boolean;
  
  // Actions
  loadSetups: () => Promise<void>;
  addSetup: (setup: Omit<TradingSetup, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => Promise<void>;
  updateSetup: (id: string, updates: Partial<TradingSetup>) => Promise<void>;
  deleteSetup: (id: string) => Promise<void>;
  getSetup: (id: string) => TradingSetup | null;
  updateSetupStats: (id: string, trades: Trade[]) => Promise<void>;
}

export const useSetupStore = create<SetupStore>((set, get) => ({
  setups: [],
  isLoading: false,

  loadSetups: async () => {
    set({ isLoading: true });
    try {
      const setups = await storageAdapter.getAllSetups();
      set({ setups, isLoading: false });
    } catch (error) {
      // Solo loggear errores reales, no errores de autenticación
      if (error instanceof Error && !error.message.includes('no autenticado')) {
        console.error('Error loading setups:', error);
      }
      set({ setups: [], isLoading: false });
    }
  },

  addSetup: async (setupData) => {
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
    await storageAdapter.saveSetup(newSetup);
  },

  updateSetup: async (id: string, updates: Partial<TradingSetup>) => {
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
    await storageAdapter.saveSetup(updatedSetup);
  },

  deleteSetup: async (id: string) => {
    const setups = get().setups.filter(s => s.id !== id);
    set({ setups });
    await storageAdapter.deleteSetup(id);
  },

  getSetup: (id: string) => {
    return get().setups.find(s => s.id === id) || null;
  },

  updateSetupStats: async (id: string, trades: Trade[]) => {
    const setups = get().setups;
    const setup = setups.find(s => s.id === id);
    if (!setup) return;

    const setupTrades = trades.filter(t => t.setupId === id && t.status === 'closed');
    
    let newStats;
    if (setupTrades.length === 0) {
      newStats = {
        totalTrades: 0,
        winRate: 0,
        avgPnl: 0,
        profitFactor: 0,
      };
    } else {
      const analytics = calculateAnalytics(setupTrades);
      newStats = {
        totalTrades: analytics.totalTrades,
        winRate: analytics.winRate,
        avgPnl: analytics.averagePnl,
        profitFactor: analytics.profitFactor,
      };
    }

    // Solo actualizar si los stats realmente cambiaron
    const currentStats = setup.stats || {
      totalTrades: 0,
      winRate: 0,
      avgPnl: 0,
      profitFactor: 0,
    };

    const statsChanged = 
      currentStats.totalTrades !== newStats.totalTrades ||
      Math.abs(currentStats.winRate - newStats.winRate) > 0.01 ||
      Math.abs(currentStats.avgPnl - newStats.avgPnl) > 0.01 ||
      Math.abs(currentStats.profitFactor - newStats.profitFactor) > 0.01;

    if (statsChanged) {
      get().updateSetup(id, { stats: newStats });
    }
  },
}));

