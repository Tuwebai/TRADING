/**
 * Forex-specific calculations
 * Handles pips, swap, and other forex-specific metrics
 */

import type { Trade } from '@/types/Trading';

/**
 * Detect if an asset is a forex pair
 */
export function isForexPair(asset: string): boolean {
  const assetUpper = asset.toUpperCase().replace('/', '');
  return asset.includes('/') || 
         /^[A-Z]{6}$/.test(assetUpper) ||
         ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 
          'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'EURCHF', 'GBPCHF',
          'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY'].includes(assetUpper);
}

/**
 * Get pip value for a forex pair
 * For most pairs, 1 pip = 0.0001
 * For JPY pairs, 1 pip = 0.01
 */
export function getPipValue(asset: string): number {
  const assetUpper = asset.toUpperCase().replace('/', '');
  const jpyPairs = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY'];
  
  if (jpyPairs.includes(assetUpper)) {
    return 0.01;
  }
  
  return 0.0001;
}

/**
 * Calculate pips for a price difference
 */
export function calculatePips(asset: string, priceDifference: number): number {
  const pipValue = getPipValue(asset);
  return priceDifference / pipValue;
}

/**
 * Calculate pips for a trade
 * Returns entry to exit pips, entry to SL pips, entry to TP pips
 */
export function calculateTradePips(trade: Trade): {
  totalPips: number | null;
  riskPips: number | null;
  rewardPips: number | null;
} {
  if (!isForexPair(trade.asset)) {
    return { totalPips: null, riskPips: null, rewardPips: null };
  }

  const pipValue = getPipValue(trade.asset);
  
  let totalPips: number | null = null;
  if (trade.exitPrice) {
    const priceDiff = Math.abs(trade.exitPrice - trade.entryPrice);
    totalPips = calculatePips(trade.asset, priceDiff);
    
    // Adjust sign based on position type and profit/loss
    if (trade.positionType === 'long') {
      totalPips = trade.exitPrice > trade.entryPrice ? totalPips : -totalPips;
    } else {
      totalPips = trade.exitPrice < trade.entryPrice ? totalPips : -totalPips;
    }
  }

  let riskPips: number | null = null;
  if (trade.stopLoss) {
    const riskDiff = Math.abs(trade.entryPrice - trade.stopLoss);
    riskPips = calculatePips(trade.asset, riskDiff);
  }

  let rewardPips: number | null = null;
  if (trade.takeProfit) {
    const rewardDiff = Math.abs(trade.takeProfit - trade.entryPrice);
    rewardPips = calculatePips(trade.asset, rewardDiff);
  }

  return { totalPips, riskPips, rewardPips };
}

/**
 * Calculate swap for overnight positions
 * Swap = (Swap Rate × Position Size × Number of Nights) / 100
 * 
 * @param trade - The trade to calculate swap for
 * @param swapRate - Swap rate in pips (can be positive or negative)
 * @param swapType - 'long' or 'short' to determine if swap is applied
 * @returns Swap amount in base currency
 */
export function calculateSwap(
  trade: Trade,
  swapRate: number,
  swapType: 'long' | 'short' | 'both' = 'both'
): number {
  if (!isForexPair(trade.asset) || !trade.exitDate || !trade.entryDate) {
    return 0;
  }

  // Calculate number of nights (overnight positions)
  const entryDate = new Date(trade.entryDate);
  const exitDate = new Date(trade.exitDate);
  const nights = Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (nights <= 0) {
    return 0; // No overnight, no swap
  }

  // Determine if swap applies based on position type
  if (swapType === 'long' && trade.positionType !== 'long') {
    return 0;
  }
  if (swapType === 'short' && trade.positionType !== 'short') {
    return 0;
  }

  // Calculate position size in lots
  let sizeInLots: number;
  if (trade.positionSize < 100) {
    // Assume lots (e.g., 0.1, 1.0, etc.)
    sizeInLots = trade.positionSize;
  } else {
    // Convert units to lots (1 lot = 100,000 units)
    sizeInLots = trade.positionSize / 100000;
  }

  // Calculate swap
  // Swap = Swap Rate (pips) × Pip Value × Position Size (lots) × Number of Nights
  const pipValue = getPipValue(trade.asset);
  const swapPerLotPerNight = swapRate * pipValue * 100000; // Value per lot per night
  const swapAmount = swapPerLotPerNight * sizeInLots * nights;

  return swapAmount;
}

/**
 * Calculate total cost including commissions and swap
 */
export function calculateTotalCosts(
  trade: Trade,
  commission: number = 0,
  swapRate: number = 0,
  swapType: 'long' | 'short' | 'both' = 'both'
): {
  commission: number;
  swap: number;
  spread: number;
  total: number;
} {
  const swap = calculateSwap(trade, swapRate, swapType);
  const spread = trade.spread || 0;
  
  return {
    commission,
    swap,
    spread,
    total: commission + swap + spread,
  };
}

