/**
 * Trade Rule Evaluation System
 * Evaluates trades against active rules and stores results
 */

import type { Trade, Settings, EvaluatedRule, ViolatedRule } from '@/types/Trading';
import { checkTradingRules } from './tradingRules';
import { getRiskMetrics } from './risk';

export type RuleStatus = 'clean' | 'minor-violation' | 'critical-violation';

/**
 * Evaluate a single trade against all active rules
 */
export function evaluateTradeRules(
  trade: Trade,
  allTrades: Trade[],
  settings: Settings
): {
  evaluatedRules: EvaluatedRule[];
  violatedRules: ViolatedRule[];
  status: RuleStatus;
} {
  const evaluatedRules: EvaluatedRule[] = [];
  const violatedRules: ViolatedRule[] = [];
  const rules = settings.advanced?.tradingRules;

  if (!rules) {
    return { evaluatedRules: [], violatedRules: [], status: 'clean' };
  }

  const tradeDate = new Date(trade.entryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Rule 1: Max trades per day
  if (rules.maxTradesPerDay !== null) {
    const todayTrades = allTrades.filter(t => {
      const tDate = new Date(t.entryDate);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === today.getTime() && t.id !== trade.id;
    });
    const respected = todayTrades.length < rules.maxTradesPerDay;
    
    evaluatedRules.push({
      id: 'max-trades-per-day',
      ruleName: 'Máximo de Trades Diarios',
      ruleKey: 'maxTradesPerDay',
      respected,
      expectedValue: rules.maxTradesPerDay,
      actualValue: todayTrades.length + 1,
      severity: 'critical',
    });

    if (!respected) {
      violatedRules.push({
        id: 'max-trades-per-day',
        ruleName: 'Máximo de Trades Diarios',
        ruleKey: 'maxTradesPerDay',
        expectedValue: rules.maxTradesPerDay,
        actualValue: todayTrades.length + 1,
        severity: 'critical',
        message: `Límite de ${rules.maxTradesPerDay} trades diarios excedido`,
      });
    }
  }

  // Rule 2: Max trades per week
  if (rules.maxTradesPerWeek !== null) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekTrades = allTrades.filter(t => {
      const tDate = new Date(t.entryDate);
      return tDate >= weekStart && t.id !== trade.id;
    });
    const respected = weekTrades.length < rules.maxTradesPerWeek;
    
    evaluatedRules.push({
      id: 'max-trades-per-week',
      ruleName: 'Máximo de Trades Semanales',
      ruleKey: 'maxTradesPerWeek',
      respected,
      expectedValue: rules.maxTradesPerWeek,
      actualValue: weekTrades.length + 1,
      severity: 'critical',
    });

    if (!respected) {
      violatedRules.push({
        id: 'max-trades-per-week',
        ruleName: 'Máximo de Trades Semanales',
        ruleKey: 'maxTradesPerWeek',
        expectedValue: rules.maxTradesPerWeek,
        actualValue: weekTrades.length + 1,
        severity: 'critical',
        message: `Límite de ${rules.maxTradesPerWeek} trades semanales excedido`,
      });
    }
  }

  // Rule 3: Trading hours
  if (rules.allowedTradingHours.enabled) {
    const tradeHour = tradeDate.getHours();
    const { startHour, endHour } = rules.allowedTradingHours;
    const respected = tradeHour >= startHour && tradeHour < endHour;
    
    evaluatedRules.push({
      id: 'trading-hours',
      ruleName: 'Horarios Permitidos',
      ruleKey: 'allowedTradingHours',
      respected,
      expectedValue: `${startHour}:00 - ${endHour}:00`,
      actualValue: `${tradeHour}:00`,
      severity: 'critical',
    });

    if (!respected) {
      violatedRules.push({
        id: 'trading-hours',
        ruleName: 'Horarios Permitidos',
        ruleKey: 'allowedTradingHours',
        expectedValue: `${startHour}:00 - ${endHour}:00`,
        actualValue: `${tradeHour}:00`,
        severity: 'critical',
        message: `Trade fuera del horario permitido (${startHour}:00 - ${endHour}:00)`,
      });
    }
  }

  // Rule 4: Max lot size
  if (rules.maxLotSize !== null) {
    const respected = trade.positionSize <= rules.maxLotSize;
    
    evaluatedRules.push({
      id: 'max-lot-size',
      ruleName: 'Tamaño Máximo de Lote',
      ruleKey: 'maxLotSize',
      respected,
      expectedValue: rules.maxLotSize,
      actualValue: trade.positionSize,
      severity: 'critical',
    });

    if (!respected) {
      violatedRules.push({
        id: 'max-lot-size',
        ruleName: 'Tamaño Máximo de Lote',
        ruleKey: 'maxLotSize',
        expectedValue: rules.maxLotSize,
        actualValue: trade.positionSize,
        severity: 'critical',
        message: `Tamaño de lote (${trade.positionSize}) excede el máximo permitido (${rules.maxLotSize})`,
      });
    }
  }

  // Rule 5: Risk per trade
  const riskMetrics = getRiskMetrics(allTrades, settings);
  const currentCapital = settings.currentCapital || settings.accountSize;
  
  if (trade.stopLoss) {
    const stopLoss = trade.stopLoss;
    const priceDiff = Math.abs(trade.entryPrice - stopLoss);
    const leverage = trade.leverage || 1;
    const riskAmount = priceDiff * trade.positionSize * leverage;
    const riskPercent = currentCapital > 0 ? (riskAmount / currentCapital) * 100 : 0;
    const maxRisk = settings.riskPerTrade;
    const respected = riskPercent <= maxRisk;
    
    evaluatedRules.push({
      id: 'risk-per-trade',
      ruleName: 'Riesgo por Operación',
      ruleKey: 'riskPerTrade',
      respected,
      expectedValue: `≤ ${maxRisk}%`,
      actualValue: `${riskPercent.toFixed(2)}%`,
      severity: riskPercent > maxRisk * 1.5 ? 'critical' : 'minor',
    });

    if (!respected) {
      violatedRules.push({
        id: 'risk-per-trade',
        ruleName: 'Riesgo por Operación',
        ruleKey: 'riskPerTrade',
        expectedValue: `≤ ${maxRisk}%`,
        actualValue: `${riskPercent.toFixed(2)}%`,
        severity: riskPercent > maxRisk * 1.5 ? 'critical' : 'minor',
        message: `Riesgo (${riskPercent.toFixed(2)}%) excede el límite permitido (${maxRisk}%)`,
      });
    }
  }

  // Rule 6: Minimum R/R
  if (trade.riskReward !== null && trade.riskReward < 1) {
    evaluatedRules.push({
      id: 'min-risk-reward',
      ruleName: 'Risk/Reward Mínimo',
      ruleKey: 'minRiskReward',
      respected: false,
      expectedValue: '≥ 1.0',
      actualValue: trade.riskReward.toFixed(2),
      severity: 'minor',
    });

    violatedRules.push({
      id: 'min-risk-reward',
      ruleName: 'Risk/Reward Mínimo',
      ruleKey: 'minRiskReward',
      expectedValue: '≥ 1.0',
      actualValue: trade.riskReward.toFixed(2),
      severity: 'minor',
      message: `R/R (${trade.riskReward.toFixed(2)}) es menor al mínimo recomendado (1.0)`,
    });
  } else if (trade.riskReward !== null) {
    evaluatedRules.push({
      id: 'min-risk-reward',
      ruleName: 'Risk/Reward Mínimo',
      ruleKey: 'minRiskReward',
      respected: true,
      expectedValue: '≥ 1.0',
      actualValue: trade.riskReward.toFixed(2),
      severity: 'minor',
    });
  }

  // Determine overall status
  const hasCritical = violatedRules.some(v => v.severity === 'critical');
  const hasMinor = violatedRules.some(v => v.severity === 'minor');
  
  let status: RuleStatus = 'clean';
  if (hasCritical) {
    status = 'critical-violation';
  } else if (hasMinor) {
    status = 'minor-violation';
  }

  return { evaluatedRules, violatedRules, status };
}

