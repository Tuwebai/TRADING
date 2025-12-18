/**
 * Trade Context Analysis
 * Analyzes historical trades to provide contextual suggestions and warnings
 * Based on user's own trading history - no external data or AI
 */

import type { Trade, TradeFormData } from '@/types/Trading';

/**
 * Contextual suggestion based on historical patterns
 */
export interface ContextualSuggestion {
  type: 'strategy' | 'tag' | 'session' | 'risk';
  message: string;
  confidence: number; // 0-1, based on frequency and consistency
  suggestedValue?: string; // Suggested strategy name, tag, etc.
  historicalMatches: number; // How many similar trades found
  applyAction?: () => void; // Optional action to apply the suggestion
}

/**
 * Historical warning based on negative patterns
 */
export interface HistoricalWarning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  metric: 'winrate' | 'expectancy' | 'drawdown' | 'streak';
  value: number; // Actual metric value
  threshold: number; // Threshold that triggered the warning
  historicalMatches: number;
}

/**
 * Similar trade found in history
 */
export interface SimilarTrade {
  trade: Trade;
  similarityScore: number; // 0-1, how similar it is
  matchingCriteria: string[]; // Which criteria matched
}

/**
 * Calculate risk/reward ratio from trade data
 */
function calculateRR(entryPrice: number, stopLoss: number | null, takeProfit: number | null): number | null {
  if (!stopLoss || !takeProfit) return null;
  
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  
  if (risk === 0) return null;
  return reward / risk;
}

/**
 * Get trading session from date/time
 */
function getTradingSession(date: Date): 'asian' | 'london' | 'new-york' | 'overlap' | 'other' {
  const hour = date.getUTCHours();
  
  // Asian: 00:00-09:00 UTC
  // London: 08:00-17:00 UTC
  // NY: 13:00-22:00 UTC
  // Overlap: 13:00-17:00 UTC (London + NY)
  
  if (hour >= 13 && hour < 17) return 'overlap';
  if (hour >= 8 && hour < 13) return 'london';
  if (hour >= 13 && hour < 22) return 'new-york';
  if (hour >= 0 && hour < 9) return 'asian';
  return 'other';
}

/**
 * Check if two times are in similar time window (±30 minutes)
 */
function isSimilarTime(date1: Date, date2: Date): boolean {
  const diffMinutes = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60));
  return diffMinutes <= 30;
}

/**
 * Check if two RR ratios are similar (±20%)
 */
function isSimilarRR(rr1: number | null, rr2: number | null): boolean {
  if (!rr1 || !rr2) return false;
  const diff = Math.abs(rr1 - rr2);
  const avg = (rr1 + rr2) / 2;
  if (avg === 0) return false;
  const percentDiff = (diff / avg) * 100;
  return percentDiff <= 20;
}

/**
 * Check if two dates are on the same day of week
 */
function isSameDayOfWeek(date1: Date, date2: Date): boolean {
  return date1.getDay() === date2.getDay();
}

/**
 * Calculate winrate for a set of trades
 */
function calculateWinrate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const winners = trades.filter(t => t.pnl && t.pnl > 0).length;
  return winners / trades.length;
}

/**
 * Calculate expectancy for a set of trades
 */
function calculateExpectancy(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  return totalPnL / trades.length;
}

/**
 * Calculate maximum drawdown for a set of trades (simplified)
 */
