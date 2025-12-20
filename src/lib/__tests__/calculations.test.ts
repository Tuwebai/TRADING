/**
 * Tests for calculation utilities
 * Critical financial calculations must be accurate
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePNL,
  calculateRR,
  calculateWinRate,
  calculateAverageR,
  calculateAveragePnl,
  calculateMaxWinStreak,
  calculateMaxLossStreak,
  calculateProfitFactor,
  calculateAnalytics,
} from '../calculations';
import type { Trade } from '@/types/Trading';

describe('calculatePNL', () => {
  it('should return 0 for open trades', () => {
    const trade: Trade = {
      id: '1',
      asset: 'EURUSD',
      positionType: 'long',
      entryPrice: 1.1000,
      exitPrice: null,
      positionSize: 0.1,
      status: 'open',
      entryDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(calculatePNL(trade)).toBe(0);
  });

  it('should calculate PnL for long forex trade correctly', () => {
    const trade: Trade = {
      id: '1',
      asset: 'EURUSD',
      positionType: 'long',
      entryPrice: 1.1000,
      exitPrice: 1.1050,
      positionSize: 0.1, // 0.1 lots = 10,000 units
      status: 'closed',
      entryDate: new Date().toISOString(),
      exitDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Price difference: 0.0050
    // Units: 0.1 * 100,000 = 10,000
    // PnL: 0.0050 * 10,000 = 50
    const pnl = calculatePNL(trade);
    expect(pnl).toBeCloseTo(50, 2);
  });

  it('should calculate PnL for short forex trade correctly', () => {
    const trade: Trade = {
      id: '1',
      asset: 'EURUSD',
      positionType: 'short',
      entryPrice: 1.1050,
      exitPrice: 1.1000,
      positionSize: 0.1,
      status: 'closed',
      entryDate: new Date().toISOString(),
      exitDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Price difference: -0.0050
    // Short: -(-0.0050) = +0.0050
    // Units: 10,000
    // PnL: 0.0050 * 10,000 = 50
    const pnl = calculatePNL(trade);
    expect(pnl).toBeCloseTo(50, 2);
  });

  it('should subtract commission and swap from PnL', () => {
    const trade: Trade = {
      id: '1',
      asset: 'EURUSD',
      positionType: 'long',
      entryPrice: 1.1000,
      exitPrice: 1.1050,
      positionSize: 0.1,
      commission: 0.7,
      swap: 0.3,
      status: 'closed',
      entryDate: new Date().toISOString(),
      exitDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pnl = calculatePNL(trade);
    // 50 - 0.7 - 0.3 = 49
    expect(pnl).toBeCloseTo(49, 2);
  });
});

describe('calculateRR', () => {
  it('should return null if stop loss or take profit is missing', () => {
    const trade: Trade = {
      id: '1',
      asset: 'EURUSD',
      positionType: 'long',
      entryPrice: 1.1000,
      exitPrice: 1.1050,
      positionSize: 0.1,
      status: 'closed',
      entryDate: new Date().toISOString(),
      exitDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(calculateRR(trade)).toBeNull();
  });

  it('should calculate R/R for long position correctly', () => {
    const trade: Trade = {
      id: '1',
      asset: 'EURUSD',
      positionType: 'long',
      entryPrice: 1.1000,
      exitPrice: 1.1050,
      stopLoss: 1.0950,
      takeProfit: 1.1100,
      positionSize: 0.1,
      status: 'closed',
      entryDate: new Date().toISOString(),
      exitDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Risk: 1.1000 - 1.0950 = 0.0050
    // Reward: 1.1100 - 1.1000 = 0.0100
    // R/R: 0.0100 / 0.0050 = 2.0
    const rr = calculateRR(trade);
    expect(rr).toBeCloseTo(2.0, 2);
  });

  it('should calculate R/R for short position correctly', () => {
    const trade: Trade = {
      id: '1',
      asset: 'EURUSD',
      positionType: 'short',
      entryPrice: 1.1000,
      exitPrice: 1.0950,
      stopLoss: 1.1050,
      takeProfit: 1.0900,
      positionSize: 0.1,
      status: 'closed',
      entryDate: new Date().toISOString(),
      exitDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Risk: 1.1050 - 1.1000 = 0.0050
    // Reward: 1.1000 - 1.0900 = 0.0100
    // R/R: 0.0100 / 0.0050 = 2.0
    const rr = calculateRR(trade);
    expect(rr).toBeCloseTo(2.0, 2);
  });
});

describe('calculateWinRate', () => {
  it('should return 0 for empty trades array', () => {
    expect(calculateWinRate([])).toBe(0);
  });

  it('should calculate win rate correctly', () => {
    const trades: Trade[] = [
      {
        id: '1',
        asset: 'EURUSD',
        positionType: 'long',
        entryPrice: 1.1000,
        exitPrice: 1.1050,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        asset: 'GBPUSD',
        positionType: 'long',
        entryPrice: 1.2500,
        exitPrice: 1.2450,
        positionSize: 0.1,
        pnl: -50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        asset: 'USDJPY',
        positionType: 'short',
        entryPrice: 150.00,
        exitPrice: 149.50,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 2 wins out of 3 = 66.67%
    const winRate = calculateWinRate(trades);
    expect(winRate).toBeCloseTo(66.67, 1);
  });

  it('should ignore open trades', () => {
    const trades: Trade[] = [
      {
        id: '1',
        asset: 'EURUSD',
        positionType: 'long',
        entryPrice: 1.1000,
        exitPrice: 1.1050,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        asset: 'GBPUSD',
        positionType: 'long',
        entryPrice: 1.2500,
        exitPrice: null,
        positionSize: 0.1,
        status: 'open',
        entryDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Only 1 closed trade, 1 win = 100%
    const winRate = calculateWinRate(trades);
    expect(winRate).toBe(100);
  });
});

describe('calculateAverageR', () => {
  it('should return 0 for empty trades', () => {
    expect(calculateAverageR([])).toBe(0);
  });

  it('should calculate average R correctly', () => {
    const trades: Trade[] = [
      {
        id: '1',
        asset: 'EURUSD',
        positionType: 'long',
        entryPrice: 1.1000,
        exitPrice: 1.1050,
        positionSize: 0.1,
        riskReward: 2.0,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        asset: 'GBPUSD',
        positionType: 'long',
        entryPrice: 1.2500,
        exitPrice: 1.2550,
        positionSize: 0.1,
        riskReward: 1.5,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // (2.0 + 1.5) / 2 = 1.75
    const avgR = calculateAverageR(trades);
    expect(avgR).toBeCloseTo(1.75, 2);
  });
});

describe('calculateAveragePnl', () => {
  it('should return 0 for empty trades', () => {
    expect(calculateAveragePnl([])).toBe(0);
  });

  it('should calculate average PnL correctly', () => {
    const trades: Trade[] = [
      {
        id: '1',
        asset: 'EURUSD',
        positionType: 'long',
        entryPrice: 1.1000,
        exitPrice: 1.1050,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        asset: 'GBPUSD',
        positionType: 'long',
        entryPrice: 1.2500,
        exitPrice: 1.2550,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        asset: 'USDJPY',
        positionType: 'short',
        entryPrice: 150.00,
        exitPrice: 150.50,
        positionSize: 0.1,
        pnl: -50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // (50 + 50 - 50) / 3 = 16.67
    const avgPnl = calculateAveragePnl(trades);
    expect(avgPnl).toBeCloseTo(16.67, 1);
  });
});

describe('calculateMaxWinStreak', () => {
  it('should return 0 for empty trades', () => {
    expect(calculateMaxWinStreak([])).toBe(0);
  });

  it('should calculate max win streak correctly', () => {
    const trades: Trade[] = [
      {
        id: '1',
        asset: 'EURUSD',
        positionType: 'long',
        entryPrice: 1.1000,
        exitPrice: 1.1050,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: '2024-01-01',
        exitDate: '2024-01-02',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        asset: 'GBPUSD',
        positionType: 'long',
        entryPrice: 1.2500,
        exitPrice: 1.2550,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: '2024-01-03',
        exitDate: '2024-01-04',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        asset: 'USDJPY',
        positionType: 'short',
        entryPrice: 150.00,
        exitPrice: 150.50,
        positionSize: 0.1,
        pnl: -50,
        status: 'closed',
        entryDate: '2024-01-05',
        exitDate: '2024-01-06',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '4',
        asset: 'AUDUSD',
        positionType: 'long',
        entryPrice: 0.6500,
        exitPrice: 0.6550,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: '2024-01-07',
        exitDate: '2024-01-08',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Max streak: 2 wins (trades 1 and 2)
    const maxStreak = calculateMaxWinStreak(trades);
    expect(maxStreak).toBe(2);
  });
});

describe('calculateMaxLossStreak', () => {
  it('should return 0 for empty trades', () => {
    expect(calculateMaxLossStreak([])).toBe(0);
  });

  it('should calculate max loss streak correctly', () => {
    const trades: Trade[] = [
      {
        id: '1',
        asset: 'EURUSD',
        positionType: 'long',
        entryPrice: 1.1000,
        exitPrice: 1.0950,
        positionSize: 0.1,
        pnl: -50,
        status: 'closed',
        entryDate: '2024-01-01',
        exitDate: '2024-01-02',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        asset: 'GBPUSD',
        positionType: 'long',
        entryPrice: 1.2500,
        exitPrice: 1.2450,
        positionSize: 0.1,
        pnl: -50,
        status: 'closed',
        entryDate: '2024-01-03',
        exitDate: '2024-01-04',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        asset: 'USDJPY',
        positionType: 'short',
        entryPrice: 150.00,
        exitPrice: 149.50,
        positionSize: 0.1,
        pnl: 50,
        status: 'closed',
        entryDate: '2024-01-05',
        exitDate: '2024-01-06',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Max streak: 2 losses (trades 1 and 2)
    const maxStreak = calculateMaxLossStreak(trades);
    expect(maxStreak).toBe(2);
  });
});

describe('calculateProfitFactor', () => {
  it('should return 0 for empty trades', () => {
    expect(calculateProfitFactor([])).toBe(0);
  });

  it('should calculate profit factor correctly', () => {
    const trades: Trade[] = [
      {
        id: '1',
        asset: 'EURUSD',
        positionType: 'long',
        entryPrice: 1.1000,
        exitPrice: 1.1050,
        positionSize: 0.1,
        pnl: 100,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        asset: 'GBPUSD',
        positionType: 'long',
        entryPrice: 1.2500,
        exitPrice: 1.2450,
        positionSize: 0.1,
        pnl: -50,
        status: 'closed',
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Total profits: 100
    // Total losses: 50
    // Profit factor: 100 / 50 = 2.0
    const pf = calculateProfitFactor(trades);
    expect(pf).toBeCloseTo(2.0, 2);
  });
});

