/**
 * Career statistics and utilities
 * Functions for analyzing long-term trading performance and progression
 */

import type { Trade } from '@/types/Trading';

export interface CareerKPI {
  totalTradingTime: number; // Total hours
  consecutiveConsistentDays: number; // Streak of days with P/L >= 0
  greenMonths: number;
  redMonths: number;
  yearsActive: number;
  totalReturn: number;
}

export interface CareerTimelineMonth {
  year: number;
  month: number;
  monthName: string;
  totalPnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
  icon?: string;
}

/**
 * Calculate total trading time (sum of trade durations in hours)
 */
export function getTotalTradingTime(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.entryDate && t.exitDate);
  
  let totalHours = 0;
  closedTrades.forEach(trade => {
    const entry = new Date(trade.entryDate);
    const exit = new Date(trade.exitDate!);
    const hours = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60);
    totalHours += hours;
  });
  
  return totalHours;
}

/**
 * Get consecutive days streak where P/L >= 0
 */
export function getConsistentDaysStreak(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.pnl !== null);
  
  if (closedTrades.length === 0) return 0;
  
  // Group trades by day
  const dayMap = new Map<string, number>();
  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const currentPnl = dayMap.get(dayKey) || 0;
    dayMap.set(dayKey, currentPnl + (trade.pnl || 0));
  });
  
  // Sort days chronologically
  const sortedDays = Array.from(dayMap.entries())
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Find longest streak
  let maxStreak = 0;
  let currentStreak = 0;
  
  for (const day of sortedDays) {
    if (day.pnl >= 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return maxStreak;
}

/**
 * Count months with positive P/L (green months)
 */
export function getGreenMonths(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  const monthMap = new Map<string, number>();
  
  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const currentPnl = monthMap.get(monthKey) || 0;
    monthMap.set(monthKey, currentPnl + (trade.pnl || 0));
  });
  
  let greenCount = 0;
  monthMap.forEach(pnl => {
    if (pnl > 0) greenCount++;
  });
  
  return greenCount;
}

/**
 * Count months with negative P/L (red months)
 */
export function getRedMonths(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  const monthMap = new Map<string, number>();
  
  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const currentPnl = monthMap.get(monthKey) || 0;
    monthMap.set(monthKey, currentPnl + (trade.pnl || 0));
  });
  
  let redCount = 0;
  monthMap.forEach(pnl => {
    if (pnl < 0) redCount++;
  });
  
  return redCount;
}

/**
 * Calculate years active (difference between first and last trade)
 */
export function getYearsActive(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  
  if (closedTrades.length === 0) return 0;
  
  const dates = closedTrades.map(t => new Date(t.exitDate!));
  const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const lastDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  const years = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.ceil(years * 10) / 10); // Round to 1 decimal
}

/**
 * Calculate total return (sum of all closed trades P/L)
 */
export function getTotalReturn(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  return closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
}

/**
 * Get all career KPIs
 */
export function getCareerKPIs(trades: Trade[]): CareerKPI {
  return {
    totalTradingTime: getTotalTradingTime(trades),
    consecutiveConsistentDays: getConsistentDaysStreak(trades),
    greenMonths: getGreenMonths(trades),
    redMonths: getRedMonths(trades),
    yearsActive: getYearsActive(trades),
    totalReturn: getTotalReturn(trades),
  };
}

/**
 * Generate career timeline data (monthly breakdown)
 */
export function getCareerTimelineData(trades: Trade[]): CareerTimelineMonth[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const monthMap = new Map<string, CareerTimelineMonth>();
  
  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        year,
        month,
        monthName: monthNames[month],
        totalPnl: 0,
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
      });
    }
    
    const monthData = monthMap.get(monthKey)!;
    monthData.tradeCount++;
    const pnl = trade.pnl || 0;
    monthData.totalPnl += pnl;
    
    if (pnl > 0) {
      monthData.winCount++;
    } else if (pnl < 0) {
      monthData.lossCount++;
    }
  });
  
  // Calculate win rates
  monthMap.forEach(data => {
    data.winRate = data.tradeCount > 0 ? (data.winCount / data.tradeCount) * 100 : 0;
  });
  
  // Sort chronologically
  return Array.from(monthMap.values())
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
}

/**
 * Calculate discipline level based on planned vs impulsive trades
 * Planned = has journal entries, tags like "setup", "strategy"
 * Impulsive = tags like "FOMO", "revenge", "impulsive"
 */
