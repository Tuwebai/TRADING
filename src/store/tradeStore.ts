/**
 * Trade store using Zustand
 * Manages all trade-related state and operations
 */

import { create } from 'zustand';
import type { Trade, TradeFormData, TradeFilters } from '@/types/Trading';
import { tradeStorage } from '@/lib/storage';
import { calculatePNL, calculateRR } from '@/lib/calculations';
import { calculateTradePips, isForexPair, calculateSwap } from '@/lib/forexCalculations';
import { generateId } from '@/lib/utils';
import { useTradingModeStore } from './tradingModeStore';

interface TradeStore {
  trades: Trade[];
  filters: TradeFilters;
  isLoading: boolean;
  selectedTradeId: string | null;
  
  // Actions
  loadTrades: () => void;
  getTradesByMode: (mode?: 'simulation' | 'demo' | 'live') => Trade[]; // Get trades filtered by mode
  addTrade: (formData: TradeFormData) => void;
  updateTrade: (id: string, formData: TradeFormData) => void;
  deleteTrade: (id: string) => void;
  closeTrade: (id: string, exitPrice: number, exitDate: string) => void;
  duplicateTrade: (id: string) => void;
  setFilters: (filters: Partial<TradeFilters>) => void;
  clearFilters: () => void;
  setSelectedTrade: (id: string | null) => void;
  updateTradeNotes: (id: string, notes: string) => void;
  
  // Computed
  getFilteredTrades: () => Trade[];
  getSelectedTrade: () => Trade | null;
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  filters: {
    dateFrom: null,
    dateTo: null,
    asset: null,
    winLoss: null,
    status: null,
    groupBy: null,
    session: null,
    setupId: null,
    minRiskReward: null,
    riskPercentMin: null,
    riskPercentMax: null,
    ruleStatus: null,
    classification: null,
  },
  isLoading: false,
  selectedTradeId: null,

  loadTrades: () => {
    set({ isLoading: true });
    try {
      const trades = tradeStorage.getAll();
      const defaultJournal = {
        preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
        duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
        postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
      };
      
      // Get default mode for trades that don't have one (migration)
      const defaultMode = useTradingModeStore.getState().mode;
      
      // Recalculate PnL, R/R, and pips for all trades, and ensure new fields exist
      const updatedTrades = trades.map(trade => {
        const pips = isForexPair(trade.asset) ? calculateTradePips(trade) : null;
        
        // Calculate swap if needed
        let swap = trade.swap;
        if (!swap && trade.swapRate && trade.exitDate && trade.entryDate) {
          swap = calculateSwap(trade, trade.swapRate, trade.swapType || 'both');
        }
        
        return {
          ...trade,
          screenshots: trade.screenshots || [],
          videos: trade.videos || [],
          tags: trade.tags || [],
          journal: trade.journal || defaultJournal,
          // Assign mode: use existing mode or default to current mode (for old trades)
          mode: trade.mode || defaultMode,
          pnl: trade.status === 'closed' ? calculatePNL({ ...trade, swap }) : null,
          riskReward: calculateRR(trade),
          pips: pips?.totalPips || null,
          riskPips: pips?.riskPips || null,
          rewardPips: pips?.rewardPips || null,
          swap: swap || trade.swap || null,
        };
      });
      set({ trades: updatedTrades, isLoading: false });
      // Save updated calculations and new fields (including mode)
      tradeStorage.saveAll(updatedTrades);
    } catch (error) {
      console.error('Error loading trades:', error);
      set({ isLoading: false });
    }
  },

  getTradesByMode: (mode?: 'simulation' | 'demo' | 'live') => {
    const { trades } = get();
    if (!mode) {
      // If no mode specified, return trades for current mode
      const currentMode = useTradingModeStore.getState().mode;
      return trades.filter(t => t.mode === currentMode);
    }
    return trades.filter(t => t.mode === mode);
  },

