/**
 * Settings store using Zustand
 * Manages application settings and theme
 */

import { create } from 'zustand';
import type { Settings, AdvancedSettings } from '@/types/Trading';
import { settingsStorage } from '@/lib/storage';
import { storageAdapter } from '@/lib/storageAdapter';
import { applyTheme } from '@/lib/themes';

/**
 * Get default advanced settings (same as in storage.ts)
 */
function getDefaultAdvancedSettings(): AdvancedSettings {
  return {
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
    riskManagement: {
      maxRiskPerTrade: null,
      maxRiskDaily: null,
      maxRiskWeekly: null,
      maxDrawdown: null,
      drawdownMode: 'warning',
    },
    discipline: {
      cooldownAfterLoss: null,
      maxTradesConsecutiveLoss: null,
      forceSessionCloseOnCriticalRule: false,
      persistentWarnings: true,
    },
    ui: {
      strictRiskMode: false,
      attenuateMetricsOnDrawdown: true,
      showOnlySurvivalMetrics: false,
      enableAnimations: true,
      showGlobalRiskPanel: true,
    },
    insights: {
      autoInsightsEnabled: true,
      severityLevel: 'all',
      maxVisibleInsights: 5,
      updateFrequency: 'realtime',
      allowBlockInsights: true,
      blockedInsightIds: [],
    },
    ruleEngine: {
      enabled: true,
      rules: [],
    },
    sessions: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      allowedSessions: {
        asian: true,
        london: true,
        'new-york': true,
        overlap: true,
        other: true,
      },
      allowedDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      blockTradingOutsideSession: false,
    },
  };
}

interface SettingsStore {
  settings: Settings;
  isLoading: boolean;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
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
    advanced: getDefaultAdvancedSettings(),
  },
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await storageAdapter.getSettings();
      if (settings) {
        set({ settings, isLoading: false });
        // Apply theme to document
        applyTheme(settings.theme, settings.customTheme);
      } else {
        // Si no hay settings (usuario no autenticado), usar defaults silenciosamente
        const defaultSettings = get().settings;
        set({ settings: defaultSettings, isLoading: false });
      }
    } catch (error) {
      // Solo loggear errores reales, no errores de autenticación
      if (error instanceof Error && !error.message.includes('no autenticado')) {
        console.error('Error loading settings:', error);
      }
      // Usar defaults si hay error
      const defaultSettings = get().settings;
      set({ settings: defaultSettings, isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<Settings>) => {
    const currentSettings = get().settings;
    
    // If advanced settings are provided, use them directly (component always sends complete object)
    // Otherwise merge other settings normally
    const newSettings: Settings = {
      ...currentSettings,
      ...updates,
      // For advanced settings, if provided, use them directly (they're always complete from component)
      // Otherwise keep current advanced settings
      advanced: updates.advanced !== undefined 
        ? updates.advanced 
        : currentSettings.advanced,
    };
    
    // Ensure advanced always exists
    if (!newSettings.advanced) {
      newSettings.advanced = getDefaultAdvancedSettings();
    }
    
    // Save to storage immediately
    set({ settings: newSettings });
    await storageAdapter.saveSettings(newSettings);
    
    // Apply theme if changed
    if (updates.theme !== undefined || updates.customTheme !== undefined) {
      applyTheme(newSettings.theme, newSettings.customTheme);
    }
  },

  setTheme: (theme: Settings['theme']) => {
    get().updateSettings({ theme });
  },
}));

