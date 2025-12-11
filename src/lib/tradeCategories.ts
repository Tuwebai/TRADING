import type { Trade } from '@/types/Trading';

export type TradeCategory = 
  | 'No Trade'
  | 'Take Profit'
  | 'Stop Loss'
  | 'Break Even'
  | 'Partial Win'
  | 'In Process'
  | 'Loss Failed To Follow Rules';

export interface TradeCategoryData {
  category: TradeCategory;
  count: number;
  percentage: number;
}

const CATEGORY_COLORS: Record<TradeCategory, string> = {
  'No Trade': '#FFA500', // Naranja
  'Take Profit': '#90EE90', // Verde claro
  'Stop Loss': '#FF7F7F', // Coral rojo
  'Break Even': '#FFD700', // Amarillo
  'Partial Win': '#98FB98', // Verde más claro
  'In Process': '#D3D3D3', // Gris claro
  'Loss Failed To Follow Rules': '#FF69B4', // Rosa
};

/**
 * Determina la categoría de una operación basándose en su estado y resultados
 */
export function categorizeTrade(trade: Trade): TradeCategory {
  // Operaciones abiertas
  if (trade.status === 'open') {
    return 'In Process';
  }

  // Operaciones cerradas
  if (trade.status === 'closed' && trade.exitPrice !== null && trade.pnl !== null) {
    const pnl = trade.pnl;
    const entryPrice = trade.entryPrice;
    const exitPrice = trade.exitPrice;
    const stopLoss = trade.stopLoss;
    const takeProfit = trade.takeProfit;
    const positionType = trade.positionType;

    // Calcular si alcanzó TP o SL
    let reachedTakeProfit = false;
    let reachedStopLoss = false;

    if (stopLoss && takeProfit) {
      if (positionType === 'long') {
        // Para long: TP arriba, SL abajo
        const distanceToTP = Math.abs(exitPrice - takeProfit);
        const distanceToSL = Math.abs(exitPrice - stopLoss);
        const priceRange = Math.abs(takeProfit - stopLoss);
        const threshold = priceRange * 0.05; // 5% del rango como tolerancia

        reachedTakeProfit = exitPrice >= takeProfit || distanceToTP <= threshold;
        reachedStopLoss = exitPrice <= stopLoss || distanceToSL <= threshold;
      } else {
        // Para short: TP abajo, SL arriba
        const distanceToTP = Math.abs(exitPrice - takeProfit);
        const distanceToSL = Math.abs(exitPrice - stopLoss);
        const priceRange = Math.abs(stopLoss - takeProfit);
        const threshold = priceRange * 0.05; // 5% del rango como tolerancia

        reachedTakeProfit = exitPrice <= takeProfit || distanceToTP <= threshold;
        reachedStopLoss = exitPrice >= stopLoss || distanceToSL <= threshold;
      }
    }

    // Verificar si hay tags que indiquen que no siguió las reglas
    const failedToFollowRules = trade.tags?.some(tag => 
      tag.toLowerCase().includes('no seguir') || 
      tag.toLowerCase().includes('regla') ||
      tag.toLowerCase().includes('error')
    ) || false;

    // Categorizar
    if (reachedTakeProfit) {
      return 'Take Profit';
    }

    if (reachedStopLoss) {
      // Si alcanzó SL pero hay indicios de que no siguió reglas, categorizar como tal
      if (failedToFollowRules && pnl < 0) {
        return 'Loss Failed To Follow Rules';
      }
      return 'Stop Loss';
    }

    // Break Even (PnL muy cercano a 0)
    const breakEvenThreshold = Math.abs(entryPrice * 0.001); // 0.1% del precio de entrada
    if (Math.abs(pnl) <= breakEvenThreshold) {
      return 'Break Even';
    }

    // Partial Win (ganancia pero no alcanzó TP)
    if (pnl > 0 && !reachedTakeProfit) {
      return 'Partial Win';
    }

    // Pérdida que no fue SL
    if (pnl < 0 && !reachedStopLoss) {
      if (failedToFollowRules) {
        return 'Loss Failed To Follow Rules';
      }
      // Si no hay SL definido, categorizar como Stop Loss genérico
      return stopLoss ? 'Loss Failed To Follow Rules' : 'Stop Loss';
    }
  }

  // Por defecto, si no se puede categorizar
  return 'No Trade';
}

/**
 * Calcula la distribución de categorías para todas las operaciones
 */
export function calculateTradeCategories(trades: Trade[]): TradeCategoryData[] {
  const categoryCounts: Record<TradeCategory, number> = {
    'No Trade': 0,
    'Take Profit': 0,
    'Stop Loss': 0,
    'Break Even': 0,
    'Partial Win': 0,
    'In Process': 0,
    'Loss Failed To Follow Rules': 0,
  };

  // Contar operaciones por categoría
  trades.forEach(trade => {
    const category = categorizeTrade(trade);
    categoryCounts[category]++;
  });

  const total = trades.length;

  // Convertir a array y calcular porcentajes
  const result: TradeCategoryData[] = Object.entries(categoryCounts)
    .filter(([_, count]) => count > 0) // Solo incluir categorías con operaciones
    .map(([category, count]) => ({
      category: category as TradeCategory,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count); // Ordenar por cantidad descendente

  return result;
}

/**
 * Obtiene el color para una categoría
 */
export function getCategoryColor(category: TradeCategory): string {
  return CATEGORY_COLORS[category];
}

