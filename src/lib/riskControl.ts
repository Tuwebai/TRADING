/**
 * Risk Control Center Utilities
 * Functions for real-time risk monitoring and control
 */

import type { Trade, Settings } from '@/types/Trading';
import { getRiskMetrics } from './risk';
import { evaluateTradeRules } from './tradeRuleEvaluation';
import { checkTradingRules } from './tradingRules';

export interface RiskGlobalStatus {
  riskPerTradeAllowed: number | null;
  riskDailyAllowed: number | null;
  drawdownMaxAllowed: number | null;
  status: 'ok' | 'warning' | 'blocked';
  reasons: string[];
}

export interface RealTimeRiskMetrics {
  riskUsedToday: {
    percent: number;
    amount: number;
  };
  riskRemaining: {
    percent: number;
    amount: number;
  };
  tradesRemainingToday: number | null;
  marginBar: {
    used: number;
    available: number;
    limit: number;
  };
}

export interface SimulationImpact {
  impactOnDailyRisk: {
    before: number;
    after: number;
    change: number;
  };
  impactOnDrawdown: {
    before: number;
    after: number;
    change: number;
  };
  rulesThatWouldActivate: Array<{
    ruleName: string;
    severity: 'critical' | 'minor';
    message: string;
  }>;
  finalStatus: 'ok' | 'warning' | 'blocked';
}

/**
 * Calculate global risk status from settings and current metrics
 */
export function calculateGlobalRiskStatus(
  trades: Trade[],
  settings: Settings
): RiskGlobalStatus {
  const riskManagement = settings.advanced?.riskManagement;
  const riskMetrics = getRiskMetrics(trades, settings);
  const reasons: string[] = [];
  let status: 'ok' | 'warning' | 'blocked' = 'ok';

  const riskPerTradeAllowed = riskManagement?.maxRiskPerTrade ?? null;
  const riskDailyAllowed = riskManagement?.maxRiskDaily ?? null;
  const drawdownMaxAllowed = riskManagement?.maxDrawdown ?? null;

  // Check drawdown
  if (drawdownMaxAllowed !== null && riskMetrics.currentDrawdownPercent > drawdownMaxAllowed) {
    status = riskManagement?.drawdownMode === 'hard-stop' ? 'blocked' : 'warning';
    reasons.push(`Drawdown actual (${riskMetrics.currentDrawdownPercent.toFixed(2)}%) excede el máximo permitido (${drawdownMaxAllowed}%)`);
  } else if (drawdownMaxAllowed !== null && riskMetrics.currentDrawdownPercent > drawdownMaxAllowed * 0.8) {
    if (status === 'ok') status = 'warning';
    reasons.push(`Drawdown acercándose al límite (${riskMetrics.currentDrawdownPercent.toFixed(2)}% / ${drawdownMaxAllowed}%)`);
  }

  // Check daily risk
  const todayRisk = calculateTodayRisk(trades, settings);
  if (riskDailyAllowed !== null && todayRisk.percent > riskDailyAllowed) {
    status = 'blocked';
    reasons.push(`Riesgo diario (${todayRisk.percent.toFixed(2)}%) excede el límite (${riskDailyAllowed}%)`);
  } else if (riskDailyAllowed !== null && todayRisk.percent > riskDailyAllowed * 0.8) {
    if (status === 'ok') status = 'warning';
    reasons.push(`Riesgo diario acercándose al límite (${todayRisk.percent.toFixed(2)}% / ${riskDailyAllowed}%)`);
  }

  // Check if blocked by ultra-disciplined mode
  const blockedUntil = settings.advanced?.ultraDisciplinedMode?.blockedUntil;
  if (blockedUntil) {
    const now = new Date();
    const blockedDate = new Date(blockedUntil);
    if (now < blockedDate) {
      status = 'blocked';
      reasons.push(`Trading bloqueado hasta ${blockedDate.toLocaleString('es-ES')}`);
    }
  }

  return {
    riskPerTradeAllowed,
    riskDailyAllowed,
    drawdownMaxAllowed,
    status,
    reasons,
  };
}

/**
 * Calculate today's risk usage
 */
export function calculateTodayRisk(
  trades: Trade[],
  settings: Settings
): { percent: number; amount: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentCapital = settings.currentCapital || settings.accountSize;

  // Calculate risk from today's trades (both open and closed)
  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    tradeDate.setHours(0, 0, 0, 0);
    return tradeDate.getTime() === today.getTime();
  });

  let totalRisk = 0;
  todayTrades.forEach(trade => {
    if (trade.stopLoss) {
      const priceDiff = Math.abs(trade.entryPrice - trade.stopLoss);
      const leverage = trade.leverage || 1;
      const riskAmount = priceDiff * trade.positionSize * leverage;
      totalRisk += riskAmount;
    }
  });

  const riskPercent = currentCapital > 0 ? (totalRisk / currentCapital) * 100 : 0;

  return {
    percent: riskPercent,
    amount: totalRisk,
  };
}