  addTrade: (formData: TradeFormData) => {
    // Get current trading mode
    const currentMode = useTradingModeStore.getState().mode;
    const now = new Date().toISOString();
    const defaultJournal = {
      preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
      duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
      postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
    };
    
    // Calculate pips for forex
    const tempTrade: Trade = {
      id: '',
      ...formData,
      screenshots: formData.screenshots || [],
      videos: formData.videos || [],
      tags: formData.tags || [],
      journal: formData.journal || defaultJournal,
      status: formData.exitPrice ? 'closed' : 'open',
      pnl: null,
      riskReward: null,
      createdAt: now,
      updatedAt: now,
      mode: currentMode, // Add trading mode
    };
    
    const pips = isForexPair(formData.asset) ? calculateTradePips(tempTrade) : null;
    
    // Calculate swap if needed
    let swap = formData.swap;
    if (!swap && formData.swapRate && formData.exitDate && formData.entryDate) {
      swap = calculateSwap(tempTrade, formData.swapRate, formData.swapType || 'both');
    }
    
    const newTrade: Trade = {
      ...tempTrade,
      id: generateId(),
      pnl: formData.exitPrice ? calculatePNL({ ...tempTrade, swap }) : null,
      riskReward: calculateRR(tempTrade),
      pips: pips?.totalPips || null,
      riskPips: pips?.riskPips || null,
      rewardPips: pips?.rewardPips || null,
      swap: swap || null,
    };

    const trades = [...get().trades, newTrade];
    set({ trades });
    tradeStorage.add(newTrade);
  },

