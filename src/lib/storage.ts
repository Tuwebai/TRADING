/**
 * Storage abstraction layer
 * 
 * This module provides a clean interface for data persistence.
 * Currently uses localStorage, but can be easily swapped for a real database
 * by only modifying this file.
 * 
 * When migrating to a database:
 * 1. Replace localStorage calls with API calls
 * 2. Keep the same function signatures
 * 3. Update return types to handle async operations if needed
 */

import type { Trade, Routine, Settings, TradeTemplate, TradingSetup, AdvancedSettings, DailyRoutineExecution } from '@/types/Trading';

const STORAGE_KEYS = {
  TRADES: 'trading_log_trades',
  ROUTINES: 'trading_log_routines',
  SETTINGS: 'trading_log_settings',
  TEMPLATES: 'trading_log_templates',
  SETUPS: 'trading_log_setups',
  ROUTINE_EXECUTIONS: 'trading_log_routine_executions',
  GOAL_INSIGHTS: 'trading_log_goal_insights',
  GOAL_POSTMORTEMS: 'trading_log_goal_postmortems',
} as const;

/**
 * Generic storage operations
 */
class StorageService {
  /**
   * Save data to storage
   */
  private save<T>(key: string, data: T): void {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error saving to storage (${key}):`, error);
      throw new Error(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load data from storage
   */
  private load<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error loading from storage (${key}):`, error);
      return defaultValue;
    }
  }

  /**
   * Clear all storage data
   */
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

/**
 * Trade storage operations
 */
export const tradeStorage = {
  /**
   * Get all trades
   */
  getAll(): Trade[] {
    const storage = new StorageService();
    return storage['load']<Trade[]>(STORAGE_KEYS.TRADES, []);
  },

  /**
   * Save all trades
   */
  saveAll(trades: Trade[]): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.TRADES, trades);
  },

  /**
   * Get a single trade by ID
   */
  getById(id: string): Trade | null {
    const trades = this.getAll();
    return trades.find(trade => trade.id === id) || null;
  },

  /**
   * Add a new trade
   */
  add(trade: Trade): void {
    const trades = this.getAll();
    trades.push(trade);
    this.saveAll(trades);
  },

  /**
   * Update an existing trade
   */
  update(id: string, updates: Partial<Trade>): void {
    const trades = this.getAll();
    const index = trades.findIndex(trade => trade.id === id);
    if (index === -1) {
      throw new Error(`Trade with id ${id} not found`);
    }
    trades[index] = { ...trades[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveAll(trades);
  },

  /**
   * Delete a trade
   */
  delete(id: string): void {
    const trades = this.getAll();
    const filtered = trades.filter(trade => trade.id !== id);
    this.saveAll(filtered);
  },
};

/**
 * Routine storage operations
 */
export const routineStorage = {
  /**
   * Get all routines
   */
  getAll(): Routine[] {
    const storage = new StorageService();
    return storage['load']<Routine[]>(STORAGE_KEYS.ROUTINES, []);
  },

  /**
   * Save all routines
   */
  saveAll(routines: Routine[]): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.ROUTINES, routines);
  },

  /**
   * Get routine by type
   */
  getByType(type: Routine['type']): Routine | null {
    const routines = this.getAll();
    return routines.find(routine => routine.type === type) || null;
  },

  /**
   * Add or update a routine
   */
  upsert(routine: Routine): void {
    const routines = this.getAll();
    const index = routines.findIndex(r => r.type === routine.type);
    if (index === -1) {
      routines.push(routine);
    } else {
      routines[index] = { ...routine, updatedAt: new Date().toISOString() };
    }
    this.saveAll(routines);
  },
};

/**
 * Daily routine execution storage operations
 */
export const routineExecutionStorage = {
  /**
   * Get all executions
   */
  getAll(): DailyRoutineExecution[] {
    const storage = new StorageService();
    return storage['load']<DailyRoutineExecution[]>(STORAGE_KEYS.ROUTINE_EXECUTIONS, []);
  },

  /**
   * Save all executions
   */
  saveAll(executions: DailyRoutineExecution[]): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.ROUTINE_EXECUTIONS, executions);
  },

  /**
   * Get execution by date (YYYY-MM-DD)
   */
  getByDate(date: string): DailyRoutineExecution | null {
    const executions = this.getAll();
    return executions.find(exec => exec.date === date) || null;
  },

  /**
   * Save or update an execution
   */
  save(execution: DailyRoutineExecution): void {
    const executions = this.getAll();
    const index = executions.findIndex(exec => exec.date === execution.date);
    
    const updated = {
      ...execution,
      updatedAt: new Date().toISOString(),
    };

    if (index === -1) {
      executions.push(updated);
    } else {
      executions[index] = updated;
    }
    
    this.saveAll(executions);
  },
};

/**
 * Get default advanced settings
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

/**
 * Merge advanced settings with defaults (for migration)
 */
