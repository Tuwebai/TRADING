/**
 * Calcula el estado de trading actual
 * Determina si el usuario está en condiciones de operar
 */

import type { Trade, Settings } from '@/types/Trading';
import { getRiskMetrics, getRiskWarnings, getRiskLevel } from './risk';
import { generateEquityCurve, calculateMaxDrawdown } from './calculations';
import { calculateHistoricalAvgTradesPerDay } from './proactiveInsights';

export type TradingStatus = 'operable' | 'risk-elevated' | 'pause-recommended';

export interface TradingStatusInfo {
  status: TradingStatus;
  mainReason: string;
  suggestedAction: string;
  details: {
    riskPerTrade: number;
    maxRiskAllowed: number;
    currentDrawdown: number;
    dailyLoss: number;
    dailyLossLimit: number;
    overtrading: boolean;
    rulesViolated: string[];
  };
}

/**
 * Detecta violaciones de reglas activas
 */
function detectRuleViolations(trades: Trade[], settings: Settings): string[] {
  const violations: string[] = [];
  const rules = settings.advanced?.tradingRules || {};

  // Trades hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    tradeDate.setHours(0, 0, 0, 0);
    return tradeDate.getTime() === today.getTime();
  });

  // Máximo de trades diarios
  if (rules.maxTradesPerDay && todayTrades.length >= rules.maxTradesPerDay) {
    violations.push(`Máx ${rules.maxTradesPerDay} trades diarios`);
  }

  // Máximo de trades semanales
  if (rules.maxTradesPerWeek) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Domingo
    const weekTrades = trades.filter(t => {
      const tradeDate = new Date(t.entryDate);
      return tradeDate >= weekStart;
    });
    if (weekTrades.length >= rules.maxTradesPerWeek) {
      violations.push(`Máx ${rules.maxTradesPerWeek} trades semanales`);
    }
  }

  // Horarios permitidos
  if (rules.allowedTradingHours?.enabled) {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = rules.allowedTradingHours.startHour;
    const endHour = rules.allowedTradingHours.endHour;
    
    if (currentHour < startHour || currentHour >= endHour) {
      violations.push(`Horario permitido: ${startHour}:00 - ${endHour}:00`);
    }
  }

  return violations;
}

/**
 * Detecta overtrading
 */
function detectOvertrading(trades: Trade[]): boolean {
  const historicalAvg = calculateHistoricalAvgTradesPerDay(trades);
  if (historicalAvg === 0) return false;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    return tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear;
  });

  const monthDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthAvg = monthTrades.length / monthDays;

  return monthAvg > historicalAvg * 1.5;
}

/**
 * Calcula el estado de trading
 */
