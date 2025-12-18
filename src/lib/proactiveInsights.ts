/**
 * Sistema de Insights Proactivos
 * Genera insights jerárquicos, accionables y basados en datos reales
 */

import type { Trade, Settings } from '@/types/Trading';
import { calculateAnalytics, generateEquityCurve, calculateMaxDrawdown } from './calculations';
import { getRiskMetrics } from './risk';
import { getTradesByMonth } from './calendarStats';
import { goalInsightsStorage } from './storage';
import { goalInsightToProactiveInsight } from './goalInsights';

export type InsightSeverity = 'critical' | 'important' | 'positive';

export interface ProactiveInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  whatHappened: string; // Dato objetivo, numérico, verificable
  whyHappened: string; // Causa detectada a partir de correlaciones simples
  whatToDoNow: string; // Acción concreta, directa, ejecutable
  priority: number; // 0-100, mayor = más prioritario
  data?: Record<string, any>; // Datos adicionales para contexto
}

/**
 * Calcula el promedio histórico de trades por día
 */
export function calculateHistoricalAvgTradesPerDay(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate);
  if (closedTrades.length === 0) return 0;

  const dates = closedTrades.map(t => new Date(t.exitDate!));
  const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const lastDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  return closedTrades.length / daysDiff;
}

/**
 * Detecta si hay overtrading después de pérdidas
 */
function detectOvertradingAfterLosses(trades: Trade[]): {
  detected: boolean;
  currentAvg: number;
  historicalAvg: number;
  percentageAfterLoss: number;
} {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.pnl !== null);
  if (closedTrades.length < 5) {
    return { detected: false, currentAvg: 0, historicalAvg: 0, percentageAfterLoss: 0 };
  }

  // Ordenar por fecha de salida
  const sortedTrades = [...closedTrades].sort((a, b) => 
    new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime()
  );

  // Calcular promedio histórico
  const historicalAvg = calculateHistoricalAvgTradesPerDay(trades);

  // Calcular promedio actual (últimos 7 días)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentTrades = sortedTrades.filter(t => new Date(t.exitDate!) >= sevenDaysAgo);
  const recentDays = Math.max(1, Math.ceil((now.getTime() - sevenDaysAgo.getTime()) / (1000 * 60 * 60 * 24)));
  const currentAvg = recentTrades.length / recentDays;

  // Detectar trades después de pérdidas
  let tradesAfterLoss = 0;
  let totalLosses = 0;

  for (let i = 1; i < sortedTrades.length; i++) {
    const prevTrade = sortedTrades[i - 1];
    const currentTrade = sortedTrades[i];
    
    if ((prevTrade.pnl || 0) < 0) {
      totalLosses++;
      // Si el siguiente trade ocurrió dentro de 4 horas, considerarlo "después de pérdida"
      const prevExit = new Date(prevTrade.exitDate!);
      const currentEntry = new Date(currentTrade.entryDate);
      const hoursDiff = (currentEntry.getTime() - prevExit.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff <= 4) {
        tradesAfterLoss++;
      }
    }
  }

  const percentageAfterLoss = totalLosses > 0 ? (tradesAfterLoss / totalLosses) * 100 : 0;

  return {
    detected: currentAvg > historicalAvg * 1.5 && percentageAfterLoss > 50,
    currentAvg,
    historicalAvg,
    percentageAfterLoss,
  };
}

/**
 * Detecta violación de reglas de riesgo
 */
function detectRiskRuleViolations(trades: Trade[], settings: Settings): {
  detected: boolean;
  avgRiskPerTrade: number;
  maxRiskAllowed: number;
  exposurePercent: number;
} {
  const riskMetrics = getRiskMetrics(trades, settings);
  
  return {
    detected: riskMetrics.averageRiskPerTrade > riskMetrics.maxRiskAllowed || 
              riskMetrics.currentExposurePercent > 50,
    avgRiskPerTrade: riskMetrics.averageRiskPerTrade,
    maxRiskAllowed: riskMetrics.maxRiskAllowed,
    exposurePercent: riskMetrics.currentExposurePercent,
  };
}

/**
 * Detecta drawdown crítico
 */
function detectCriticalDrawdown(trades: Trade[], initialCapital: number): {
  detected: boolean;
  currentDrawdown: number;
  currentDrawdownPercent: number;
  maxDrawdownPercent: number;
} {
  const equityCurve = generateEquityCurve(trades, initialCapital);
  const drawdown = calculateMaxDrawdown(equityCurve);
  
  if (equityCurve.length === 0) {
    return { detected: false, currentDrawdown: 0, currentDrawdownPercent: 0, maxDrawdownPercent: 0 };
  }

  const lastPoint = equityCurve[equityCurve.length - 1];
  const currentDrawdown = lastPoint.peak - lastPoint.equity;
  const currentDrawdownPercent = lastPoint.peak > 0 ? (currentDrawdown / lastPoint.peak) * 100 : 0;

  return {
    detected: currentDrawdownPercent > 15 || drawdown.maxDrawdownPercent > 20,
    currentDrawdown,
    currentDrawdownPercent,
    maxDrawdownPercent: drawdown.maxDrawdownPercent,
  };
}

