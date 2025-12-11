/**
 * Risk calculation utilities
 * Functions for calculating risk metrics from trades and settings
 */

import type { Trade, Settings } from '@/types/Trading';
import { generateEquityCurve, calculateMaxDrawdown } from './calculations';

export interface RiskMetrics {
  currentDrawdown: number;
  currentDrawdownPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  currentExposure: number;
  currentExposurePercent: number;
  averageRiskPerTrade: number;
  maxRiskAllowed: number;
  dailyLoss: number;
  dailyLossPercent: number;
}

export interface RiskWarning {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Calculate current drawdown from equity curve
 */
export function calculateDrawdown(
  trades: Trade[],
  initialCapital: number
): { current: number; currentPercent: number; max: number; maxPercent: number } {
  const equityCurve = generateEquityCurve(trades, initialCapital);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  
  if (equityCurve.length === 0) {
    return { current: 0, currentPercent: 0, max: 0, maxPercent: 0 };
  }
  
  const lastPoint = equityCurve[equityCurve.length - 1];
  const currentDrawdown = lastPoint.peak - lastPoint.equity;
  const currentDrawdownPercent = lastPoint.peak > 0 ? (currentDrawdown / lastPoint.peak) * 100 : 0;
  
  return {
    current: currentDrawdown,
    currentPercent: currentDrawdownPercent,
    max: maxDrawdown.maxDrawdown,
    maxPercent: maxDrawdown.maxDrawdownPercent,
  };
}

/**
 * Calculate current exposure (capital at risk from open trades)
 */
export function calculateExposure(
  trades: Trade[],
  currentCapital: number
): { total: number; percent: number; byAsset: Map<string, number> } {
  const openTrades = trades.filter(t => t.status === 'open');
  
  if (openTrades.length === 0 || currentCapital === 0) {
    return { total: 0, percent: 0, byAsset: new Map() };
  }
  
  const exposureByAsset = new Map<string, number>();
  let totalExposure = 0;
  
  openTrades.forEach(trade => {
    // Calculate risk amount (distance to stop loss * position size * leverage)
    const stopLoss = trade.stopLoss || trade.entryPrice;
    const priceDifference = Math.abs(trade.entryPrice - stopLoss);
    const leverage = trade.leverage || 1;
    
    // For forex, positionSize might be in lots
    const assetUpper = trade.asset.toUpperCase().replace('/', '');
    const isForex = trade.asset.includes('/') || 
                    /^[A-Z]{6}$/.test(assetUpper) ||
                    ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 
                     'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY'].includes(assetUpper);
    
    let units = trade.positionSize;
    if (isForex && trade.positionSize < 100) {
      units = trade.positionSize * 100000; // Convert lots to units
    }
    
    const riskAmount = priceDifference * units * leverage;
    totalExposure += riskAmount;
    
    // Track by asset
    const currentAssetExposure = exposureByAsset.get(trade.asset) || 0;
    exposureByAsset.set(trade.asset, currentAssetExposure + riskAmount);
  });
  
  const exposurePercent = (totalExposure / currentCapital) * 100;
  
  return {
    total: totalExposure,
    percent: exposurePercent,
    byAsset: exposureByAsset,
  };
}

/**
 * Calculate average risk per trade from closed trades
 */
export function calculateRiskPerTrade(
  trades: Trade[],
  currentCapital: number
): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  
  if (closedTrades.length === 0 || currentCapital === 0) {
    return 0;
  }
  
  // Calculate risk per trade (entry to stop loss distance)
  const risks: number[] = [];
  
  closedTrades.forEach(trade => {
    const stopLoss = trade.stopLoss || trade.entryPrice;
    const priceDifference = Math.abs(trade.entryPrice - stopLoss);
    const leverage = trade.leverage || 1;
    
    // For forex, positionSize might be in lots
    const assetUpper = trade.asset.toUpperCase().replace('/', '');
    const isForex = trade.asset.includes('/') || 
                    /^[A-Z]{6}$/.test(assetUpper) ||
                    ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 
                     'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY'].includes(assetUpper);
    
    let units = trade.positionSize;
    if (isForex && trade.positionSize < 100) {
      units = trade.positionSize * 100000;
    }
    
    const riskAmount = priceDifference * units * leverage;
    const riskPercent = (riskAmount / currentCapital) * 100;
    risks.push(riskPercent);
  });
  
  if (risks.length === 0) return 0;
  
  return risks.reduce((sum, risk) => sum + risk, 0) / risks.length;
}

/**
 * Calculate daily loss (today's P/L from closed trades)
 */
