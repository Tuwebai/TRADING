/**
 * Trade store using Zustand
 * Manages all trade-related state and operations
 */

import { create } from 'zustand';
import type { Trade, TradeFormData, TradeFilters } from '@/types/Trading';
import { tradeStorage } from '@/lib/storage';
import { calculatePNL, calculateRR } from '@/lib/calculations';
import { generateId } from '@/lib/utils';

interface TradeStore {
  trades: Trade[];
  filters: TradeFilters;
  isLoading: boolean;
  
  // Actions
  loadTrades: () => void;
  addTrade: (formData: TradeFormData) => void;
  updateTrade: (id: string, formData: TradeFormData) => void;
  deleteTrade: (id: string) => void;
  closeTrade: (id: string, exitPrice: number, exitDate: string) => void;
  setFilters: (filters: Partial<TradeFilters>) => void;
  clearFilters: () => void;
  
  // Computed
  getFilteredTrades: () => Trade[];
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  filters: {
    dateFrom: null,
    dateTo: null,
    asset: null,
    winLoss: null,
    status: null,
  },
  isLoading: false,

  loadTrades: () => {
    set({ isLoading: true });
    try {
      const trades = tradeStorage.getAll();
      const defaultJournal = {
        preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
        duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
        postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
      };
      
      // Recalculate PnL and R/R for all trades, and ensure new fields exist
      const updatedTrades = trades.map(trade => ({
        ...trade,
        screenshots: trade.screenshots || [],
        videos: trade.videos || [],
        tags: trade.tags || [],
        journal: trade.journal || defaultJournal,
        pnl: trade.status === 'closed' ? calculatePNL(trade) : null,
        riskReward: calculateRR(trade),
      }));
      set({ trades: updatedTrades, isLoading: false });
      // Save updated calculations and new fields
      tradeStorage.saveAll(updatedTrades);
    } catch (error) {
      console.error('Error loading trades:', error);
      set({ isLoading: false });
    }
  },

  addTrade: (formData: TradeFormData) => {
    const now = new Date().toISOString();
    const defaultJournal = {
      preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
      duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
      postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
    };
    
    const newTrade: Trade = {
      id: generateId(),
      ...formData,
      screenshots: formData.screenshots || [],
      videos: formData.videos || [],
      tags: formData.tags || [],
      journal: formData.journal || defaultJournal,
      status: formData.exitPrice ? 'closed' : 'open',
      pnl: null,
      riskReward: calculateRR({
        id: '',
        asset: formData.asset,
        positionType: formData.positionType,
        entryPrice: formData.entryPrice,
        exitPrice: formData.exitPrice,
        positionSize: formData.positionSize,
        leverage: formData.leverage,
        stopLoss: formData.stopLoss,
        takeProfit: formData.takeProfit,
        entryDate: formData.entryDate,
        exitDate: formData.exitDate,
        notes: formData.notes,
        screenshots: formData.screenshots || [],
        videos: formData.videos || [],
        tags: formData.tags || [],
        journal: formData.journal || defaultJournal,
        status: formData.exitPrice ? 'closed' : 'open',
        pnl: null,
        riskReward: null,
        createdAt: now,
        updatedAt: now,
      }),
      createdAt: now,
      updatedAt: now,
    };

    const trades = [...get().trades, newTrade];
    set({ trades });
    tradeStorage.add(newTrade);
  },

  updateTrade: (id: string, formData: TradeFormData) => {
    const trades = get().trades;
    const tradeIndex = trades.findIndex(t => t.id === id);
    
    if (tradeIndex === -1) return;

    const updatedTrade: Trade = {
      ...trades[tradeIndex],
      ...formData,
      status: formData.exitPrice ? 'closed' : 'open',
      pnl: formData.exitPrice ? calculatePNL({
        ...trades[tradeIndex],
        ...formData,
      }) : null,
      riskReward: calculateRR({
        ...trades[tradeIndex],
        ...formData,
      }),
      updatedAt: new Date().toISOString(),
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
      },
    });
  },

  getFilteredTrades: () => {
    const { trades, filters } = get();
    
    return trades.filter(trade => {
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
      
      return true;
    });
  },
}));