/**
 * Detecta pérdida diaria excesiva
 */
function detectExcessiveDailyLoss(trades: Trade[], settings: Settings): {
  detected: boolean;
  dailyLossPercent: number;
  dailyLossLimit: number;
} {
  const riskMetrics = getRiskMetrics(trades, settings);
  const dailyLossLimit = settings.advanced?.tradingRules?.dailyLossLimit || 5;

  return {
    detected: riskMetrics.dailyLossPercent > dailyLossLimit,
    dailyLossPercent: riskMetrics.dailyLossPercent,
    dailyLossLimit,
  };
}

/**
 * Detecta inconsistencia operativa
 */
function detectOperationalInconsistency(trades: Trade[]): {
  detected: boolean;
  winRate: number;
  avgR: number;
  consistencyScore: number;
} {
  const analytics = calculateAnalytics(trades);
  
  // Calcular consistencia basada en variabilidad de resultados
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  if (closedTrades.length < 10) {
    return { detected: false, winRate: 0, avgR: 0, consistencyScore: 0 };
  }

  const pnlValues = closedTrades.map(t => t.pnl || 0);
  const mean = pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length;
  const variance = pnlValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pnlValues.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;
  
  // Score de consistencia (0-100, mayor = más consistente)
  const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 50));

  return {
    detected: consistencyScore < 50 && analytics.winRate < 45,
    winRate: analytics.winRate,
    avgR: analytics.averageR,
    consistencyScore,
  };
}

/**
 * Detecta mejoras positivas
 */
function detectPositiveImprovements(trades: Trade[]): {
  detected: boolean;
  improvement: string;
  metric: string;
  value: number;
} {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthTrades = getTradesByMonth(trades, currentYear, currentMonth);
  const prevMonthTrades = getTradesByMonth(trades, prevYear, prevMonth);

  if (currentMonthTrades.length < 5 || prevMonthTrades.length < 5) {
    return { detected: false, improvement: '', metric: '', value: 0 };
  }

  const currentAnalytics = calculateAnalytics(currentMonthTrades);
  const prevAnalytics = calculateAnalytics(prevMonthTrades);

  // Mejora en win rate
  if (currentAnalytics.winRate > prevAnalytics.winRate + 5) {
    return {
      detected: true,
      improvement: 'Win Rate',
      metric: `${currentAnalytics.winRate.toFixed(1)}%`,
      value: currentAnalytics.winRate - prevAnalytics.winRate,
    };
  }

  // Mejora en R promedio
  if (currentAnalytics.averageR > prevAnalytics.averageR + 0.5) {
    return {
      detected: true,
      improvement: 'R Promedio',
      metric: `${currentAnalytics.averageR.toFixed(2)}R`,
      value: currentAnalytics.averageR - prevAnalytics.averageR,
    };
  }

  return { detected: false, improvement: '', metric: '', value: 0 };
}

/**
 * Genera todos los insights proactivos
 */