function calculateMaxDrawdown(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  
  // Sort by date
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnL = 0;
  
  for (const trade of sortedTrades) {
    runningPnL += trade.pnl || 0;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * Find similar trades based on multiple criteria
 */
export function findSimilarTrades(
  tradeDraft: Partial<TradeFormData>,
  tradesHistory: Trade[],
  minSimilarityCriteria: number = 3
): SimilarTrade[] {
  if (!tradeDraft.asset || !tradeDraft.entryDate) {
    return [];
  }

  const draftEntryDate = new Date(tradeDraft.entryDate);
  const draftRR = tradeDraft.entryPrice && tradeDraft.stopLoss && tradeDraft.takeProfit
    ? calculateRR(tradeDraft.entryPrice, tradeDraft.stopLoss, tradeDraft.takeProfit)
    : null;
  const draftSession = getTradingSession(draftEntryDate);

  const similarTrades: SimilarTrade[] = [];

  for (const trade of tradesHistory) {
    if (trade.status !== 'closed') continue; // Only analyze closed trades

    const tradeEntryDate = new Date(trade.entryDate);
    const tradeRR = calculateRR(trade.entryPrice, trade.stopLoss, trade.takeProfit);
    const tradeSession = trade.session || getTradingSession(tradeEntryDate);

    const matchingCriteria: string[] = [];
    let score = 0;

    // Check asset match
    if (trade.asset === tradeDraft.asset) {
      matchingCriteria.push('activo');
      score += 0.25;
    }

    // Check position type match
    if (trade.positionType === tradeDraft.positionType) {
      matchingCriteria.push('tipo');
      score += 0.2;
    }

    // Check time window match (±30 min)
    if (isSimilarTime(draftEntryDate, tradeEntryDate)) {
      matchingCriteria.push('horario');
      score += 0.2;
    }

    // Check RR match (±20%)
    if (draftRR && tradeRR && isSimilarRR(draftRR, tradeRR)) {
      matchingCriteria.push('RR');
      score += 0.15;
    }

    // Check session match
    if (tradeSession === draftSession) {
      matchingCriteria.push('sesión');
      score += 0.1;
    }

    // Check day of week match (lower weight)
    if (isSameDayOfWeek(draftEntryDate, tradeEntryDate)) {
      matchingCriteria.push('día semana');
      score += 0.05;
    }

    // Check strategy/tag match (if available)
    if (tradeDraft.setupId && trade.setupId === tradeDraft.setupId) {
      matchingCriteria.push('estrategia');
      score += 0.15;
    }

    // If enough criteria match, add to similar trades
    if (matchingCriteria.length >= minSimilarityCriteria) {
      similarTrades.push({
        trade,
        similarityScore: Math.min(score, 1), // Cap at 1.0
        matchingCriteria,
      });
    }
  }

  // Sort by similarity score (highest first)
  return similarTrades.sort((a, b) => b.similarityScore - a.similarityScore);
}

/**
 * Get contextual suggestions based on historical patterns
 */
export function getContextualSuggestions(
  tradeDraft: Partial<TradeFormData>,
  tradesHistory: Trade[],
  minOccurrences: number = 5
): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];

  if (!tradeDraft.asset || !tradeDraft.entryDate) {
    return suggestions;
  }

  const draftEntryDate = new Date(tradeDraft.entryDate);
  const draftSession = getTradingSession(draftEntryDate);

  // Find similar historical trades (RR is calculated internally in findSimilarTrades)
  const similarTrades = findSimilarTrades(tradeDraft, tradesHistory, 2);

  if (similarTrades.length < minOccurrences) {
    return suggestions; // Not enough data
  }

  // Analyze strategy/tag patterns
  const strategyCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const sessionCounts = new Map<string, number>();

  for (const similar of similarTrades) {
    const trade = similar.trade;
    
    // Count strategies (setupId)
    if (trade.setupId) {
      const count = strategyCounts.get(trade.setupId) || 0;
      strategyCounts.set(trade.setupId, count + 1);
    }

    // Count tags
    if (trade.tags && trade.tags.length > 0) {
      for (const tag of trade.tags) {
        const count = tagCounts.get(tag) || 0;
        tagCounts.set(tag, count + 1);
      }
    }

    // Count sessions
    const session = trade.session || getTradingSession(new Date(trade.entryDate));
    const sessionCount = sessionCounts.get(session) || 0;
    sessionCounts.set(session, sessionCount + 1);
  }

  // Suggest most common strategy
  if (strategyCounts.size > 0) {
    const mostCommonStrategy = Array.from(strategyCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonStrategy[1] >= minOccurrences) {
      // Get strategy name from setup (would need setupStore, but for now use ID)
      const strategyName = mostCommonStrategy[0]; // TODO: Get actual name from setupStore
      suggestions.push({
        type: 'strategy',
        message: `En contextos similares solés usar la estrategia "${strategyName}"`,
        confidence: Math.min(mostCommonStrategy[1] / similarTrades.length, 1),
        suggestedValue: mostCommonStrategy[0],
        historicalMatches: mostCommonStrategy[1],
      });
    }
  }

  // Suggest most common tag
  if (tagCounts.size > 0) {
    const mostCommonTag = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonTag[1] >= minOccurrences) {
      suggestions.push({
        type: 'tag',
        message: `En trades similares solés usar el tag "${mostCommonTag[0]}"`,
        confidence: Math.min(mostCommonTag[1] / similarTrades.length, 1),
        suggestedValue: mostCommonTag[0],
        historicalMatches: mostCommonTag[1],
      });
    }
  }

  // Suggest session if different from detected
  if (sessionCounts.size > 0) {
    const mostCommonSession = Array.from(sessionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonSession[1] >= minOccurrences && mostCommonSession[0] !== draftSession) {
      const sessionNames: Record<string, string> = {
        'asian': 'Asiática',
        'london': 'Londres',
        'new-york': 'Nueva York',
        'overlap': 'Overlap',
        'other': 'Otra',
      };
      
      suggestions.push({
        type: 'session',
        message: `En contextos similares solés operar en sesión ${sessionNames[mostCommonSession[0]] || mostCommonSession[0]}`,
        confidence: Math.min(mostCommonSession[1] / similarTrades.length, 1),
        suggestedValue: mostCommonSession[0],
        historicalMatches: mostCommonSession[1],
      });
    }
  }

  return suggestions;
}

