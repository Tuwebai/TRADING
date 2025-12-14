/**
 * Trade-specific metrics calculations
 * Used for the trade details panel
 */

import type { Trade } from '@/types/Trading';
import { calculatePNL } from './calculations';

/**
 * Calculate trade duration in hours and days
 */
export function calculateTradeDuration(trade: Trade): {
  hours: number;
  days: number;
  formatted: string;
} {
  const entryDate = new Date(trade.entryDate);
  const exitDate = trade.exitDate ? new Date(trade.exitDate) : new Date();
  
  const diffMs = exitDate.getTime() - entryDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${remainingHours}h`;
  } else {
    formatted = `${hours}h`;
  }
  
  return { hours, days, formatted };
}

/**
 * Calculate risk amount for a trade
 */
export function calculateTradeRisk(trade: Trade, accountSize: number): {
  riskAmount: number;
  riskPercent: number;
} {
  if (!trade.stopLoss) {
    return { riskAmount: 0, riskPercent: 0 };
  }
  
  const { positionType, entryPrice, stopLoss, positionSize } = trade;
  
  let priceRisk: number;
  if (positionType === 'long') {
    priceRisk = entryPrice - stopLoss;
  } else {
    priceRisk = stopLoss - entryPrice;
  }
  
  // Simplified risk calculation
  // For more accurate calculation, we'd need to know the instrument type
  const riskAmount = Math.abs(priceRisk * positionSize);
  const riskPercent = accountSize > 0 ? (riskAmount / accountSize) * 100 : 0;
  
  return { riskAmount, riskPercent };
}

/**
 * Calculate account percentage used by trade
 */
export function calculateAccountPercentage(trade: Trade, accountSize: number): number {
  if (accountSize <= 0) return 0;
  
  // Simplified: position size as percentage of account
  // This is a rough estimate
  const marginUsed = trade.positionSize * trade.entryPrice;
  return (marginUsed / accountSize) * 100;
}

