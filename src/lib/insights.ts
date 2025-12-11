/**
 * Insights engine utilities
 * Functions for generating automatic insights from trade data
 */

import type { Trade } from '@/types/Trading';
import { calculateAnalytics } from './calculations';
import { getTradesByMonth, getTotalPLPerDay } from './calendarStats';
import { generateEquityCurve, calculateMaxDrawdown } from './calculations';
import { calculateHourlyPerformance } from './temporalAnalysis';

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  metric: string;
  description: string;
  change?: number; // Percentage change if applicable
}

/**
 * Calculate winrate change between two periods
 */
function calculateWinrateChange(trades1: Trade[], trades2: Trade[]): number {
  const analytics1 = calculateAnalytics(trades1);
  const analytics2 = calculateAnalytics(trades2);
  
  if (analytics1.winRate === 0) return analytics2.winRate;
  if (analytics2.winRate === 0) return -analytics1.winRate;
  
  return ((analytics2.winRate - analytics1.winRate) / analytics1.winRate) * 100;
}

/**
 * Get monthly winrate change (current month vs previous month)
 */
export function getMonthlyWinrateChange(trades: Trade[]): Insight | null {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const currentMonthTrades = getTradesByMonth(trades, currentYear, currentMonth);
  const prevMonthTrades = getTradesByMonth(trades, prevYear, prevMonth);
  
  if (currentMonthTrades.length === 0 && prevMonthTrades.length === 0) {
    return null;
  }
  
  const change = calculateWinrateChange(prevMonthTrades, currentMonthTrades);
  const currentAnalytics = calculateAnalytics(currentMonthTrades);
  
  const isPositive = change > 0;
  
  return {
    id: 'monthly-winrate-change',
    type: isPositive ? 'positive' : change < 0 ? 'negative' : 'neutral',
    title: 'Cambio de Win Rate Mensual',
    metric: `${currentAnalytics.winRate.toFixed(1)}%`,
    description: `Tu win rate ${isPositive ? 'aumentó' : 'disminuyó'} ${Math.abs(change).toFixed(1)}% comparado con el mes anterior.`,
    change: change,
  };
}

/**
 * Get weekly winrate change (current week vs previous week)
 */
export function getWeeklyWinrateChange(trades: Trade[]): Insight | null {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  
  const prevWeekEnd = new Date(currentWeekStart);
  
  const currentWeekTrades = trades.filter(t => {
    if (t.status !== 'closed' || !t.exitDate) return false;
    const date = new Date(t.exitDate);
    return date >= currentWeekStart;
  });
  
  const prevWeekTrades = trades.filter(t => {
    if (t.status !== 'closed' || !t.exitDate) return false;
    const date = new Date(t.exitDate);
    return date >= prevWeekStart && date < prevWeekEnd;
  });
  
  if (currentWeekTrades.length === 0 && prevWeekTrades.length === 0) {
    return null;
  }
  
  const change = calculateWinrateChange(prevWeekTrades, currentWeekTrades);
  const currentAnalytics = calculateAnalytics(currentWeekTrades);
  
  const isPositive = change > 0;
  
  return {
    id: 'weekly-winrate-change',
    type: isPositive ? 'positive' : change < 0 ? 'negative' : 'neutral',
    title: 'Cambio de Win Rate Semanal',
    metric: `${currentAnalytics.winRate.toFixed(1)}%`,
    description: `Tu win rate ${isPositive ? 'aumentó' : 'disminuyó'} ${Math.abs(change).toFixed(1)}% comparado con la semana anterior.`,
    change: change,
  };
}

/**
 * Get drawdown change (current vs last month)
 */
export function getDrawdownChange(trades: Trade[], initialCapital: number): Insight | null {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const currentMonthTrades = getTradesByMonth(trades, currentYear, currentMonth);
  const prevMonthTrades = getTradesByMonth(trades, prevYear, prevMonth);
  
  if (currentMonthTrades.length === 0 && prevMonthTrades.length === 0) {
    return null;
  }
  
  const currentEquity = generateEquityCurve(currentMonthTrades, initialCapital);
  const prevEquity = generateEquityCurve(prevMonthTrades, initialCapital);
  
  const currentDrawdown = calculateMaxDrawdown(currentEquity);
  const prevDrawdown = calculateMaxDrawdown(prevEquity);
  
  if (prevDrawdown.maxDrawdown === 0) {
    return null;
  }
  
  const change = ((currentDrawdown.maxDrawdown - prevDrawdown.maxDrawdown) / prevDrawdown.maxDrawdown) * 100;
  const isPositive = change < 0; // Negative change in drawdown is positive
  
  return {
    id: 'drawdown-change',
    type: isPositive ? 'positive' : 'negative',
    title: 'Cambio de Drawdown',
    metric: `${currentDrawdown.maxDrawdownPercent.toFixed(2)}%`,
    description: `Tu drawdown máximo ${isPositive ? 'disminuyó' : 'aumentó'} ${Math.abs(change).toFixed(1)}% comparado con el mes anterior.`,
    change: change,
  };
}