function mergeAdvancedSettings(loaded: Partial<AdvancedSettings> | undefined): AdvancedSettings {
  const defaults = getDefaultAdvancedSettings();
  if (!loaded) return defaults;
  
  // Deep merge each nested object
  return {
    ...defaults,
    ...loaded,
    tradingRules: loaded.tradingRules 
      ? { ...defaults.tradingRules, ...loaded.tradingRules }
      : defaults.tradingRules,
    ultraDisciplinedMode: loaded.ultraDisciplinedMode
      ? { ...defaults.ultraDisciplinedMode, ...loaded.ultraDisciplinedMode }
      : defaults.ultraDisciplinedMode,
    studyMode: loaded.studyMode
      ? { ...defaults.studyMode, ...loaded.studyMode }
      : defaults.studyMode,
    riskManagement: loaded.riskManagement
      ? { ...defaults.riskManagement, ...loaded.riskManagement }
      : defaults.riskManagement,
    discipline: loaded.discipline
      ? { ...defaults.discipline, ...loaded.discipline }
      : defaults.discipline,
    ui: loaded.ui
      ? { ...defaults.ui, ...loaded.ui }
      : defaults.ui,
    insights: loaded.insights
      ? { ...defaults.insights, ...loaded.insights }
      : defaults.insights,
    ruleEngine: loaded.ruleEngine
      ? { 
          ...defaults.ruleEngine, 
          ...loaded.ruleEngine,
          rules: loaded.ruleEngine.rules !== undefined 
            ? loaded.ruleEngine.rules 
            : defaults.ruleEngine.rules
        }
      : defaults.ruleEngine,
    sessions: loaded.sessions
      ? { 
          ...defaults.sessions, 
          ...loaded.sessions,
          allowedSessions: loaded.sessions.allowedSessions
            ? { ...defaults.sessions.allowedSessions, ...loaded.sessions.allowedSessions }
            : defaults.sessions.allowedSessions,
          allowedDays: loaded.sessions.allowedDays
            ? { ...defaults.sessions.allowedDays, ...loaded.sessions.allowedDays }
            : defaults.sessions.allowedDays
        }
      : defaults.sessions,
  };
}

/**
 * Settings storage operations
 */
export const settingsStorage = {
  /**
   * Get settings
   */
  get(): Settings {
    const storage = new StorageService();
    const defaultSettings: Settings = {
      accountSize: 10000,
      baseCurrency: 'USD',
      riskPerTrade: 1,
      theme: 'light',
      customTheme: null,
      currentCapital: 10000,
      initialCapital: 10000,
      manualCapitalAdjustment: false,
      advanced: getDefaultAdvancedSettings(),
    };
    const loaded = storage['load']<Settings>(STORAGE_KEYS.SETTINGS, defaultSettings);
    // Ensure advanced settings exist and merge with defaults for migration
    if (!loaded.advanced) {
      loaded.advanced = getDefaultAdvancedSettings();
    } else {
      loaded.advanced = mergeAdvancedSettings(loaded.advanced);
    }
    return loaded;
  },

  /**
   * Save settings
   */
  save(settings: Settings): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.SETTINGS, settings);
  },
};

/**
 * Trade template storage operations
 */