/**
 * Classify trade based on rules and performance
 */
export function classifyTrade(
  trade: Trade,
  violatedRules: ViolatedRule[]
): 'modelo' | 'neutral' | 'error' {
  // Error: Has critical violations or negative R/R
  if (violatedRules.some(v => v.severity === 'critical') || 
      (trade.riskReward !== null && trade.riskReward < 0.5)) {
    return 'error';
  }

  // Modelo: High R/R, no violations, positive PnL
  if (trade.status === 'closed' && 
      trade.pnl !== null && 
      trade.pnl > 0 &&
      trade.riskReward !== null && 
      trade.riskReward >= 2 &&
      violatedRules.length === 0) {
    return 'modelo';
  }

  return 'neutral';
}

/**
 * Get rule status for a trade (helper function)
 */
export function getTradeRuleStatus(trade: Trade): RuleStatus {
  if (!trade.violatedRules || trade.violatedRules.length === 0) {
    return 'clean';
  }
  
  const hasCritical = trade.violatedRules.some(v => v.severity === 'critical');
  return hasCritical ? 'critical-violation' : 'minor-violation';
}

/**
 * Get violation severity (helper function)
 */
export function getViolationSeverity(trade: Trade): 'critical' | 'minor' | 'none' {
  if (!trade.violatedRules || trade.violatedRules.length === 0) {
    return 'none';
  }
  
  const hasCritical = trade.violatedRules.some(v => v.severity === 'critical');
  return hasCritical ? 'critical' : 'minor';
}

/**
 * Evaluate and update trade with rule results
 */
export function evaluateAndUpdateTrade(
  trade: Trade,
  allTrades: Trade[],
  settings: Settings
): Trade {
  const evaluation = evaluateTradeRules(trade, allTrades, settings);
  const classification = classifyTrade(trade, evaluation.violatedRules);

  return {
    ...trade,
    evaluatedRules: evaluation.evaluatedRules,
    violatedRules: evaluation.violatedRules,
    tradeClassification: classification,
  };
}