/**
 * Get historical warnings based on negative patterns
 */
export function getHistoricalWarnings(
  tradeDraft: Partial<TradeFormData>,
  tradesHistory: Trade[]
): HistoricalWarning[] {
  const warnings: HistoricalWarning[] = [];

  if (!tradeDraft.asset || !tradeDraft.entryDate) {
    return warnings;
  }

  // Find similar trades
  const similarTrades = findSimilarTrades(tradeDraft, tradesHistory, 2);

  if (similarTrades.length < 3) {
    return warnings; // Not enough data for warnings
  }

  const trades = similarTrades.map(st => st.trade);
  const winrate = calculateWinrate(trades);
  const expectancy = calculateExpectancy(trades);
  const maxDrawdown = calculateMaxDrawdown(trades);

  // Warning: Low winrate
  if (winrate < 0.4 && trades.length >= 5) {
    warnings.push({
      severity: winrate < 0.3 ? 'high' : winrate < 0.35 ? 'medium' : 'low',
      message: `Este patrón falló ${Math.round((1 - winrate) * trades.length)} de las últimas ${trades.length} veces en tu historial.`,
      metric: 'winrate',
      value: winrate,
      threshold: 0.4,
      historicalMatches: trades.length,
    });
  }

  // Warning: Negative expectancy
  if (expectancy < 0 && trades.length >= 5) {
    warnings.push({
      severity: expectancy < -50 ? 'high' : expectancy < -20 ? 'medium' : 'low',
      message: `Este patrón tiene expectativa negativa (${expectancy.toFixed(2)}) en ${trades.length} trades históricos.`,
      metric: 'expectancy',
      value: expectancy,
      threshold: 0,
      historicalMatches: trades.length,
    });
  }

  // Warning: Recurring drawdown
  if (maxDrawdown > 100 && trades.length >= 7) {
    warnings.push({
      severity: maxDrawdown > 300 ? 'high' : maxDrawdown > 200 ? 'medium' : 'low',
      message: `Este patrón generó un drawdown de ${maxDrawdown.toFixed(2)} en ${trades.length} trades anteriores.`,
      metric: 'drawdown',
      value: maxDrawdown,
      threshold: 100,
      historicalMatches: trades.length,
    });
  }

  // Warning: Losing streak
  const recentTrades = trades.slice(-5); // Last 5 similar trades
  const recentWinrate = calculateWinrate(recentTrades);
  if (recentWinrate < 0.2 && recentTrades.length >= 5) {
    warnings.push({
      severity: 'medium',
      message: `Los últimos ${recentTrades.length} trades similares tuvieron solo ${Math.round(recentWinrate * recentTrades.length)} ganadores.`,
      metric: 'streak',
      value: recentWinrate,
      threshold: 0.2,
      historicalMatches: recentTrades.length,
    });
  }

  return warnings;
}

/**
 * Check if trade draft has enough data for context analysis
 */
export function hasEnoughContextData(tradeDraft: Partial<TradeFormData>): boolean {
  return !!(
    tradeDraft.asset &&
    tradeDraft.entryDate &&
    tradeDraft.entryPrice &&
    (tradeDraft.stopLoss || tradeDraft.takeProfit) // At least one for RR calculation
  );
}