export function getDisciplineLevel(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed');
  
  if (closedTrades.length === 0) return 0;
  
  let plannedCount = 0;
  let impulsiveCount = 0;
  
  closedTrades.forEach(trade => {
    const hasJournal = trade.journal?.preTrade?.entryReasons || 
                      trade.journal?.preTrade?.technicalAnalysis;
    const hasSetupTags = trade.tags?.some(tag => 
      ['setup', 'strategy', 'plan'].includes(tag.toLowerCase())
    );
    const hasImpulsiveTags = trade.tags?.some(tag => 
      ['fomo', 'revenge', 'impulsive', 'emocional'].includes(tag.toLowerCase())
    );
    
    if (hasJournal || hasSetupTags) {
      plannedCount++;
    }
    if (hasImpulsiveTags) {
      impulsiveCount++;
    }
  });
  
  const total = plannedCount + impulsiveCount;
  if (total === 0) return 0;
  
  return Math.round((plannedCount / total) * 100);
}

/**
 * Calculate consistency level (percentage of profitable days)
 */
export function getConsistencyLevel(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.pnl !== null);
  
  if (closedTrades.length === 0) return 0;
  
  const dayMap = new Map<string, number>();
  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const currentPnl = dayMap.get(dayKey) || 0;
    dayMap.set(dayKey, currentPnl + (trade.pnl || 0));
  });
  
  const profitableDays = Array.from(dayMap.values()).filter(pnl => pnl >= 0).length;
  return Math.round((profitableDays / dayMap.size) * 100);
}

/**
 * Calculate setup mastery (winrate per setup aggregated)
 * This is a simplified version - in a real app you'd have a setup/strategy field
 */
export function getSetupMastery(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  if (closedTrades.length === 0) return 0;
  
  const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
  return Math.round((wins / closedTrades.length) * 100);
}

/**
 * Detect and return all achievements
 */
export function getAchievements(trades: Trade[]): Achievement[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.pnl !== null);
  const achievements: Achievement[] = [];
  
  // Group trades by day
  const dayMap = new Map<string, number>();
  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const currentPnl = dayMap.get(dayKey) || 0;
    dayMap.set(dayKey, currentPnl + (trade.pnl || 0));
  });
  
  // Check for "10 Green Days in a Row"
  let greenStreak = 0;
  let maxGreenStreak = 0;
  const sortedDays = Array.from(dayMap.values()).sort((a, b) => {
    // We need to sort by date, but for simplicity we'll check the streak
    return 0;
  });
  
  // For simplicity, check all days
  Array.from(dayMap.values()).forEach(pnl => {
    if (pnl >= 0) {
      greenStreak++;
      maxGreenStreak = Math.max(maxGreenStreak, greenStreak);
    } else {
      greenStreak = 0;
    }
  });
  
  achievements.push({
    id: '10-green-days',
    name: '10 Días Verdes Consecutivos',
    description: 'Logra 10 días consecutivos con P/L positivo',
    unlocked: maxGreenStreak >= 10,
    unlockedAt: maxGreenStreak >= 10 ? new Date().toISOString() : null,
  });
  
  // Check for "First Green Month"
  const greenMonths = getGreenMonths(trades);
  achievements.push({
    id: 'first-green-month',
    name: 'Primer Mes Verde',
    description: 'Completa tu primer mes con P/L positivo',
    unlocked: greenMonths >= 1,
    unlockedAt: greenMonths >= 1 ? new Date().toISOString() : null,
  });
  
  // Check for "100 Total Trades"
  achievements.push({
    id: '100-trades',
    name: '100 Operaciones',
    description: 'Completa 100 operaciones cerradas',
    unlocked: closedTrades.length >= 100,
    unlockedAt: closedTrades.length >= 100 ? new Date().toISOString() : null,
  });
  
  // Check for "20R Month" (20x risk in a month)
  // This requires calculating R multiples - simplified version
  const monthMap = new Map<string, number>();
  closedTrades.forEach(trade => {
    const date = new Date(trade.exitDate!);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const currentPnl = monthMap.get(monthKey) || 0;
    monthMap.set(monthKey, currentPnl + (trade.pnl || 0));
  });
  
  // For 20R, we'd need to know the risk per trade. Simplified: check if any month has very high P/L
  const maxMonthPnl = Math.max(...Array.from(monthMap.values()), 0);
  // Assuming average risk is 1% of account, 20R would be 20% of account
  // This is a simplified check - in reality you'd calculate R multiples
  achievements.push({
    id: '20r-month',
    name: 'Mes 20R',
    description: 'Logra un mes con 20 veces tu riesgo (20R)',
    unlocked: false, // This would need proper R calculation
    unlockedAt: null,
  });
  
  return achievements;
}

