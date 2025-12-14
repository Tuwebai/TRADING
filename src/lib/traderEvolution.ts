/**
 * Sistema de Evolución del Trader
 * Calcula nivel, fase y cuello de botella basado en métricas reales
 */

import type { Trade, Settings } from '@/types/Trading';
import { calculateAnalytics, generateEquityCurve, calculateMaxDrawdown } from './calculations';
import { getRiskMetrics } from './risk';
import { getPriorityInsights } from './proactiveInsights';
import { getTradesByMonth } from './calendarStats';

export type TraderLevel = 1 | 2 | 3 | 4;
export type TraderPhase = 'exploration' | 'consolidation' | 'consistency' | 'optimization';

export interface TraderEvolution {
  level: TraderLevel;
  levelName: string;
  phase: TraderPhase;
  phaseName: string;
  bottleneck: string | null;
  progress: {
    drawdownControl: number; // 0-100
    greenMonths: number; // 0-100
    operationalConsistency: number; // 0-100
    riskRespect: number; // 0-100
  };
  metrics: {
    totalMonths: number;
    greenMonths: number;
    currentDrawdownPercent: number;
    maxDrawdownPercent: number;
    winRate: number;
    avgR: number;
    consistencyScore: number;
    riskCompliance: number;
  };
}

/**
 * Calcula meses verdes (meses con PnL positivo)
 */
function calculateGreenMonths(trades: Trade[]): { total: number; green: number } {
  const monthlyPnL = new Map<string, number>();

  trades
    .filter(t => t.status === 'closed' && t.exitDate && t.pnl !== null)
    .forEach(trade => {
      const exitDate = new Date(trade.exitDate!);
      const monthKey = `${exitDate.getFullYear()}-${exitDate.getMonth()}`;
      monthlyPnL.set(monthKey, (monthlyPnL.get(monthKey) || 0) + (trade.pnl || 0));
    });

  const totalMonths = monthlyPnL.size;
  const greenMonths = Array.from(monthlyPnL.values()).filter(pnl => pnl > 0).length;

  return { total: totalMonths, green: greenMonths };
}

/**
 * Calcula score de consistencia operativa
 */
function calculateConsistencyScore(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  if (closedTrades.length < 10) return 0;

  const analytics = calculateAnalytics(trades);
  
  // Variabilidad de resultados
  const pnlValues = closedTrades.map(t => t.pnl || 0);
  const mean = pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length;
  const variance = pnlValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pnlValues.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;
  
  // Score basado en:
  // - Baja variabilidad (0-40 puntos)
  // - Win rate decente (0-30 puntos)
  // - R promedio positivo (0-30 puntos)
  const variabilityScore = Math.max(0, 40 - (coefficientOfVariation * 20));
  const winRateScore = Math.min(30, (analytics.winRate / 100) * 30);
  const rScore = Math.min(30, (analytics.averageR / 3) * 30);

  return Math.min(100, variabilityScore + winRateScore + rScore);
}

/**
 * Calcula score de respeto a reglas de riesgo
 */
function calculateRiskCompliance(trades: Trade[], settings: Settings): number {
  const riskMetrics = getRiskMetrics(trades, settings);
  
  // Score basado en:
  // - Riesgo por trade dentro del límite (0-40 puntos)
  // - Exposición controlada (0-30 puntos)
  // - Drawdown controlado (0-30 puntos)
  const riskPerTradeScore = riskMetrics.averageRiskPerTrade <= riskMetrics.maxRiskAllowed
    ? 40
    : Math.max(0, 40 - ((riskMetrics.averageRiskPerTrade - riskMetrics.maxRiskAllowed) * 10));
  
  const exposureScore = riskMetrics.currentExposurePercent <= 50
    ? 30
    : Math.max(0, 30 - ((riskMetrics.currentExposurePercent - 50) * 0.6));
  
  const drawdownScore = riskMetrics.currentDrawdownPercent <= 10
    ? 30
    : Math.max(0, 30 - ((riskMetrics.currentDrawdownPercent - 10) * 2));

  return Math.min(100, riskPerTradeScore + exposureScore + drawdownScore);
}

/**
 * Calcula el nivel del trader
 */