  updateTrade: (id: string, formData: TradeFormData) => {
    const trades = get().trades;
    const tradeIndex = trades.findIndex(t => t.id === id);
    
    if (tradeIndex === -1) return;

    const oldTrade = trades[tradeIndex];
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Track changes
    Object.keys(formData).forEach((key) => {
      const typedKey = key as keyof TradeFormData;
      const oldValue = oldTrade[typedKey as keyof Trade];
      const newValue = formData[typedKey];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
        });
      }
    });

    // Calculate pips for forex
    const pips = isForexPair(formData.asset) 
      ? calculateTradePips({ ...oldTrade, ...formData })
      : null;
    
    // Calculate swap if needed
    let swap = formData.swap;
    if (!swap && formData.swapRate && formData.exitDate && formData.entryDate) {
      swap = calculateSwap(
        { ...oldTrade, ...formData },
        formData.swapRate,
        formData.swapType || 'both'
      );
    }

    const updatedTrade: Trade = {
      ...oldTrade,
      ...formData,
      status: formData.exitPrice ? 'closed' : 'open',
      pnl: formData.exitPrice ? calculatePNL({
        ...oldTrade,
        ...formData,
        swap,
      }) : null,
      riskReward: calculateRR({
        ...oldTrade,
        ...formData,
      }),
      pips: pips?.totalPips || null,
      riskPips: pips?.riskPips || null,
      rewardPips: pips?.rewardPips || null,
      swap: swap || null,
      updatedAt: new Date().toISOString(),
      changeHistory: [
        ...(oldTrade.changeHistory || []),
        ...changes.map(change => ({
          id: generateId(),
          timestamp: new Date().toISOString(),
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        })),
      ],
    };

    const newTrades = [...trades];
    newTrades[tradeIndex] = updatedTrade;
    
    set({ trades: newTrades });
    tradeStorage.update(id, updatedTrade);
  },

  deleteTrade: (id: string) => {
    const trades = get().trades.filter(t => t.id !== id);
    set({ trades });
    tradeStorage.delete(id);
  },

  closeTrade: (id: string, exitPrice: number, exitDate: string) => {
    const trades = get().trades;
    const tradeIndex = trades.findIndex(t => t.id === id);
    
    if (tradeIndex === -1) return;

    const trade = trades[tradeIndex];
    const updatedTrade: Trade = {
      ...trade,
      exitPrice,
      exitDate,
      status: 'closed',
      pnl: calculatePNL({ ...trade, exitPrice, exitDate, status: 'closed' }),
      updatedAt: new Date().toISOString(),
    };

    const newTrades = [...trades];
    newTrades[tradeIndex] = updatedTrade;
    
    set({ trades: newTrades });
    tradeStorage.update(id, updatedTrade);
  },

  duplicateTrade: (id: string) => {
    const trades = get().trades;
    const tradeToDuplicate = trades.find(t => t.id === id);
    
    if (!tradeToDuplicate) return;

    const now = new Date().toISOString();
    const duplicatedTrade: Trade = {
      ...tradeToDuplicate,
      id: generateId(),
      status: 'open', // Reset status to open
      exitPrice: null,
      exitDate: null,
      pnl: null,
      createdAt: now,
      updatedAt: now,
    };

    const newTrades = [...trades, duplicatedTrade];
    set({ trades: newTrades });
    tradeStorage.add(duplicatedTrade);
  },

  setFilters: (newFilters: Partial<TradeFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        dateFrom: null,
        dateTo: null,
        asset: null,
        winLoss: null,
        status: null,
        groupBy: null,
        session: null,
        setupId: null,
        minRiskReward: null,
        riskPercentMin: null,
        riskPercentMax: null,
        ruleStatus: null,
        classification: null,
      },
    });
  },

  getFilteredTrades: () => {
    const { trades, filters } = get();
    
    // First, filter by current trading mode (CRITICAL: isolate data by mode)
    const currentMode = useTradingModeStore.getState().mode;
    const modeFilteredTrades = trades.filter(trade => trade.mode === currentMode);
    
    let filtered = modeFilteredTrades.filter(trade => {
      // Date filter
      if (filters.dateFrom && trade.entryDate < filters.dateFrom) return false;
      if (filters.dateTo && trade.entryDate > filters.dateTo) return false;
      
      // Asset filter
      if (filters.asset && trade.asset.toLowerCase() !== filters.asset.toLowerCase()) return false;
      
      // Win/Loss filter
      if (filters.winLoss && filters.winLoss !== 'all') {
        if (trade.status !== 'closed' || trade.pnl === null) return false;
        if (filters.winLoss === 'win' && trade.pnl <= 0) return false;
        if (filters.winLoss === 'loss' && trade.pnl >= 0) return false;
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all' && trade.status !== filters.status) return false;
      
      // Session filter
      if (filters.session && filters.session !== 'all' && trade.session !== filters.session) return false;
      
      // Setup filter
      if (filters.setupId && trade.setupId !== filters.setupId) return false;
      
      // Min R/R filter
      if (filters.minRiskReward !== null && filters.minRiskReward !== undefined) {
        if (!trade.riskReward || trade.riskReward < filters.minRiskReward) return false;
      }
      
      // Risk % filter (requires calculation)
      if (filters.riskPercentMin !== null || filters.riskPercentMax !== null) {
        // This would need settings to calculate risk %, skip for now or calculate on the fly
        // For now, we'll skip this filter as it requires settings context
      }
      
      // Rule status filter
      if (filters.ruleStatus) {
        const hasViolations = trade.violatedRules && trade.violatedRules.length > 0;
        if (filters.ruleStatus === 'compliant' && hasViolations) return false;
        if (filters.ruleStatus === 'violations' && !hasViolations) return false;
      }
      
      // Classification filter
      if (filters.classification && filters.classification !== 'all') {
        if (trade.tradeClassification !== filters.classification) return false;
      }
      
      return true;
    });

    // Group by if specified
    if (filters.groupBy) {
      // Return grouped structure (will be handled by component)
      return filtered;
    }
    
    return filtered;
  },

  setSelectedTrade: (id: string | null) => {
    set({ selectedTradeId: id });
  },

  getSelectedTrade: () => {
    const { trades, selectedTradeId } = get();
    if (!selectedTradeId) return null;
    return trades.find(t => t.id === selectedTradeId) || null;
  },

  updateTradeNotes: (id: string, notes: string) => {
    const trades = get().trades;
    const tradeIndex = trades.findIndex(t => t.id === id);
    
    if (tradeIndex === -1) return;

    const updatedTrade: Trade = {
      ...trades[tradeIndex],
      notes,
      updatedAt: new Date().toISOString(),
    };

    const newTrades = [...trades];
    newTrades[tradeIndex] = updatedTrade;
    
    set({ trades: newTrades });
    tradeStorage.update(id, updatedTrade);
  },
}));

