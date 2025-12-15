/**
 * Asset-specific statistics and insights
 * Calculates metrics for a specific asset from user's trading history
 */

import type { Trade, Settings } from '@/types/Trading';
import { calculateAnalytics } from './calculations';
import { calculateDrawdown } from './risk';
import { getTopAssets } from './insights';

export interface AssetStatistics {
  asset: string;
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  totalPnl: number;
  averagePnl: number;
  expectancy: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageR: number;
  bestTrade: number;
  worstTrade: number;
  winStreak: number;
  lossStreak: number;
  profitFactor: number;
}

export interface AssetInsight {
  id: string;
  type: 'warning' | 'success' | 'info';
  message: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * Calculate statistics for a specific asset
 */
export function calculateAssetStatistics(
  trades: Trade[],
  asset: string,
  initialCapital: number
): AssetStatistics | null {
  const assetTrades = trades.filter(t => t.asset === asset);
  
  if (assetTrades.length === 0) return null;

  const closedTrades = assetTrades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  if (closedTrades.length === 0) {
    return {
      asset,
      totalTrades: assetTrades.length,
      closedTrades: 0,
      winRate: 0,
      totalPnl: 0,
      averagePnl: 0,
      expectancy: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      averageR: 0,
      bestTrade: 0,
      worstTrade: 0,
      winStreak: 0,
      lossStreak: 0,
      profitFactor: 0,
    };
  }

  const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
  
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const averagePnl = closedTrades.length > 0 ? totalPnl / closedTrades.length : 0;
  
  // Calculate expectancy
  const avgWin = wins.length > 0 
    ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length 
    : 0;
  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length)
    : 0;
  const winProb = closedTrades.length > 0 ? wins.length / closedTrades.length : 0;
  const expectancy = (winProb * avgWin) - ((1 - winProb) * avgLoss);

  // Calculate drawdown for this asset
  const drawdown = calculateDrawdown(closedTrades, initialCapital);

  // Calculate average R
  const tradesWithR = closedTrades.filter(t => t.riskReward !== null);
  const averageR = tradesWithR.length > 0
    ? tradesWithR.reduce((sum, t) => sum + (t.riskReward || 0), 0) / tradesWithR.length
    : 0;

  // Best and worst trades
  const pnls = closedTrades.map(t => t.pnl || 0);
  const bestTrade = Math.max(...pnls, 0);
  const worstTrade = Math.min(...pnls, 0);

  // Calculate streaks
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;

  const sortedTrades = [...closedTrades].sort((a, b) => 
    new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
  );

  sortedTrades.forEach(trade => {
    const pnl = trade.pnl || 0;
    if (pnl > 0) {
      currentWinStreak++;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      currentLossStreak = 0;
    } else if (pnl < 0) {
      currentLossStreak++;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      currentWinStreak = 0;
    }
  });

  // Profit factor
  const totalWins = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  return {
    asset,
    totalTrades: assetTrades.length,
    closedTrades: closedTrades.length,
    winRate,
    totalPnl,
    averagePnl,
    expectancy,
    maxDrawdown: drawdown.max,
    maxDrawdownPercent: drawdown.maxPercent,
    averageR,
    bestTrade,
    worstTrade,
    winStreak: maxWinStreak,
    lossStreak: maxLossStreak,
    profitFactor,
  };
}

/**
 * Get contextual insights for a specific asset
 */
