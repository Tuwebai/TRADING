/**
 * Dashboard-specific insights
 * Quick insights for the main dashboard page
 */

import type { Trade } from '@/types/Trading';
import { calculateHourlyPerformance, calculateDailyPerformance } from './temporalAnalysis';
import { getTopAssets } from './insights';
import { calculateAnalytics, calculateMaxWinStreak, calculateMaxLossStreak } from './calculations';
import { getRiskMetrics } from './risk';
import type { Settings } from '@/types/Trading';

export interface DashboardInsight {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  icon?: string;
}

/**
 * Calculate overtrading percentage change (current week vs previous week)
 */
export function getOvertradingInsight(trades: Trade[]): DashboardInsight | null {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  
  if (closedTrades.length === 0) return null;
  
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  
  const prevWeekEnd = new Date(currentWeekStart);
  
  const currentWeekTrades = closedTrades.filter(t => {
    const date = new Date(t.exitDate!);
    return date >= currentWeekStart;
  });
  
  const prevWeekTrades = closedTrades.filter(t => {
    const date = new Date(t.exitDate!);
    return date >= prevWeekStart && date < prevWeekEnd;
  });
  
  if (prevWeekTrades.length === 0) return null;
  
  const currentWeekDays = Math.max(1, Math.ceil((now.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24)));
  const prevWeekDays = 7;
  
  const currentAvgPerDay = currentWeekTrades.length / currentWeekDays;
  const prevAvgPerDay = prevWeekTrades.length / prevWeekDays;
  
  if (prevAvgPerDay === 0) return null;
  
  const change = ((currentAvgPerDay - prevAvgPerDay) / prevAvgPerDay) * 100;
  
  if (Math.abs(change) < 10) return null; // Only show if significant change
  
  if (change > 0) {
    return {
      id: 'overtrading-increase',
      type: 'warning',
      message: `Estás sobreoperando un ${Math.abs(change).toFixed(0)}% más que la semana pasada.`,
    };
  } else {
    return {
      id: 'overtrading-decrease',
      type: 'info',
      message: `Has reducido tus operaciones un ${Math.abs(change).toFixed(0)}% comparado con la semana pasada.`,
    };
  }
}

/**
 * Get most profitable hour range
 */
export function getBestHourInsight(trades: Trade[]): DashboardInsight | null {
  const hourlyData = calculateHourlyPerformance(trades);
  
  if (hourlyData.length === 0) return null;
  
  const bestHour = hourlyData.reduce((best, current) => 
    current.totalPnl > best.totalPnl ? current : best
  );
  
  if (bestHour.totalPnl <= 0) return null;
  
  // Find hour range (best hour ± 1 hour)
  const hourRange = hourlyData.filter(h => 
    Math.abs(h.hour - bestHour.hour) <= 1 && h.totalPnl > 0
  );
  
  if (hourRange.length === 0) return null;
  
  const minHour = Math.min(...hourRange.map(h => h.hour));
  const maxHour = Math.max(...hourRange.map(h => h.hour));
  
  const hourText = minHour === maxHour 
    ? `${minHour.toString().padStart(2, '0')}:00`
    : `${minHour.toString().padStart(2, '0')}:00 y ${maxHour.toString().padStart(2, '0')}:00`;
  
  return {
    id: 'best-hour',
    type: 'success',
    message: `Tu hora más rentable es entre ${hourText}.`,
  };
}

/**
 * Get most dangerous asset (worst winrate or highest loss)
 */
export function getMostDangerousAsset(trades: Trade[]): DashboardInsight | null {
  const topAssets = getTopAssets(trades);
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  if (closedTrades.length === 0) return null;
  
  // Group by asset
  const assetMap = new Map<string, {
    trades: Trade[];
    totalPnl: number;
    wins: number;
    losses: number;
  }>();
  
  closedTrades.forEach(trade => {
    if (!assetMap.has(trade.asset)) {
      assetMap.set(trade.asset, {
        trades: [],
        totalPnl: 0,
        wins: 0,
        losses: 0,
      });
    }
    
    const data = assetMap.get(trade.asset)!;
    data.trades.push(trade);
    const pnl = trade.pnl || 0;
    data.totalPnl += pnl;
    
    if (pnl > 0) {
      data.wins++;
    } else if (pnl < 0) {
      data.losses++;
    }
  });
  
  // Find asset with worst winrate (at least 3 trades) or highest loss
  const assetsWithEnoughTrades = Array.from(assetMap.entries())
    .filter(([_, data]) => data.trades.length >= 3)
    .map(([asset, data]) => ({
      asset,
      winrate: (data.wins / data.trades.length) * 100,
      totalPnl: data.totalPnl,
      trades: data.trades.length,
    }));
  
  if (assetsWithEnoughTrades.length === 0) return null;
  
  // Find worst winrate
  const worstWinrate = assetsWithEnoughTrades.reduce((worst, current) => 
    current.winrate < worst.winrate ? current : worst
  );
  
  // Find highest loss
  const worstPnl = assetsWithEnoughTrades.reduce((worst, current) => 
    current.totalPnl < worst.totalPnl ? current : worst
  );
  
  // Choose the most dangerous (worst winrate if < 30%, otherwise worst P/L)
  const dangerousAsset = worstWinrate.winrate < 30 ? worstWinrate : worstPnl;
  
  if (dangerousAsset.totalPnl >= 0 && dangerousAsset.winrate >= 50) return null;
  
  return {
    id: 'dangerous-asset',
    type: 'warning',
    message: `Tu activo más peligroso es ${dangerousAsset.asset} (${dangerousAsset.winrate.toFixed(0)}% win rate, ${dangerousAsset.trades} ops).`,
  };
}