export function calculateTradingStatus(
  trades: Trade[],
  settings: Settings
): TradingStatusInfo {
  const riskMetrics = getRiskMetrics(trades, settings);
  const riskWarnings = getRiskWarnings(riskMetrics, settings);
  const riskLevel = getRiskLevel(riskMetrics, riskWarnings);

  // Calcular drawdown
  const initialCapital = settings.currentCapital || settings.initialCapital || settings.accountSize;
  const equityCurve = generateEquityCurve(trades, initialCapital);
  const drawdown = calculateMaxDrawdown(equityCurve);
  const lastPoint = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1] : null;
  const currentDrawdownPercent = lastPoint && lastPoint.peak > 0
    ? ((lastPoint.peak - lastPoint.equity) / lastPoint.peak) * 100
    : 0;

  const dailyLossLimit = settings.advanced?.tradingRules?.dailyLossLimit || 5;
  const overtrading = detectOvertrading(trades);
  const ruleViolations = detectRuleViolations(trades, settings);

  // Determinar estado
  let status: TradingStatus = 'operable';
  let mainReason = 'Condiciones normales de trading';
  let suggestedAction = 'Puedes operar siguiendo tus reglas establecidas';

  // PAUSA RECOMENDADA - Condiciones críticas
  if (
    riskMetrics.dailyLossPercent > dailyLossLimit ||
    currentDrawdownPercent > 15 ||
    riskMetrics.averageRiskPerTrade > riskMetrics.maxRiskAllowed * 1.5 ||
    riskMetrics.currentExposurePercent > 60
  ) {
    status = 'pause-recommended';
    
    if (riskMetrics.dailyLossPercent > dailyLossLimit) {
      mainReason = `Límite de pérdida diaria excedido (${riskMetrics.dailyLossPercent.toFixed(2)}% > ${dailyLossLimit}%)`;
      suggestedAction = 'Cerrar todas las posiciones abiertas. Bloquear trading por el resto del día.';
    } else if (currentDrawdownPercent > 15) {
      mainReason = `Drawdown crítico: ${currentDrawdownPercent.toFixed(2)}%`;
      suggestedAction = 'Reducir tamaño de posición a la mitad. Revisar todas las posiciones abiertas.';
    } else if (riskMetrics.averageRiskPerTrade > riskMetrics.maxRiskAllowed * 1.5) {
      mainReason = `Riesgo por operación excedido (${riskMetrics.averageRiskPerTrade.toFixed(2)}% > ${riskMetrics.maxRiskAllowed}%)`;
      suggestedAction = 'Reducir tamaño de posición en futuras operaciones. Cerrar posiciones que excedan el riesgo permitido.';
    } else {
      mainReason = `Exposición demasiado alta: ${riskMetrics.currentExposurePercent.toFixed(2)}%`;
      suggestedAction = 'Cerrar algunas posiciones para reducir exposición. No abrir nuevas posiciones.';
    }
  }
  // RIESGO ELEVADO - Condiciones de advertencia
  else if (
    riskLevel === 'warning' ||
    currentDrawdownPercent > 10 ||
    riskMetrics.averageRiskPerTrade > riskMetrics.maxRiskAllowed ||
    riskMetrics.currentExposurePercent > 50 ||
    overtrading ||
    ruleViolations.length > 0
  ) {
    status = 'risk-elevated';
    
    if (ruleViolations.length > 0) {
      mainReason = `Reglas violadas: ${ruleViolations[0]}`;
      suggestedAction = 'Revisar y cumplir con las reglas establecidas antes de operar.';
    } else if (overtrading) {
      mainReason = 'Frecuencia de trading elevada detectada';
      suggestedAction = 'Reducir frecuencia de operaciones. Priorizar calidad sobre cantidad.';
    } else if (riskMetrics.averageRiskPerTrade > riskMetrics.maxRiskAllowed) {
      mainReason = `Riesgo por operación elevado (${riskMetrics.averageRiskPerTrade.toFixed(2)}% > ${riskMetrics.maxRiskAllowed}%)`;
      suggestedAction = 'Reducir tamaño de posición en próximas operaciones.';
    } else if (currentDrawdownPercent > 10) {
      mainReason = `Drawdown moderado: ${currentDrawdownPercent.toFixed(2)}%`;
      suggestedAction = 'Ser más conservador con el tamaño de posición. Revisar estrategia.';
    } else {
      mainReason = 'Riesgo elevado detectado en múltiples métricas';
      suggestedAction = 'Revisar posiciones abiertas y reglas de riesgo antes de operar.';
    }
  }
  // OPERABLE - Condiciones normales
  else {
    status = 'operable';
    mainReason = 'Condiciones normales de trading';
    suggestedAction = 'Puedes operar siguiendo tus reglas establecidas';
  }

  return {
    status,
    mainReason,
    suggestedAction,
    details: {
      riskPerTrade: riskMetrics.averageRiskPerTrade,
      maxRiskAllowed: riskMetrics.maxRiskAllowed,
      currentDrawdown: currentDrawdownPercent,
      dailyLoss: riskMetrics.dailyLossPercent,
      dailyLossLimit,
      overtrading,
      rulesViolated: ruleViolations,
    },
  };
}