export function getAssetInsights(
  trades: Trade[],
  asset: string,
  settings: Settings
): AssetInsight[] {
  const insights: AssetInsight[] = [];
  const stats = calculateAssetStatistics(trades, asset, settings.initialCapital || settings.accountSize);

  if (!stats || stats.closedTrades < 3) {
    insights.push({
      id: 'insufficient-data',
      type: 'info',
      message: `Datos insuficientes para ${asset}. Necesitas al menos 3 operaciones cerradas.`,
      severity: 'low',
    });
    return insights;
  }

  // Negative asset warning
  if (stats.totalPnl < 0 && stats.closedTrades >= 5) {
    insights.push({
      id: 'negative-asset',
      type: 'warning',
      message: `⚠️ ${asset} ha sido históricamente negativo para ti (${stats.totalPnl.toFixed(2)} ${settings.baseCurrency} en ${stats.closedTrades} operaciones)`,
      severity: 'high',
    });
  }

  // Low win rate warning
  if (stats.winRate < 40 && stats.closedTrades >= 5) {
    insights.push({
      id: 'low-winrate',
      type: 'warning',
      message: `Win rate bajo en ${asset}: ${stats.winRate.toFixed(0)}% (${stats.closedTrades} operaciones)`,
      severity: 'medium',
    });
  }

  // High win rate success
  if (stats.winRate > 60 && stats.closedTrades >= 5) {
    insights.push({
      id: 'high-winrate',
      type: 'success',
      message: `✅ Buen rendimiento en ${asset}: ${stats.winRate.toFixed(0)}% win rate`,
      severity: 'low',
    });
  }

  // Best session analysis
  const sessionStats = calculateSessionPerformance(trades, asset);
  if (sessionStats.bestSession) {
    insights.push({
      id: 'best-session',
      type: 'info',
      message: `Mejor rendimiento en sesión ${sessionStats.bestSession.name} (${sessionStats.bestSession.winRate.toFixed(0)}% win rate)`,
      severity: 'low',
    });
  }

  // Drawdown warning
  if (stats.maxDrawdownPercent > 20) {
    insights.push({
      id: 'high-drawdown',
      type: 'warning',
      message: `Drawdown histórico alto en ${asset}: ${stats.maxDrawdownPercent.toFixed(1)}%`,
      severity: 'medium',
    });
  }

  return insights;
}

/**
 * Calculate performance by session for an asset
 */
function calculateSessionPerformance(
  trades: Trade[],
  asset: string
): {
  bestSession: { name: string; winRate: number; trades: number } | null;
  sessions: Array<{ name: string; winRate: number; trades: number; pnl: number }>;
} {
  const assetTrades = trades.filter(t => 
    t.asset === asset && 
    t.status === 'closed' && 
    t.pnl !== null &&
    t.session
  );

  const sessionMap = new Map<string, { wins: number; total: number; pnl: number }>();

  assetTrades.forEach(trade => {
    const session = trade.session!;
    if (!sessionMap.has(session)) {
      sessionMap.set(session, { wins: 0, total: 0, pnl: 0 });
    }
    const data = sessionMap.get(session)!;
    data.total++;
    data.pnl += trade.pnl || 0;
    if ((trade.pnl || 0) > 0) {
      data.wins++;
    }
  });

  const sessions = Array.from(sessionMap.entries()).map(([name, data]) => ({
    name: name === 'asian' ? 'Asiática' : name === 'london' ? 'Londres' : name === 'new-york' ? 'Nueva York' : name === 'overlap' ? 'Overlap' : 'Otra',
    winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
    trades: data.total,
    pnl: data.pnl,
  })).filter(s => s.trades >= 2);

  const bestSession = sessions.length > 0
    ? sessions.reduce((best, current) => 
        current.winRate > best.winRate ? current : best
      )
    : null;

  return { bestSession, sessions };
}

/**
 * Get current trading session
 */
export function getCurrentSession(): 'asian' | 'london' | 'new-york' | 'overlap' | 'other' {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Simplified session detection (would need timezone conversion for production)
  // Asian: 00:00-08:00 UTC
  // London: 08:00-16:00 UTC
  // NY: 13:00-21:00 UTC
  // Overlap: 13:00-16:00 UTC (London + NY)
  
  if (utcHour >= 13 && utcHour < 16) {
    return 'overlap';
  } else if (utcHour >= 8 && utcHour < 13) {
    return 'london';
  } else if (utcHour >= 13 && utcHour < 21) {
    return 'new-york';
  } else if (utcHour >= 0 && utcHour < 8) {
    return 'asian';
  } else {
    return 'other';
  }
}