/**
 * Get win rate trend (improving/declining)
 */
export function getWinRateTrendInsight(trades: Trade[]): DashboardInsight | null {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  if (closedTrades.length < 10) return null;
  
  // Compare last 10 trades vs previous 10 trades
  const sortedTrades = [...closedTrades].sort((a, b) => 
    new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime()
  );
  
  if (sortedTrades.length < 20) return null;
  
  const last10 = sortedTrades.slice(0, 10);
  const prev10 = sortedTrades.slice(10, 20);
  
  const last10Wins = last10.filter(t => (t.pnl || 0) > 0).length;
  const prev10Wins = prev10.filter(t => (t.pnl || 0) > 0).length;
  
  const last10WinRate = (last10Wins / 10) * 100;
  const prev10WinRate = (prev10Wins / 10) * 100;
  
  const change = last10WinRate - prev10WinRate;
  
  if (Math.abs(change) < 5) return null; // Only show significant changes
  
  if (change > 0) {
    return {
      id: 'winrate-improving',
      type: 'success',
      message: `Tu win rate está mejorando: ${last10WinRate.toFixed(0)}% (últimas 10 ops) vs ${prev10WinRate.toFixed(0)}% (anteriores).`,
    };
  } else {
    return {
      id: 'winrate-declining',
      type: 'warning',
      message: `Tu win rate está disminuyendo: ${last10WinRate.toFixed(0)}% (últimas 10 ops) vs ${prev10WinRate.toFixed(0)}% (anteriores).`,
    };
  }
}

/**
 * Get current streak insight
 */
export function getCurrentStreakInsight(trades: Trade[]): DashboardInsight | null {
  const closedTrades = trades
    .filter(t => t.status === 'closed' && t.pnl !== null)
    .sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime());
  
  if (closedTrades.length === 0) return null;
  
  let currentStreak = 0;
  const firstTrade = closedTrades[0];
  const isWinning = (firstTrade.pnl || 0) > 0;
  
  for (const trade of closedTrades) {
    const pnl = trade.pnl || 0;
    if ((isWinning && pnl > 0) || (!isWinning && pnl < 0)) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  if (currentStreak < 3) return null;
  
  if (isWinning) {
    return {
      id: 'winning-streak',
      type: 'success',
      message: `¡Racha ganadora de ${currentStreak} operaciones consecutivas!`,
    };
  } else {
    return {
      id: 'losing-streak',
      type: 'warning',
      message: `Racha perdedora de ${currentStreak} operaciones. Considera revisar tu estrategia.`,
    };
  }
}

/**
 * Get best asset insight
 */
export function getBestAssetInsight(trades: Trade[]): DashboardInsight | null {
  const topAssets = getTopAssets(trades);
  
  if (topAssets.byPnl.length === 0) return null;
  
  const bestAsset = topAssets.byPnl[0];
  
  if (bestAsset.pnl <= 0) return null;
  
  // Find winrate for this asset
  const assetTrades = trades.filter(t => t.status === 'closed' && t.asset === bestAsset.asset && t.pnl !== null);
  const wins = assetTrades.filter(t => (t.pnl || 0) > 0).length;
  const winrate = assetTrades.length > 0 ? (wins / assetTrades.length) * 100 : 0;
  
  if (assetTrades.length < 3) return null;
  
  return {
    id: 'best-asset',
    type: 'success',
    message: `Tu mejor activo es ${bestAsset.asset} con ${winrate.toFixed(0)}% win rate y ${assetTrades.length} operaciones.`,
  };
}

/**
 * Get profit factor insight
 */
