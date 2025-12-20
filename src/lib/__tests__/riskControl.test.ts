/**
 * Tests for risk control utilities
 * Critical risk management functions must be accurate
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGlobalRiskStatus,
  calculateTodayRisk,
  simulateTradeImpact,
} from '../riskControl';
import { getRiskMetrics } from '../risk';
import type { Trade, Settings } from '@/types/Trading';

const createMockSettings = (overrides?: Partial<Settings>): Settings => ({
  accountSize: 10000,
  baseCurrency: 'USD',
  riskPerTrade: 1,
  currentCapital: 10000,
  initialCapital: 10000,
  manualCapitalAdjustment: 0,
  theme: 'light',
  customTheme: undefined,
  advanced: {
    riskManagement: {
      maxRiskPerTrade: 2,
      maxRiskDaily: 5,
      maxDrawdown: 10,
      drawdownMode: 'hard-stop',
    },
  },
  tradingRules: [],
  ...overrides,
});

const createMockTrade = (overrides?: Partial<Trade>): Trade => ({
  id: '1',
  asset: 'EURUSD',
  positionType: 'long',
  entryPrice: 1.1000,
  exitPrice: 1.1050,
  positionSize: 0.1,
  status: 'closed',
  pnl: 50,
  entryDate: new Date().toISOString(),
  exitDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('calculateGlobalRiskStatus', () => {
  it('should return ok status when all metrics are within limits', () => {
    const trades: Trade[] = [];
    const settings = createMockSettings();

    const status = calculateGlobalRiskStatus(trades, settings);
    expect(status.status).toBe('ok');
    expect(status.reasons).toHaveLength(0);
  });

  it('should return blocked status when drawdown exceeds limit', () => {
    const trades: Trade[] = [
      createMockTrade({ pnl: -1500 }), // Large loss
    ];
    const settings = createMockSettings({
      currentCapital: 8500, // 15% drawdown
      advanced: {
        riskManagement: {
          maxRiskPerTrade: 2,
          maxRiskDaily: 5,
          maxDrawdown: 10,
          drawdownMode: 'hard-stop',
        },
      },
    });

    const status = calculateGlobalRiskStatus(trades, settings);
    expect(status.status).toBe('blocked');
    expect(status.reasons.length).toBeGreaterThan(0);
  });

  it('should return warning status when approaching limits', () => {
    const trades: Trade[] = [];
    const settings = createMockSettings({
      currentCapital: 9200, // 8% drawdown (80% of 10% limit)
      advanced: {
        riskManagement: {
          maxRiskPerTrade: 2,
          maxRiskDaily: 5,
          maxDrawdown: 10,
          drawdownMode: 'soft-warning',
        },
      },
    });

    const status = calculateGlobalRiskStatus(trades, settings);
    expect(status.status).toBe('warning');
  });
});

describe('calculateTodayRisk', () => {
  it('should calculate today risk correctly', () => {
    const today = new Date().toISOString().split('T')[0];
    const trades: Trade[] = [
      createMockTrade({
        entryDate: today,
        pnl: -100, // Risk of 1% on 10k account
      }),
    ];
    const settings = createMockSettings();

    const risk = calculateTodayRisk(trades, settings);
    expect(risk.percent).toBeCloseTo(1, 1);
    expect(risk.amount).toBeCloseTo(100, 1);
  });

  it('should return 0 for days with no trades', () => {
    const trades: Trade[] = [];
    const settings = createMockSettings();

    const risk = calculateTodayRisk(trades, settings);
    expect(risk.percent).toBe(0);
    expect(risk.amount).toBe(0);
  });
});

describe('simulateTradeImpact', () => {
  it('should simulate trade impact correctly', () => {
    const trades: Trade[] = [];
    const settings = createMockSettings();
    const simulatedTrade = createMockTrade({
      entryPrice: 1.1000,
      stopLoss: 1.0950,
      positionSize: 0.1,
    });

    const impact = simulateTradeImpact(trades, settings, simulatedTrade);
    expect(impact).toBeDefined();
    expect(impact.finalStatus).toBeDefined();
    expect(impact.impactOnDailyRisk).toBeDefined();
  });
});