/**
 * Detect overtrading (avg trades/day > 5)
 */
export function detectOvertrading(trades: Trade[]): Insight | null {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  
  if (closedTrades.length === 0) return null;
  
  // Get date range
  const dates = closedTrades.map(t => new Date(t.exitDate!));
  const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const lastDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  const avgTradesPerDay = closedTrades.length / daysDiff;
  
  // Check current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthTrades = getTradesByMonth(trades, currentYear, currentMonth);
  
  const monthDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthAvgTradesPerDay = monthTrades.length / monthDays;
  
  if (avgTradesPerDay > 5 || monthAvgTradesPerDay > 5) {
    return {
      id: 'overtrading',
      type: 'warning',
      title: 'Posible Overtrading',
      metric: `${avgTradesPerDay.toFixed(1)} ops/día`,
      description: `Estás realizando ${avgTradesPerDay.toFixed(1)} operaciones por día en promedio. Considera reducir la frecuencia para mejorar la calidad.`,
    };
  }
  
  return null;
}

/**
 * Get top 3 assets by P/L, Winrate, and Average R
 */
export function getTopAssets(trades: Trade[]): {
  byPnl: Array<{ asset: string; pnl: number }>;
  byWinrate: Array<{ asset: string; winrate: number; trades: number }>;
  byAvgR: Array<{ asset: string; avgR: number; trades: number }>;
} {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  const assetMap = new Map<string, {
    trades: Trade[];
    totalPnl: number;
    wins: number;
    totalR: number;
  }>();
  
  closedTrades.forEach(trade => {
    if (!assetMap.has(trade.asset)) {
      assetMap.set(trade.asset, {
        trades: [],
        totalPnl: 0,
        wins: 0,
        totalR: 0,
      });
    }
    
    const data = assetMap.get(trade.asset)!;
    data.trades.push(trade);
    data.totalPnl += trade.pnl || 0;
    if ((trade.pnl || 0) > 0) {
      data.wins++;
    }
    if (trade.riskReward) {
      data.totalR += trade.riskReward;
    }
  });
  
  // By P/L
  const byPnl = Array.from(assetMap.entries())
    .map(([asset, data]) => ({ asset, pnl: data.totalPnl }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 3);
  
  // By Winrate
  const byWinrate = Array.from(assetMap.entries())
    .map(([asset, data]) => ({
      asset,
      winrate: data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0,
      trades: data.trades.length,
    }))
    .filter(a => a.trades >= 3) // At least 3 trades
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 3);
  
  // By Average R
  const byAvgR = Array.from(assetMap.entries())
    .map(([asset, data]) => ({
      asset,
      avgR: data.trades.length > 0 ? data.totalR / data.trades.length : 0,
      trades: data.trades.length,
    }))
    .filter(a => a.trades >= 3 && a.avgR > 0)
    .sort((a, b) => b.avgR - a.avgR)
    .slice(0, 3);
  
  return { byPnl, byWinrate, byAvgR };
}

/**
 * Get volatility performance (simplified - based on trade P/L variance)
 */
export function getVolatilityPerformance(trades: Trade[]): Insight | null {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  if (closedTrades.length < 10) return null;
  
  // Calculate variance of P/L
  const pnlValues = closedTrades.map(t => t.pnl || 0);
  const mean = pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length;
  const variance = pnlValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pnlValues.length;
  const stdDev = Math.sqrt(variance);
  
  // High volatility = high std dev
  // Low volatility = low std dev
  // Compare performance in high vs low volatility periods
  // Simplified: if variance is high and winrate is good, trader performs well in volatile markets
  
  const analytics = calculateAnalytics(closedTrades);
  const isHighVolatility = stdDev > mean * 0.5;
  const performsWellInVolatility = isHighVolatility && analytics.winRate > 50;
  
  return {
    id: 'volatility-performance',
    type: performsWellInVolatility ? 'positive' : 'neutral',
    title: 'Rendimiento en Volatilidad',
    metric: `${stdDev.toFixed(0)} desv. estándar`,
    description: performsWellInVolatility
      ? 'Tu rendimiento es sólido en mercados volátiles. Mantén tu estrategia.'
      : 'Considera ajustar tu estrategia según las condiciones de volatilidad del mercado.',
  };
}

