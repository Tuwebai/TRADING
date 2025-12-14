/**
 * Funciones para comparar métricas actuales con históricas
 */

import type { Trade } from '@/types/Trading';
import { calculateAnalytics } from './calculations';
import { getTradesByMonth } from './calendarStats';

export interface MetricComparison {
  current: number;
  historical: number | null;
  change: number | null; // Porcentaje de cambio
  isReliable: boolean; // Si hay suficientes datos
  reliabilityMessage?: string;
}

/**
 * Compara win rate actual vs histórico
 */
export function compareWinRate(trades: Trade[]): MetricComparison {
  const closedTrades = trades.filter(t => t.status === 'closed');
  
  if (closedTrades.length < 10) {
    return {
      current: calculateAnalytics(trades).winRate,
      historical: null,
      change: null,
      isReliable: false,
      reliabilityMessage: 'Dato poco confiable (<10 operaciones)',
    };
  }

  // Win rate actual (último mes)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthTrades = getTradesByMonth(trades, currentYear, currentMonth);
  const currentAnalytics = calculateAnalytics(currentMonthTrades);

  // Win rate histórico (todos los trades excepto el mes actual)
  const historicalTrades = closedTrades.filter(t => {
    const tradeDate = new Date(t.exitDate || t.entryDate);
    return !(tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear);
  });

  if (historicalTrades.length < 10) {
    return {
      current: currentAnalytics.winRate,
      historical: null,
      change: null,
      isReliable: false,
      reliabilityMessage: 'Dato poco confiable (pocos datos históricos)',
    };
  }

  const historicalAnalytics = calculateAnalytics(historicalTrades);
  const change = historicalAnalytics.winRate > 0
    ? ((currentAnalytics.winRate - historicalAnalytics.winRate) / historicalAnalytics.winRate) * 100
    : 0;

  return {
    current: currentAnalytics.winRate,
    historical: historicalAnalytics.winRate,
    change,
    isReliable: true,
  };
}

/**
 * Compara PnL promedio actual vs histórico
 */
export function compareAveragePnL(trades: Trade[]): MetricComparison {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  if (closedTrades.length < 10) {
    const currentAvg = closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / closedTrades.length
      : 0;
    
    return {
      current: currentAvg,
      historical: null,
      change: null,
      isReliable: false,
      reliabilityMessage: 'Dato poco confiable (<10 operaciones)',
    };
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthTrades = getTradesByMonth(trades, currentYear, currentMonth);
  const currentAvg = currentMonthTrades.length > 0
    ? currentMonthTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / currentMonthTrades.length
    : 0;

  const historicalTrades = closedTrades.filter(t => {
    const tradeDate = new Date(t.exitDate || t.entryDate);
    return !(tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear);
  });

  if (historicalTrades.length < 10) {
    return {
      current: currentAvg,
      historical: null,
      change: null,
      isReliable: false,
      reliabilityMessage: 'Dato poco confiable (pocos datos históricos)',
    };
  }

  const historicalAvg = historicalTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / historicalTrades.length;
  const change = historicalAvg !== 0
    ? ((currentAvg - historicalAvg) / Math.abs(historicalAvg)) * 100
    : 0;

  return {
    current: currentAvg,
    historical: historicalAvg,
    change,
    isReliable: true,
  };
}

/**
 * Compara profit factor actual vs histórico
 */
export function compareProfitFactor(trades: Trade[]): MetricComparison {
  const analytics = calculateAnalytics(trades);
  
  if (trades.filter(t => t.status === 'closed').length < 10) {
    return {
      current: analytics.profitFactor,
      historical: null,
      change: null,
      isReliable: false,
      reliabilityMessage: 'Dato poco confiable (<10 operaciones)',
    };
  }

  // Para profit factor, comparamos con el promedio de los últimos 3 meses vs anteriores
  const now = new Date();
  const closedTrades = trades.filter(t => t.status === 'closed').sort((a, b) => 
    new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime()
  );

  if (closedTrades.length < 20) {
    return {
      current: analytics.profitFactor,
      historical: null,
      change: null,
      isReliable: false,
      reliabilityMessage: 'Dato poco confiable (pocos datos históricos)',
    };
  }

  // Últimos 3 meses
  const recentTrades = closedTrades.slice(0, Math.floor(closedTrades.length * 0.3));
  const recentAnalytics = calculateAnalytics(recentTrades);

  // Resto histórico
  const historicalTrades = closedTrades.slice(Math.floor(closedTrades.length * 0.3));
  const historicalAnalytics = calculateAnalytics(historicalTrades);

  const change = historicalAnalytics.profitFactor > 0 && !isFinite(historicalAnalytics.profitFactor)
    ? 0
    : historicalAnalytics.profitFactor > 0
    ? ((recentAnalytics.profitFactor - historicalAnalytics.profitFactor) / historicalAnalytics.profitFactor) * 100
    : 0;

  return {
    current: recentAnalytics.profitFactor,
    historical: historicalAnalytics.profitFactor,
    change,
    isReliable: true,
  };
}

