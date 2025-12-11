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

import type { Trade, Routine, Settings } from '@/types/Trading';

const STORAGE_KEYS = {
  TRADES: 'trading_log_trades',
  ROUTINES: 'trading_log_routines',
  SETTINGS: 'trading_log_settings',
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
    };
    const loaded = storage['load']<Settings>(STORAGE_KEYS.SETTINGS, defaultSettings);
    // Ensure advanced settings exist
    if (!loaded.advanced) {
      loaded.advanced = defaultSettings.advanced;
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
    });
  }
};