/**
 * Get timing insights (best/worst hour)
 */
export function getTimingInsights(trades: Trade[]): {
  bestHour: Insight | null;
  worstHour: Insight | null;
} {
  const hourlyData = calculateHourlyPerformance(trades);
  
  if (hourlyData.length === 0) {
    return { bestHour: null, worstHour: null };
  }
  
  const bestHour = hourlyData.reduce((best, current) => 
    current.totalPnl > best.totalPnl ? current : best
  );
  
  const worstHour = hourlyData.reduce((worst, current) => 
    current.totalPnl < worst.totalPnl ? current : worst
  );
  
  return {
    bestHour: bestHour.totalPnl > 0 ? {
      id: 'best-hour',
      type: 'positive',
      title: 'Mejor Hora para Operar',
      metric: `${bestHour.hour.toString().padStart(2, '0')}:00`,
      description: `Tu mejor rendimiento es a las ${bestHour.hour.toString().padStart(2, '0')}:00 con ${bestHour.trades} operaciones y ${bestHour.winRate.toFixed(1)}% win rate.`,
    } : null,
    worstHour: worstHour.totalPnl < 0 ? {
      id: 'worst-hour',
      type: 'negative',
      title: 'Peor Hora para Operar',
      metric: `${worstHour.hour.toString().padStart(2, '0')}:00`,
      description: `Tu peor rendimiento es a las ${worstHour.hour.toString().padStart(2, '0')}:00. Considera evitar operar en este horario.`,
    } : null,
  };
}

/**
 * Get behavioral patterns from tags and notes
 */
export function getBehavioralPatterns(trades: Trade[]): Insight[] {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const insights: Insight[] = [];
  
  // Count behavioral tags
  const behaviorCounts = new Map<string, number>();
  const negativeBehaviors = ['fomo', 'revenge', 'impulsive', 'emocional', 'ansioso', 'temeroso'];
  
  closedTrades.forEach(trade => {
    trade.tags?.forEach(tag => {
      const tagLower = tag.toLowerCase();
      negativeBehaviors.forEach(behavior => {
        if (tagLower.includes(behavior)) {
          behaviorCounts.set(behavior, (behaviorCounts.get(behavior) || 0) + 1);
        }
      });
    });
  });
  
  if (behaviorCounts.size > 0) {
    const mostFrequent = Array.from(behaviorCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    const behaviorNames: Record<string, string> = {
      fomo: 'FOMO',
      revenge: 'Revenge Trading',
      impulsive: 'Trading Impulsivo',
      emocional: 'Trading Emocional',
      ansioso: 'Ansiedad',
      temeroso: 'Miedo',
    };
    
    insights.push({
      id: 'behavioral-pattern',
      type: 'warning',
      title: 'Patrón de Comportamiento Detectado',
      metric: `${mostFrequent[1]} veces`,
      description: `El comportamiento más frecuente este mes es: ${behaviorNames[mostFrequent[0]] || mostFrequent[0]}. Considera trabajar en esto.`,
    });
  }
  
  return insights;
}

/**
 * Get all insights
 */
export function getAllInsights(trades: Trade[], initialCapital: number): Insight[] {
  const insights: Insight[] = [];
  
  const monthlyWinrate = getMonthlyWinrateChange(trades);
  if (monthlyWinrate) insights.push(monthlyWinrate);
  
  const weeklyWinrate = getWeeklyWinrateChange(trades);
  if (weeklyWinrate) insights.push(weeklyWinrate);
  
  const drawdownChange = getDrawdownChange(trades, initialCapital);
  if (drawdownChange) insights.push(drawdownChange);
  
  const overtrading = detectOvertrading(trades);
  if (overtrading) insights.push(overtrading);
  
  const volatility = getVolatilityPerformance(trades);
  if (volatility) insights.push(volatility);
  
  const timing = getTimingInsights(trades);
  if (timing.bestHour) insights.push(timing.bestHour);
  if (timing.worstHour) insights.push(timing.worstHour);
  
  const behavioral = getBehavioralPatterns(trades);
  insights.push(...behavioral);
  
  return insights;
}