export function calculateDailyLoss(
  trades: Trade[],
  currentCapital: number
): { amount: number; percent: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayTrades = trades.filter(t => {
    if (t.status !== 'closed' || !t.exitDate) return false;
    const exitDate = new Date(t.exitDate);
    exitDate.setHours(0, 0, 0, 0);
    return exitDate.getTime() === today.getTime();
  });
  
  const dailyPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const dailyLossPercent = currentCapital > 0 ? (Math.abs(Math.min(0, dailyPnL)) / currentCapital) * 100 : 0;
  
  return {
    amount: Math.abs(Math.min(0, dailyPnL)),
    percent: dailyLossPercent,
  };
}

/**
 * Get all risk metrics
 */
export function getRiskMetrics(
  trades: Trade[],
  settings: Settings
): RiskMetrics {
  const initialCapital = settings.currentCapital || settings.initialCapital || settings.accountSize;
  const currentCapital = settings.currentCapital || settings.accountSize;
  
  const drawdown = calculateDrawdown(trades, initialCapital);
  const exposure = calculateExposure(trades, currentCapital);
  const avgRisk = calculateRiskPerTrade(trades, currentCapital);
  const dailyLoss = calculateDailyLoss(trades, currentCapital);
  
  return {
    currentDrawdown: drawdown.current,
    currentDrawdownPercent: drawdown.currentPercent,
    maxDrawdown: drawdown.max,
    maxDrawdownPercent: drawdown.maxPercent,
    currentExposure: exposure.total,
    currentExposurePercent: exposure.percent,
    averageRiskPerTrade: avgRisk,
    maxRiskAllowed: settings.riskPerTrade,
    dailyLoss: dailyLoss.amount,
    dailyLossPercent: dailyLoss.percent,
  };
}

/**
 * Get risk warnings based on metrics and settings
 */
export function getRiskWarnings(
  metrics: RiskMetrics,
  settings: Settings
): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  
  // Risk per trade exceeded
  if (metrics.averageRiskPerTrade > metrics.maxRiskAllowed) {
    warnings.push({
      id: 'risk-per-trade-exceeded',
      type: 'error',
      message: `Riesgo por operación excedido: ${metrics.averageRiskPerTrade.toFixed(2)}% > ${metrics.maxRiskAllowed}%`,
      severity: 'high',
    });
  }
  
  // Exposure too high (assuming max 50% exposure)
  const maxExposure = 50; // Could be configurable in settings
  if (metrics.currentExposurePercent > maxExposure) {
    warnings.push({
      id: 'exposure-too-high',
      type: 'error',
      message: `Exposición demasiado alta: ${metrics.currentExposurePercent.toFixed(1)}% > ${maxExposure}%`,
      severity: 'high',
    });
  } else if (metrics.currentExposurePercent > maxExposure * 0.8) {
    warnings.push({
      id: 'exposure-approaching',
      type: 'warning',
      message: `Exposición acercándose al límite: ${metrics.currentExposurePercent.toFixed(1)}%`,
      severity: 'medium',
    });
  }
  
  // Daily DD limit approaching (assuming 5% daily loss limit)
  const dailyLossLimit = 5; // Could be configurable in settings
  if (metrics.dailyLossPercent > dailyLossLimit) {
    warnings.push({
      id: 'daily-dd-limit-exceeded',
      type: 'error',
      message: `Límite de pérdida diaria excedido: ${metrics.dailyLossPercent.toFixed(2)}% > ${dailyLossLimit}%`,
      severity: 'high',
    });
  } else if (metrics.dailyLossPercent > dailyLossLimit * 0.8) {
    warnings.push({
      id: 'daily-dd-limit-approaching',
      type: 'warning',
      message: `Límite de pérdida diaria acercándose: ${metrics.dailyLossPercent.toFixed(2)}%`,
      severity: 'medium',
    });
  }
  
  // High drawdown warning
  if (metrics.currentDrawdownPercent > 20) {
    warnings.push({
      id: 'high-drawdown',
      type: 'error',
      message: `Drawdown alto: ${metrics.currentDrawdownPercent.toFixed(2)}%`,
      severity: 'high',
    });
  } else if (metrics.currentDrawdownPercent > 10) {
    warnings.push({
      id: 'drawdown-warning',
      type: 'warning',
      message: `Drawdown moderado: ${metrics.currentDrawdownPercent.toFixed(2)}%`,
      severity: 'medium',
    });
  }
  
  return warnings;
}

/**
 * Get overall risk level (green/yellow/red)
 */
export function getRiskLevel(metrics: RiskMetrics, warnings: RiskWarning[]): 'safe' | 'warning' | 'danger' {
  const hasHighSeverity = warnings.some(w => w.severity === 'high');
  const hasMediumSeverity = warnings.some(w => w.severity === 'medium');
  
  if (hasHighSeverity) return 'danger';
  if (hasMediumSeverity) return 'warning';
  if (metrics.currentDrawdownPercent > 5 || metrics.currentExposurePercent > 30) return 'warning';
  return 'safe';
}

