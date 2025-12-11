/**
 * Calendar statistics and utilities
 * Functions for analyzing trades by day, month, and weekday
 */

import type { Trade } from '@/types/Trading';

export interface DayTradeData {
  date: string; // YYYY-MM-DD
  trades: Trade[];
  totalPnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

export interface WeekdayData {
  weekday: number; // 0 = Sunday, 1 = Monday, etc.
  weekdayName: string;
  totalPnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

/**
 * Get all trades grouped by day (YYYY-MM-DD format)
 */
export function getTradesByDay(trades: Trade[]): Map<string, Trade[]> {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  const dayMap = new Map<string, Trade[]>();

  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, []);
    }
    dayMap.get(dayKey)!.push(trade);
  });

  return dayMap;
}

/**
 * Get all trades for a specific month (YYYY-MM format)
 */
export function getTradesByMonth(trades: Trade[], year: number, month: number): Trade[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  
  return closedTrades.filter(trade => {
    const date = new Date(trade.exitDate!);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

/**
 * Get total P/L per day for a given month
 */
export function getTotalPLPerDay(trades: Trade[], year: number, month: number): Map<string, DayTradeData> {
  const monthTrades = getTradesByMonth(trades, year, month);
  const dayMap = new Map<string, DayTradeData>();

  monthTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        date: dayKey,
        trades: [],
        totalPnl: 0,
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
      });
    }

    const dayData = dayMap.get(dayKey)!;
    dayData.trades.push(trade);
    dayData.tradeCount++;
    const pnl = trade.pnl || 0;
    dayData.totalPnl += pnl;
    
    if (pnl > 0) {
      dayData.winCount++;
    } else if (pnl < 0) {
      dayData.lossCount++;
    }
  });

  return dayMap;
}

/**
 * Get P/L grouped by weekday (0 = Sunday, 6 = Saturday)
 */
export function getPLByWeekday(trades: Trade[]): WeekdayData[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const weekdayMap = new Map<number, WeekdayData>();

  // Initialize all weekdays
  for (let i = 0; i < 7; i++) {
    weekdayMap.set(i, {
      weekday: i,
      weekdayName: weekdayNames[i],
      totalPnl: 0,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
    });
  }

  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const weekday = date.getDay();
    const data = weekdayMap.get(weekday)!;
    
    data.tradeCount++;
    const pnl = trade.pnl || 0;
    data.totalPnl += pnl;
    
    if (pnl > 0) {
      data.winCount++;
    } else if (pnl < 0) {
      data.lossCount++;
    }
  });

  return Array.from(weekdayMap.values()).filter(d => d.tradeCount > 0);
}

/**
 * Get the best day (highest P/L) for a given month
 */
export function getBestDay(trades: Trade[], year: number, month: number): DayTradeData | null {
  const dayData = getTotalPLPerDay(trades, year, month);
  const days = Array.from(dayData.values());
  
  if (days.length === 0) return null;
  
  return days.reduce((best, current) => 
    current.totalPnl > best.totalPnl ? current : best
  );
}

/**
 * Get the worst day (lowest P/L) for a given month
 * Only returns days with negative P/L
 */
export function getWorstDay(trades: Trade[], year: number, month: number): DayTradeData | null {
  const dayData = getTotalPLPerDay(trades, year, month);
  const days = Array.from(dayData.values());
  
  if (days.length === 0) return null;
  
  // Filter only days with negative P/L
  const losingDays = days.filter(day => day.totalPnl < 0);
  
  if (losingDays.length === 0) return null;
  
  return losingDays.reduce((worst, current) => 
    current.totalPnl < worst.totalPnl ? current : worst
  );
}

/**
 * Get the maximum and minimum P/L for a month (for scaling visualization)
 */
export function getMonthPLRange(trades: Trade[], year: number, month: number): { min: number; max: number } {
  const dayData = getTotalPLPerDay(trades, year, month);
  const pnlValues = Array.from(dayData.values()).map(d => d.totalPnl);
  
  if (pnlValues.length === 0) {
    return { min: 0, max: 0 };
  }
  
  return {
    min: Math.min(...pnlValues),
    max: Math.max(...pnlValues),
  };
}