export function generateProactiveInsights(trades: Trade[], settings: Settings): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const initialCapital = settings.currentCapital || settings.initialCapital || settings.accountSize;

  // 🔴 INSIGHTS CRÍTICOS

  // 1. Drawdown crítico
  const drawdownCheck = detectCriticalDrawdown(trades, initialCapital);
  if (drawdownCheck.detected) {
    insights.push({
      id: 'critical-drawdown',
      severity: 'critical',
      title: 'Drawdown Crítico Detectado',
      whatHappened: `Drawdown actual: ${drawdownCheck.currentDrawdownPercent.toFixed(2)}% (máximo histórico: ${drawdownCheck.maxDrawdownPercent.toFixed(2)}%)`,
      whyHappened: 'La curva de equity muestra una caída significativa desde el pico. Esto puede indicar una serie de pérdidas consecutivas o posiciones de alto riesgo.',
      whatToDoNow: '👉 Acción inmediata: Reducir tamaño de posición a la mitad. Revisar todas las posiciones abiertas. Considerar pausar trading hasta recuperar al menos 5% del drawdown.',
      priority: 100,
      data: drawdownCheck,
    });
  }

  // 2. Pérdida diaria excesiva
  const dailyLossCheck = detectExcessiveDailyLoss(trades, settings);
  if (dailyLossCheck.detected) {
    insights.push({
      id: 'excessive-daily-loss',
      severity: 'critical',
      title: 'Límite de Pérdida Diaria Excedido',
      whatHappened: `Pérdida hoy: ${dailyLossCheck.dailyLossPercent.toFixed(2)}% (límite: ${dailyLossCheck.dailyLossLimit}%)`,
      whyHappened: 'Has superado el límite de pérdida diaria configurado en tus reglas de trading. Esto indica riesgo descontrolado.',
      whatToDoNow: '👉 Acción inmediata: Cerrar todas las posiciones abiertas. Bloquear trading por el resto del día. Revisar reglas de riesgo mañana antes de operar.',
      priority: 95,
      data: dailyLossCheck,
    });
  }

  // 3. Violación de reglas de riesgo
  const riskViolationCheck = detectRiskRuleViolations(trades, settings);
  if (riskViolationCheck.detected) {
    insights.push({
      id: 'risk-rule-violation',
      severity: 'critical',
      title: 'Violación de Reglas de Riesgo',
      whatHappened: riskViolationCheck.avgRiskPerTrade > riskViolationCheck.maxRiskAllowed
        ? `Riesgo promedio por trade: ${riskViolationCheck.avgRiskPerTrade.toFixed(2)}% (límite: ${riskViolationCheck.maxRiskAllowed}%)`
        : `Exposición actual: ${riskViolationCheck.exposurePercent.toFixed(2)}% (límite recomendado: 50%)`,
      whyHappened: 'Estás operando con un riesgo por operación o exposición total que excede tus límites configurados. Esto aumenta significativamente la probabilidad de pérdidas grandes.',
      whatToDoNow: '👉 Acción inmediata: Reducir tamaño de posición en futuras operaciones. Cerrar posiciones que excedan el riesgo permitido. Revisar configuración de riesgo en ajustes.',
      priority: 90,
      data: riskViolationCheck,
    });
  }

  // 4. Overtrading después de pérdidas
  const overtradingCheck = detectOvertradingAfterLosses(trades);
  if (overtradingCheck.detected) {
    insights.push({
      id: 'overtrading-after-losses',
      severity: 'critical',
      title: 'Estás Sobreoperando Después de Pérdidas',
      whatHappened: `Promedio actual: ${overtradingCheck.currentAvg.toFixed(1)} trades/día (tu media histórica es ${overtradingCheck.historicalAvg.toFixed(1)})`,
      whyHappened: `El ${overtradingCheck.percentageAfterLoss.toFixed(0)}% de tus operaciones ocurren dentro de 4 horas después de una pérdida. Esto es un patrón de revenge trading.`,
      whatToDoNow: '👉 Acción sugerida: Implementar regla de "bloqueo de 30 minutos post-pérdida". Después de cada pérdida, esperar mínimo 30 minutos antes de la siguiente operación. Revisar journal de emociones.',
      priority: 85,
      data: overtradingCheck,
    });
  }

  // 🟡 INSIGHTS IMPORTANTES

  // 5. Inconsistencia operativa
  const inconsistencyCheck = detectOperationalInconsistency(trades);
  if (inconsistencyCheck.detected) {
    insights.push({
      id: 'operational-inconsistency',
      severity: 'important',
      title: 'Inconsistencia en Resultados',
      whatHappened: `Win rate: ${inconsistencyCheck.winRate.toFixed(1)}%, R promedio: ${inconsistencyCheck.avgR.toFixed(2)}R, Score de consistencia: ${inconsistencyCheck.consistencyScore.toFixed(0)}/100`,
      whyHappened: 'Hay alta variabilidad en tus resultados y un win rate bajo. Esto sugiere falta de disciplina en la ejecución o estrategia no definida claramente.',
      whatToDoNow: '👉 Acción sugerida: Documentar tu estrategia por escrito. Revisar trades ganadores vs perdedores para identificar patrones. Considerar reducir frecuencia hasta encontrar consistencia.',
      priority: 60,
      data: inconsistencyCheck,
    });
  }

  // 6. Overtrading general (sin correlación con pérdidas)
  const historicalAvg = calculateHistoricalAvgTradesPerDay(trades);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthTrades = getTradesByMonth(trades, currentYear, currentMonth);
  const monthDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthAvg = monthTrades.length / monthDays;

  if (monthAvg > historicalAvg * 1.3 && historicalAvg > 0 && !overtradingCheck.detected) {
    insights.push({
      id: 'general-overtrading',
      severity: 'important',
      title: 'Frecuencia de Trading Elevada',
      whatHappened: `Promedio este mes: ${monthAvg.toFixed(1)} trades/día (media histórica: ${historicalAvg.toFixed(1)})`,
      whyHappened: 'Estás operando con mayor frecuencia que tu promedio histórico. Más operaciones no siempre significan mejores resultados.',
      whatToDoNow: '👉 Acción sugerida: Revisar calidad vs cantidad. Priorizar setups de alta probabilidad. Considerar reducir a 2-3 operaciones diarias de máxima calidad.',
      priority: 50,
      data: { monthAvg, historicalAvg },
    });
  }

  // 🟢 INSIGHTS POSITIVOS (solo si no hay críticos)

  if (insights.filter(i => i.severity === 'critical').length === 0) {
    const improvementCheck = detectPositiveImprovements(trades);
    if (improvementCheck.detected) {
      insights.push({
        id: 'positive-improvement',
        severity: 'positive',
        title: `Mejora en ${improvementCheck.improvement}`,
        whatHappened: `${improvementCheck.improvement} actual: ${improvementCheck.metric} (mejora de ${improvementCheck.value.toFixed(2)} vs mes anterior)`,
        whyHappened: 'Has mejorado significativamente este mes comparado con el anterior. Esto indica que estás aplicando mejor tu estrategia o has refinado tu enfoque.',
        whatToDoNow: '👉 Acción sugerida: Documentar qué cambios hiciste este mes. Mantener la disciplina. No aumentar tamaño de posición prematuramente.',
        priority: 30,
        data: improvementCheck,
      });
    }

    // Win rate consistente y positivo
    const analytics = calculateAnalytics(trades);
    if (analytics.winRate >= 55 && analytics.averageR >= 1.5 && trades.filter(t => t.status === 'closed').length >= 20) {
      insights.push({
        id: 'consistent-performance',
        severity: 'positive',
        title: 'Rendimiento Consistente',
        whatHappened: `Win rate: ${analytics.winRate.toFixed(1)}%, R promedio: ${analytics.averageR.toFixed(2)}R, ${trades.filter(t => t.status === 'closed').length} trades cerrados`,
        whyHappened: 'Mantienes un win rate sólido y un R promedio positivo. Esto indica disciplina y buena ejecución de estrategia.',
        whatToDoNow: '👉 Acción sugerida: Mantener el enfoque actual. Considerar aumentar gradualmente tamaño de posición si la consistencia se mantiene por 2 meses más.',
        priority: 25,
        data: analytics,
      });
    }
  }

  // Ordenar por prioridad (mayor primero)
  return insights.sort((a, b) => b.priority - a.priority);
}