export function getProfitFactorInsight(trades: Trade[]): DashboardInsight | null {
  const analytics = calculateAnalytics(trades);
  
  if (analytics.totalTrades < 10) return null;
  
  if (analytics.profitFactor === Infinity) {
    return {
      id: 'perfect-profit-factor',
      type: 'success',
      message: `¡Profit Factor perfecto! No has tenido pérdidas aún.`,
    };
  }
  
  if (analytics.profitFactor > 2) {
    return {
      id: 'excellent-profit-factor',
      type: 'success',
      message: `Excelente Profit Factor: ${analytics.profitFactor.toFixed(2)}. Estás ganando ${analytics.profitFactor.toFixed(1)}x más de lo que pierdes.`,
    };
  }
  
  if (analytics.profitFactor < 1) {
    return {
      id: 'negative-profit-factor',
      type: 'warning',
      message: `Profit Factor bajo: ${analytics.profitFactor.toFixed(2)}. Estás perdiendo más de lo que ganas.`,
    };
  }
  
  return null;
}

/**
 * Get drawdown warning insight
 */
export function getDrawdownInsight(trades: Trade[], settings: Settings): DashboardInsight | null {
  const metrics = getRiskMetrics(trades, settings);
  
  if (metrics.currentDrawdownPercent > 15) {
    return {
      id: 'high-drawdown',
      type: 'warning',
      message: `Drawdown alto: ${metrics.currentDrawdownPercent.toFixed(1)}%. Considera reducir el tamaño de tus posiciones.`,
    };
  }
  
  if (metrics.currentDrawdownPercent > 10) {
    return {
      id: 'moderate-drawdown',
      type: 'info',
      message: `Drawdown moderado: ${metrics.currentDrawdownPercent.toFixed(1)}%. Mantén la disciplina.`,
    };
  }
  
  return null;
}

/**
 * Get best day of week insight
 */
export function getBestDayInsight(trades: Trade[]): DashboardInsight | null {
  const dailyData = calculateDailyPerformance(trades);
  
  if (dailyData.length === 0) return null;
  
  const bestDay = dailyData.reduce((best, current) => 
    current.totalPnl > best.totalPnl ? current : best
  );
  
  if (bestDay.totalPnl <= 0 || bestDay.trades < 3) return null;
  
  return {
    id: 'best-day',
    type: 'success',
    message: `Tu mejor día de la semana es ${bestDay.dayName} con ${bestDay.trades} operaciones y ${bestDay.winRate.toFixed(0)}% win rate.`,
  };
}

/**
 * Get risk per trade insight
 */
export function getRiskPerTradeInsight(trades: Trade[], settings: Settings): DashboardInsight | null {
  const metrics = getRiskMetrics(trades, settings);
  
  if (metrics.averageRiskPerTrade > metrics.maxRiskAllowed * 1.2) {
    return {
      id: 'risk-exceeded',
      type: 'warning',
      message: `Riesgo por operación excedido: ${metrics.averageRiskPerTrade.toFixed(2)}% vs límite de ${metrics.maxRiskAllowed}%.`,
    };
  }
  
  if (metrics.averageRiskPerTrade < metrics.maxRiskAllowed * 0.5) {
    return {
      id: 'risk-conservative',
      type: 'info',
      message: `Estás operando de forma conservadora: ${metrics.averageRiskPerTrade.toFixed(2)}% de riesgo promedio.`,
    };
  }
  
  return null;
}

/**
 * Get all dashboard insights (returns top 3 most relevant)
 */
export function getDashboardInsights(trades: Trade[], settings?: Settings): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  
  // Priority insights (warnings first, then success, then info)
  const overtrading = getOvertradingInsight(trades);
  if (overtrading) insights.push(overtrading);
  
  const dangerousAsset = getMostDangerousAsset(trades);
  if (dangerousAsset) insights.push(dangerousAsset);
  
  if (settings) {
    const drawdown = getDrawdownInsight(trades, settings);
    if (drawdown) insights.push(drawdown);
    
    const riskPerTrade = getRiskPerTradeInsight(trades, settings);
    if (riskPerTrade) insights.push(riskPerTrade);
  }
  
  const losingStreak = getCurrentStreakInsight(trades);
  if (losingStreak && losingStreak.type === 'warning') insights.push(losingStreak);
  
  const winRateTrend = getWinRateTrendInsight(trades);
  if (winRateTrend) insights.push(winRateTrend);
  
  const profitFactor = getProfitFactorInsight(trades);
  if (profitFactor) insights.push(profitFactor);
  
  const bestHour = getBestHourInsight(trades);
  if (bestHour) insights.push(bestHour);
  
  const bestDay = getBestDayInsight(trades);
  if (bestDay) insights.push(bestDay);
  
  const bestAsset = getBestAssetInsight(trades);
  if (bestAsset) insights.push(bestAsset);
  
  const winningStreak = getCurrentStreakInsight(trades);
  if (winningStreak && winningStreak.type === 'success') insights.push(winningStreak);
  
  // Sort by priority: warnings first, then success, then info
  const priorityOrder = { warning: 0, success: 1, info: 2 };
  insights.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
  
  // Return top 3
  return insights.slice(0, 3);
}