export const templateStorage = {
  /**
   * Get all templates
   */
  getAll(): TradeTemplate[] {
    const storage = new StorageService();
    return storage['load']<TradeTemplate[]>(STORAGE_KEYS.TEMPLATES, []);
  },

  /**
   * Save all templates
   */
  saveAll(templates: TradeTemplate[]): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.TEMPLATES, templates);
  },

  /**
   * Get a single template by ID
   */
  getById(id: string): TradeTemplate | null {
    const templates = this.getAll();
    return templates.find(template => template.id === id) || null;
  },

  /**
   * Add a new template
   */
  add(template: TradeTemplate): void {
    const templates = this.getAll();
    templates.push(template);
    this.saveAll(templates);
  },

  /**
   * Update an existing template
   */
  update(id: string, updates: Partial<TradeTemplate>): void {
    const templates = this.getAll();
    const index = templates.findIndex(template => template.id === id);
    if (index === -1) {
      throw new Error(`Template with id ${id} not found`);
    }
    templates[index] = { ...templates[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveAll(templates);
  },

  /**
   * Delete a template
   */
  delete(id: string): void {
    const templates = this.getAll();
    const filtered = templates.filter(template => template.id !== id);
    this.saveAll(filtered);
  },
};

/**
 * Trading setup storage operations
 */
export const setupStorage = {
  /**
   * Get all setups
   */
  getAll(): TradingSetup[] {
    const storage = new StorageService();
    return storage['load']<TradingSetup[]>(STORAGE_KEYS.SETUPS, []);
  },

  /**
   * Save all setups
   */
  saveAll(setups: TradingSetup[]): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.SETUPS, setups);
  },

  /**
   * Get a single setup by ID
   */
  getById(id: string): TradingSetup | null {
    const setups = this.getAll();
    return setups.find(setup => setup.id === id) || null;
  },

  /**
   * Add a new setup
   */
  add(setup: TradingSetup): void {
    const setups = this.getAll();
    setups.push(setup);
    this.saveAll(setups);
  },

  /**
   * Update an existing setup
   */
  update(id: string, updates: Partial<TradingSetup>): void {
    const setups = this.getAll();
    const index = setups.findIndex(setup => setup.id === id);
    if (index === -1) {
      throw new Error(`Setup with id ${id} not found`);
    }
    setups[index] = { ...setups[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveAll(setups);
  },

  /**
   * Delete a setup
   */
  delete(id: string): void {
    const setups = this.getAll();
    const filtered = setups.filter(setup => setup.id !== id);
    this.saveAll(filtered);
  },
};

/**
 * Goal insights storage operations
 */
export interface GoalPostMortem {
  id: string;
  goalId: string;
  goalTitle: string;
  failedAt: string; // ISO date string
  cause: string;
  relatedRuleViolations: string[]; // IDs of violated rules
  historicalPatterns: string[];
  notes?: string; // Optional free text
  createdAt: string; // ISO date string
}

export const goalInsightsStorage = {
  /**
   * Get all goal insights
   */
  getAll(): Array<{ id: string; goalId: string; [key: string]: any }> {
    const storage = new StorageService();
    return storage['load']<Array<{ id: string; goalId: string; [key: string]: any }>>(STORAGE_KEYS.GOAL_INSIGHTS, []);
  },

  /**
   * Save all goal insights
   */
  saveAll(insights: Array<{ id: string; goalId: string; [key: string]: any }>): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.GOAL_INSIGHTS, insights);
  },

  /**
   * Get insights by goal ID
   */
  getByGoalId(goalId: string): Array<{ id: string; goalId: string; [key: string]: any }> {
    const insights = this.getAll();
    return insights.filter(i => i.goalId === goalId);
  },

  /**
   * Add a new goal insight (prevents duplicates)
   */
  add(insight: { id: string; goalId: string; generatedAt?: string; [key: string]: any }): void {
    const insights = this.getAll();
    
    // Check for duplicates: same goalId and same date
    if (insight.generatedAt) {
      const insightDate = new Date(insight.generatedAt).toISOString().split('T')[0];
      const isDuplicate = insights.some((existing: any) => {
        if (existing.goalId !== insight.goalId) return false;
        const existingDate = new Date(existing.generatedAt || existing.createdAt || 0).toISOString().split('T')[0];
        return existingDate === insightDate;
      });
      
      if (isDuplicate) {
        // Don't add duplicate
        return;
      }
    }
    
    // Check for duplicate by ID (shouldn't happen but just in case)
    const existsById = insights.some((existing: any) => existing.id === insight.id);
    if (existsById) {
      return;
    }
    
    insights.push(insight);
    this.saveAll(insights);
  },
};

/**
 * Goal post-mortem storage operations
 */
export const goalPostMortemsStorage = {
  /**
   * Get all post-mortems
   */
  getAll(): GoalPostMortem[] {
    const storage = new StorageService();
    return storage['load']<GoalPostMortem[]>(STORAGE_KEYS.GOAL_POSTMORTEMS, []);
  },

  /**
   * Save all post-mortems
   */
  saveAll(postMortems: GoalPostMortem[]): void {
    const storage = new StorageService();
    storage['save'](STORAGE_KEYS.GOAL_POSTMORTEMS, postMortems);
  },

  /**
   * Get post-mortems by goal ID
   */
  getByGoalId(goalId: string): GoalPostMortem[] {
    const postMortems = this.getAll();
    return postMortems.filter(pm => pm.goalId === goalId);
  },

  /**
   * Add a new post-mortem (prevents duplicates)
   */
  add(postMortem: GoalPostMortem): void {
    const postMortems = this.getAll();
    
    // Check for duplicates: same goalId and same date
    const postMortemDate = new Date(postMortem.failedAt).toISOString().split('T')[0];
    const isDuplicate = postMortems.some((existing: GoalPostMortem) => {
      if (existing.goalId !== postMortem.goalId) return false;
      const existingDate = new Date(existing.failedAt).toISOString().split('T')[0];
      return existingDate === postMortemDate;
    });
    
    if (isDuplicate) {
      // Don't add duplicate
      return;
    }
    
    // Check for duplicate by ID (shouldn't happen but just in case)
    const existsById = postMortems.some((existing: GoalPostMortem) => existing.id === postMortem.id);
    if (existsById) {
      return;
    }
    
    postMortems.push(postMortem);
    this.saveAll(postMortems);
  },
};

/**
 * Initialize storage with default values if empty
 */
export const initializeStorage = (): void => {
  // Settings should always exist
  const settings = settingsStorage.get();
  if (!settings) {
    settingsStorage.save({
      accountSize: 10000,
      baseCurrency: 'USD',
      riskPerTrade: 1,
      theme: 'light',
      customTheme: null,
      currentCapital: 10000,
      initialCapital: 10000,
      manualCapitalAdjustment: false,
      advanced: getDefaultAdvancedSettings(),
    });
  } else if (settings.advanced) {
    // Migrate existing settings to include new fields
    settings.advanced = mergeAdvancedSettings(settings.advanced);
    settingsStorage.save(settings);
  }
};