/**
 * Obtiene los insights prioritarios (máximo 5)
 * Incluye insights generados por objetivos fallidos
 */
export function getPriorityInsights(trades: Trade[], settings: Settings): ProactiveInsight[] {
  const allInsights = generateProactiveInsights(trades, settings);
  
  // Agregar insights generados por objetivos (evitar duplicados)
  // NOTA: El filtrado por objetivos activos se hace en InsightsPage.tsx
  // para evitar dependencias circulares
  try {
    const goalInsights = goalInsightsStorage.getAll();
    const seenKeys = new Set<string>(); // goalId + date
    
    const recentGoalInsights = goalInsights
      .filter((gi: any) => {
        if (!gi.generatedAt) return false;
        
        const generatedAt = new Date(gi.generatedAt);
        const daysSince = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);
        const insightDate = generatedAt.toISOString().split('T')[0];
        const uniqueKey = `${gi.goalId}_${insightDate}`;
        
        // Solo insights de los últimos 7 días
        if (daysSince > 7) return false;
        
        // Solo un insight por objetivo por día (evitar duplicados)
        if (seenKeys.has(uniqueKey)) {
          return false;
        }
        
        seenKeys.add(uniqueKey);
        return true;
      })
      .sort((a: any, b: any) => {
        // Mostrar el más reciente primero
        return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
      })
      .map((gi: any) => {
        const proactiveInsight = goalInsightToProactiveInsight(gi);
        // Agregar goalId a data para poder filtrar después
        proactiveInsight.data = { ...proactiveInsight.data, goalId: gi.goalId };
        return proactiveInsight;
      });
    
    allInsights.push(...recentGoalInsights);
  } catch (error) {
    console.error('Error loading goal insights:', error);
  }
  
  // Si hay insights críticos, mostrar solo críticos (máximo 5)
  const criticalInsights = allInsights.filter(i => i.severity === 'critical');
  if (criticalInsights.length > 0) {
    return criticalInsights.slice(0, 5);
  }

  // Si hay insights importantes, mostrar importantes (máximo 3) + positivos
  const importantInsights = allInsights.filter(i => i.severity === 'important');
  const positiveInsights = allInsights.filter(i => i.severity === 'positive');
  
  if (importantInsights.length > 0) {
    const result = importantInsights.slice(0, 3);
    if (positiveInsights.length > 0 && result.length < 5) {
      result.push(...positiveInsights.slice(0, 5 - result.length));
    }
    return result;
  }

  // Solo positivos (máximo 5)
  return positiveInsights.slice(0, 5);
}