/**
 * Calculate real-time risk metrics
 */
export function calculateRealTimeRiskMetrics(
  trades: Trade[],
  settings: Settings
): RealTimeRiskMetrics {
  const riskManagement = settings.advanced?.riskManagement;
  const currentCapital = settings.currentCapital || settings.accountSize;
  const todayRisk = calculateTodayRisk(trades, settings);
  const maxDailyRisk = riskManagement?.maxRiskDaily ?? null;
  const maxTradesPerDay = settings.advanced?.tradingRules?.maxTradesPerDay ?? null;

  // Calculate trades remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTradesCount = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    tradeDate.setHours(0, 0, 0, 0);
    return tradeDate.getTime() === today.getTime();
  }).length;

  const tradesRemaining = maxTradesPerDay !== null 
    ? Math.max(0, maxTradesPerDay - todayTradesCount)
    : null;

  // Calculate risk remaining
  const riskRemainingPercent = maxDailyRisk !== null
    ? Math.max(0, maxDailyRisk - todayRisk.percent)
    : null;
  const riskRemainingAmount = riskRemainingPercent !== null
    ? (riskRemainingPercent / 100) * currentCapital
    : null;

  // Margin bar
  const marginLimit = maxDailyRisk ?? 100; // Default to 100% if no limit
  const marginUsed = todayRisk.percent;
  const marginAvailable = Math.max(0, marginLimit - marginUsed);

  return {
    riskUsedToday: {
      percent: todayRisk.percent,
      amount: todayRisk.amount,
    },
    riskRemaining: {
      percent: riskRemainingPercent ?? 100,
      amount: riskRemainingAmount ?? currentCapital,
    },
    tradesRemainingToday: tradesRemaining,
    marginBar: {
      used: marginUsed,
      available: marginAvailable,
      limit: marginLimit,
    },
  };
}

/**
 * Simulate impact of a potential trade
 */
