/**
 * Settings store using Zustand
 * Manages application settings and theme
 */

import { create } from 'zustand';
import type { Settings } from '@/types/Trading';
import { settingsStorage } from '@/lib/storage';
import { applyTheme } from '@/lib/themes';

interface SettingsStore {
  settings: Settings;
  isLoading: boolean;
  
  // Actions
  loadSettings: () => void;
  updateSettings: (updates: Partial<Settings>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    accountSize: 10000,
    baseCurrency: 'USD',
    riskPerTrade: 1,
    theme: 'light',
    customTheme: null,
    currentCapital: 10000,
    initialCapital: 10000,
    manualCapitalAdjustment: false,
    advanced: {
      tradingRules: {
        maxTradesPerDay: null,
        maxTradesPerWeek: null,
        allowedTradingHours: {
          enabled: false,
          startHour: 9,
          endHour: 17,
        },
        maxLotSize: null,
        dailyProfitTarget: null,
        dailyLossLimit: null,
        psychologicalRules: [],
      },
      ultraDisciplinedMode: {
        enabled: false,
        blockOnRuleBreak: false,
        blockedUntil: null,
      },
      studyMode: {
        enabled: false,
        hideMoney: false,
        showOnlyRMultiples: false,
      },
    },
  },
  isLoading: false,

  loadSettings: () => {
    set({ isLoading: true });
    try {
      const settings = settingsStorage.get();
      set({ settings, isLoading: false });
      
      // Apply theme to document
      applyTheme(settings.theme, settings.customTheme);
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: (updates: Partial<Settings>) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    settingsStorage.save(newSettings);
    
    // Apply theme if changed
    if (updates.theme !== undefined || updates.customTheme !== undefined) {
      applyTheme(newSettings.theme, newSettings.customTheme);
    }
  },

  setTheme: (theme: Settings['theme']) => {
    get().updateSettings({ theme });
  },
}));