function calculateTraderLevel(progress: TraderEvolution['progress']): TraderLevel {
  const avgScore = (
    progress.drawdownControl +
    progress.greenMonths +
    progress.operationalConsistency +
    progress.riskRespect
  ) / 4;

  if (avgScore >= 75) return 4;
  if (avgScore >= 55) return 3;
  if (avgScore >= 35) return 2;
  return 1;
}

/**
 * Determina la fase del trader
 */
function determineTraderPhase(
  level: TraderLevel,
  metrics: TraderEvolution['metrics']
): TraderPhase {
  if (level === 1) return 'exploration';
  if (level === 2) return 'consolidation';
  if (level === 3) return 'consistency';
  return 'optimization';
}

/**
 * Obtiene el cuello de botella actual
 */
function getBottleneck(
  progress: TraderEvolution['progress'],
  insights: ReturnType<typeof getPriorityInsights>
): string | null {
  // Si hay insight crítico, ese es el cuello de botella
  const criticalInsight = insights.find(i => i.severity === 'critical');
  if (criticalInsight) {
    return criticalInsight.title;
  }

  // Si no, identificar el área con menor score
  const scores = [
    { name: 'Control de Drawdown', score: progress.drawdownControl },
    { name: 'Meses Verdes', score: progress.greenMonths },
    { name: 'Consistencia Operativa', score: progress.operationalConsistency },
    { name: 'Respeto de Reglas de Riesgo', score: progress.riskRespect },
  ];

  const lowest = scores.reduce((min, current) => 
    current.score < min.score ? current : min
  );

  if (lowest.score < 50) {
    return lowest.name;
  }

  return null;
}

/**
 * Calcula la evolución completa del trader
 */
export function calculateTraderEvolution(
  trades: Trade[],
  settings: Settings
): TraderEvolution {
  const initialCapital = settings.currentCapital || settings.initialCapital || settings.accountSize;
  const analytics = calculateAnalytics(trades);
  
  // Calcular métricas base
  const equityCurve = generateEquityCurve(trades, initialCapital);
  const drawdown = calculateMaxDrawdown(equityCurve);
  const lastPoint = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1] : null;
  const currentDrawdownPercent = lastPoint && lastPoint.peak > 0
    ? ((lastPoint.peak - lastPoint.equity) / lastPoint.peak) * 100
    : 0;

  const greenMonthsData = calculateGreenMonths(trades);
  const consistencyScore = calculateConsistencyScore(trades);
  const riskCompliance = calculateRiskCompliance(trades, settings);

  // Calcular progreso (0-100 para cada métrica)
  const progress = {
    drawdownControl: Math.max(0, 100 - (currentDrawdownPercent * 5)), // 0% DD = 100, 20% DD = 0
    greenMonths: greenMonthsData.total > 0
      ? (greenMonthsData.green / greenMonthsData.total) * 100
      : 0,
    operationalConsistency: consistencyScore,
    riskRespect: riskCompliance,
  };

  // Calcular nivel
  const level = calculateTraderLevel(progress);
  
  // Determinar fase
  const phase = determineTraderPhase(level, {
    totalMonths: greenMonthsData.total,
    greenMonths: greenMonthsData.green,
    currentDrawdownPercent,
    maxDrawdownPercent: drawdown.maxDrawdownPercent,
    winRate: analytics.winRate,
    avgR: analytics.averageR,
    consistencyScore,
    riskCompliance,
  });

  // Obtener cuello de botella
  const insights = getPriorityInsights(trades, settings);
  const bottleneck = getBottleneck(progress, insights);

  // Nombres
  const levelNames: Record<TraderLevel, string> = {
    1: 'Explorador',
    2: 'Trader en Consolidación',
    3: 'Trader Consistente',
    4: 'Trader en Optimización',
  };

  const phaseNames: Record<TraderPhase, string> = {
    exploration: 'Exploración',
    consolidation: 'Consolidación',
    consistency: 'Consistencia',
    optimization: 'Optimización',
  };

  return {
    level,
    levelName: levelNames[level],
    phase,
    phaseName: phaseNames[phase],
    bottleneck,
    progress,
    metrics: {
      totalMonths: greenMonthsData.total,
      greenMonths: greenMonthsData.green,
      currentDrawdownPercent,
      maxDrawdownPercent: drawdown.maxDrawdownPercent,
      winRate: analytics.winRate,
      avgR: analytics.averageR,
      consistencyScore,
      riskCompliance,
    },
  };
}