export function simulateTradeImpact(
  simulatedTrade: {
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSize?: number;
    entryDate?: string;
    asset?: string;
    positionType?: 'long' | 'short';
    leverage?: number;
  },
  trades: Trade[],
  settings: Settings
): SimulationImpact {
  const currentCapital = settings.currentCapital || settings.accountSize;
  const riskManagement = settings.advanced?.riskManagement;

  // Create a temporary trade for evaluation
  const tempTrade: Trade = {
    id: 'simulation',
    asset: simulatedTrade.asset || 'EURUSD',
    positionType: simulatedTrade.positionType || 'long',
    entryPrice: simulatedTrade.entryPrice || 0,
    exitPrice: null,
    positionSize: simulatedTrade.positionSize || 0,
    leverage: simulatedTrade.leverage || 1,
    stopLoss: simulatedTrade.stopLoss || null,
    takeProfit: simulatedTrade.takeProfit || null,
    entryDate: simulatedTrade.entryDate || new Date().toISOString(),
    exitDate: null,
    notes: '',
    screenshots: [],
    videos: [],
    tags: [],
    journal: {
      preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
      duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
      postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
    },
    mode: 'simulation', // Default mode for simulation trades
    status: 'open',
    pnl: null,
    riskReward: simulatedTrade.stopLoss && simulatedTrade.takeProfit && simulatedTrade.entryPrice
      ? Math.abs((simulatedTrade.takeProfit - simulatedTrade.entryPrice) / (simulatedTrade.entryPrice - simulatedTrade.stopLoss))
      : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Calculate current metrics
  const currentTodayRisk = calculateTodayRisk(trades, settings);
  const currentDrawdown = getRiskMetrics(trades, settings);

  // Calculate risk of simulated trade
  let simulatedRiskAmount = 0;
  let simulatedRiskPercent = 0;
  if (tempTrade.stopLoss && tempTrade.entryPrice) {
    const priceDiff = Math.abs(tempTrade.entryPrice - tempTrade.stopLoss);
    const leverage = tempTrade.leverage || 1;
    simulatedRiskAmount = priceDiff * tempTrade.positionSize * leverage;
    simulatedRiskPercent = currentCapital > 0 ? (simulatedRiskAmount / currentCapital) * 100 : 0;
  }

  // Calculate after metrics
  const afterTodayRisk = {
    percent: currentTodayRisk.percent + simulatedRiskPercent,
    amount: currentTodayRisk.amount + simulatedRiskAmount,
  };

  // Evaluate rules
  const evaluation = evaluateTradeRules(tempTrade, trades, settings);
  const rulesThatWouldActivate = evaluation.violatedRules.map(v => ({
    ruleName: v.ruleName,
    severity: v.severity,
    message: v.message,
  }));

  // Determine final status
  let finalStatus: 'ok' | 'warning' | 'blocked' = 'ok';
  if (evaluation.status === 'critical-violation') {
    finalStatus = 'blocked';
  } else if (evaluation.status === 'minor-violation') {
    finalStatus = 'warning';
  }

  // Check if would exceed daily risk limit
  if (riskManagement?.maxRiskDaily !== null && riskManagement && afterTodayRisk.percent > riskManagement.maxRiskDaily) {
    finalStatus = 'blocked';
  } else if (riskManagement?.maxRiskDaily !== null && riskManagement && afterTodayRisk.percent > riskManagement.maxRiskDaily * 0.8) {
    if (finalStatus === 'ok') finalStatus = 'warning';
  }

  return {
    impactOnDailyRisk: {
      before: currentTodayRisk.percent,
      after: afterTodayRisk.percent,
      change: simulatedRiskPercent,
    },
    impactOnDrawdown: {
      before: currentDrawdown.currentDrawdownPercent,
      after: currentDrawdown.currentDrawdownPercent, // Drawdown doesn't change until trade closes
      change: 0,
    },
    rulesThatWouldActivate,
    finalStatus,
  };
}

/**
 * Check if a trade calculation would violate rules
 */
export function checkTradeCalculation(
  calculation: {
    positionSize: number;
    riskAmount: number;
    riskPercentage: number;
    entryPrice: number;
    stopLoss: number;
  },
  trades: Trade[],
  settings: Settings
): {
  allowed: boolean;
  violations: Array<{ rule: string; severity: 'critical' | 'minor'; message: string }>;
  suggestedSize?: number;
} {
  const violations: Array<{ rule: string; severity: 'critical' | 'minor'; message: string }> = [];
  
  // Create temporary trade for evaluation
  const tempTrade: Partial<Trade> = {
    entryPrice: calculation.entryPrice,
    stopLoss: calculation.stopLoss,
    positionSize: calculation.positionSize,
    entryDate: new Date().toISOString(),
  };

  // Check trading rules
  const ruleViolations = checkTradingRules(trades, settings, tempTrade);
  ruleViolations.forEach(v => {
    violations.push({
      rule: v.rule,
      severity: v.severity === 'error' ? 'critical' : 'minor',
      message: v.message,
    });
  });

  // Check risk limits
  const riskManagement = settings.advanced?.riskManagement;
  const currentCapital = settings.currentCapital || settings.accountSize;

  // Check max risk per trade
  if (riskManagement?.maxRiskPerTrade !== null && riskManagement?.maxRiskPerTrade !== undefined) {
    const maxRisk = riskManagement.maxRiskPerTrade;
    if (calculation.riskPercentage > maxRisk) {
      violations.push({
        rule: 'maxRiskPerTrade',
        severity: 'critical',
        message: `Riesgo por trade (${calculation.riskPercentage.toFixed(2)}%) excede el límite (${maxRisk}%)`,
      });
    }
  }

  // Check daily risk
  const todayRisk = calculateTodayRisk(trades, settings);
  const afterRisk = todayRisk.percent + calculation.riskPercentage;
  if (riskManagement?.maxRiskDaily !== null && riskManagement && afterRisk > riskManagement.maxRiskDaily) {
    violations.push({
      rule: 'maxRiskDaily',
      severity: 'critical',
      message: `Riesgo diario total (${afterRisk.toFixed(2)}%) excedería el límite (${riskManagement.maxRiskDaily}%)`,
    });
  }

  // Calculate suggested size if there are violations
  let suggestedSize: number | undefined;
  if (violations.some(v => v.severity === 'critical')) {
    // Suggest size that respects max risk per trade
    if (riskManagement?.maxRiskPerTrade !== null && riskManagement?.maxRiskPerTrade !== undefined) {
      const maxRisk = riskManagement.maxRiskPerTrade;
      if (calculation.riskPercentage > maxRisk) {
        const maxRiskAmount = (currentCapital * maxRisk) / 100;
        const priceDiff = Math.abs(calculation.entryPrice - calculation.stopLoss);
        if (priceDiff > 0) {
          suggestedSize = maxRiskAmount / priceDiff;
        }
      }
    }
  }

  const allowed = violations.filter(v => v.severity === 'critical').length === 0;

  return {
    allowed,
    violations,
    suggestedSize,
  };
}

