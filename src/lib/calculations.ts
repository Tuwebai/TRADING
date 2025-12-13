/**
 * Trading calculation utilities
 * 
 * All trading-related calculations are centralized here for reusability
 * and consistency across the application.
 */

import type { Trade } from '@/types/Trading';

/**
 * Calculate Profit and Loss (PnL) for a trade
 * 
 * Para Forex:
 * - 1 lote estándar = 100,000 unidades de la moneda base
 * - PnL = (Precio Salida - Precio Entrada) × Tamaño en Unidades
 * - Si positionSize < 100, asumimos que está en lotes → multiplicar por 100,000
 * - Si positionSize >= 100, asumimos que está en unidades directas
 * 
 * Ejemplo para EURUSD:
 * - Entrada: 1.1000, Salida: 1.1050, Tamaño: 0.1 lotes
 * - Diferencia: 0.0050 (50 pips)
 * - Unidades: 0.1 × 100,000 = 10,000
 * - PnL = 0.0050 × 10,000 = 50 USD
 * 
 * Para otros activos (acciones, cripto, etc.):
 * - PnL = (Precio Salida - Precio Entrada) × Tamaño de Posición
 * 
 * @param trade - The trade to calculate PnL for
 * @returns The PnL value in base currency (positive for profit, negative for loss)
 */
export function calculatePNL(trade: Trade): number {
  if (trade.status === 'open' || trade.exitPrice === null) {
    return 0;
  }

  const { positionType, entryPrice, exitPrice, positionSize, leverage, asset } = trade;
  
  // Detectar si es un par de forex
  const assetUpper = asset.toUpperCase().replace('/', '');
  const isForex = asset.includes('/') || 
                  /^[A-Z]{6}$/.test(assetUpper) ||
                  ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 
                   'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY'].includes(assetUpper);
  
  const priceDifference = exitPrice - entryPrice;
  let pnl: number;

  if (isForex) {
    // Para Forex: determinar si positionSize está en lotes o unidades
    // Si positionSize es un número pequeño (< 100), probablemente está en lotes
    // Si positionSize es >= 100, probablemente está en unidades
    // 1 lote estándar = 100,000 unidades
    
    let sizeInUnits: number;
    
    // Si es menor a 100 y no es un múltiplo exacto de 1000, asumimos lotes
    if (positionSize < 100 && positionSize % 1 !== 0) {
      // Número decimal pequeño = definitivamente lotes
      sizeInUnits = positionSize * 100000;
    } else if (positionSize < 100 && positionSize >= 0.01) {
      // Número entero pequeño (< 100) = probablemente lotes
      sizeInUnits = positionSize * 100000;
    } else {
      // Número >= 100 = probablemente unidades directas
      sizeInUnits = positionSize;
    }
    
    if (positionType === 'long') {
      // Long: ganancia cuando precio sube
      pnl = priceDifference * sizeInUnits;
    } else {
      // Short: ganancia cuando precio baja
      pnl = -priceDifference * sizeInUnits;
    }
    
    // Aplicar leverage si existe (el leverage ya está aplicado en el tamaño, pero por seguridad)
    if (leverage && leverage > 1) {
      pnl = pnl * leverage;
    }
  } else {
    // Para otros activos (acciones, cripto, commodities, etc.)
    // PnL = diferencia de precio × tamaño de posición
    if (positionType === 'long') {
      pnl = priceDifference * positionSize;
    } else {
      pnl = -priceDifference * positionSize;
    }
    
    // Aplicar leverage si existe
    if (leverage && leverage > 1) {
      pnl = pnl * leverage;
    }
  }

  return pnl;
}

/**
 * Calculate Risk/Reward ratio for a trade
 * 
 * @param trade - The trade to calculate R/R for
 * @returns The R/R ratio, or null if stop loss or take profit is not set
 */
export function calculateRR(trade: Trade): number | null {
  if (!trade.stopLoss || !trade.takeProfit) {
    return null;
  }

  const { positionType, entryPrice, stopLoss, takeProfit } = trade;

  let risk: number;
  let reward: number;

  if (positionType === 'long') {
    risk = entryPrice - stopLoss;
    reward = takeProfit - entryPrice;
  } else {
    // Short position
    risk = stopLoss - entryPrice;
    reward = entryPrice - takeProfit;
  }

  if (risk <= 0) {
    return null;
  }

  return reward / risk;
}

/**
 * Calculate win rate from a list of closed trades
 * 
 * @param trades - Array of trades (only closed trades are considered)
 * @returns Win rate as a percentage (0-100)
 */
export function calculateWinRate(trades: Trade[]): number {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== null);
  
  if (closedTrades.length === 0) {
    return 0;
  }

  const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0);
  return (winningTrades.length / closedTrades.length) * 100;
}

/**
 * Calculate average R (risk/reward) from closed trades
 * 
 * @param trades - Array of trades
 * @returns Average R value
 */
export function calculateAverageR(trades: Trade[]): number {
  const closedTrades = trades.filter(
    trade => trade.status === 'closed' && trade.riskReward !== null
  );

  if (closedTrades.length === 0) {
    return 0;
  }

  const totalR = closedTrades.reduce((sum, trade) => sum + (trade.riskReward || 0), 0);
  return totalR / closedTrades.length;
}

/**
 * Calculate average PnL from closed trades
 * 
 * @param trades - Array of trades
 * @returns Average PnL value
 */
export function calculateAveragePnl(trades: Trade[]): number {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== null);

  if (closedTrades.length === 0) {
    return 0;
  }

  const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  return totalPnl / closedTrades.length;
}

/**
 * Calculate maximum win streak
 * 
 * @param trades - Array of trades (should be sorted by date)
 * @returns Maximum consecutive winning trades
 */
export function calculateMaxWinStreak(trades: Trade[]): number {
  const closedTrades = trades
    .filter(trade => trade.status === 'closed' && trade.pnl !== null)
    .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

  let maxStreak = 0;
  let currentStreak = 0;

  for (const trade of closedTrades) {
    if ((trade.pnl || 0) > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Calculate maximum loss streak
 * 
 * @param trades - Array of trades (should be sorted by date)
 * @returns Maximum consecutive losing trades
 */
export function calculateMaxLossStreak(trades: Trade[]): number {
  const closedTrades = trades
    .filter(trade => trade.status === 'closed' && trade.pnl !== null)
    .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

  let maxStreak = 0;
  let currentStreak = 0;

  for (const trade of closedTrades) {
    if ((trade.pnl || 0) < 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Calculate profit factor
 * 
 * Profit Factor = Total Gross Profit / Total Gross Loss
 * 
 * @param trades - Array of trades
 * @returns Profit factor (returns 0 if no losses, or the calculated ratio)
 */
export function calculateProfitFactor(trades: Trade[]): number {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== null);

  let totalProfit = 0;
  let totalLoss = 0;

  for (const trade of closedTrades) {
    const pnl = trade.pnl || 0;
    if (pnl > 0) {
      totalProfit += pnl;
    } else if (pnl < 0) {
      totalLoss += Math.abs(pnl);
    }
  }

  if (totalLoss === 0) {
    return totalProfit > 0 ? Infinity : 0;
  }

  return totalProfit / totalLoss;
}

/**
 * Generate equity curve data points from trades with drawdowns
 * 
 * @param trades - Array of trades (should be sorted by date)
 * @param initialEquity - Starting account balance
 * @returns Array of equity points with drawdown data for charting
 */
export function generateEquityCurve(
  trades: Trade[],
  initialEquity: number
): Array<{ date: string; equity: number; cumulativePnl: number; drawdown: number; drawdownPercent: number; peak: number }> {
  const closedTrades = trades
    .filter(trade => trade.status === 'closed' && trade.pnl !== null)
    .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

  const points: Array<{ date: string; equity: number; cumulativePnl: number; drawdown: number; drawdownPercent: number; peak: number }> = [];
  let cumulativePnl = 0;
  let peakEquity = initialEquity;

  // Si no hay operaciones cerradas, retornar solo el punto inicial
  if (closedTrades.length === 0) {
    const today = new Date().toISOString();
    return [{
      date: today,
      equity: initialEquity,
      cumulativePnl: 0,
      drawdown: 0,
      drawdownPercent: 0,
      peak: initialEquity,
    }];
  }

  // Agregar punto inicial (antes de la primera operación)
  const firstTradeDate = new Date(closedTrades[0].entryDate);
  // Retroceder un día para el punto inicial
  firstTradeDate.setDate(firstTradeDate.getDate() - 1);
  
  points.push({
    date: firstTradeDate.toISOString(),
    equity: initialEquity,
    cumulativePnl: 0,
    drawdown: 0,
    drawdownPercent: 0,
    peak: initialEquity,
  });

  // Agregar puntos para cada operación cerrada
  for (const trade of closedTrades) {
    cumulativePnl += trade.pnl || 0;
    const currentEquity = initialEquity + cumulativePnl;
    
    // Update peak if current equity is higher
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    
    // Calculate drawdown
    const drawdown = peakEquity - currentEquity;
    const drawdownPercent = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0;
    
    points.push({
      date: trade.exitDate || trade.entryDate,
      equity: currentEquity,
      cumulativePnl,
      drawdown,
      drawdownPercent,
      peak: peakEquity,
    });
  }

  // Si solo hay una operación, agregar un punto adicional al final para mejor visualización
  if (closedTrades.length === 1 && points.length === 2) {
    const lastPoint = points[points.length - 1];
    const lastDate = new Date(lastPoint.date);
    lastDate.setDate(lastDate.getDate() + 1);
    
    points.push({
      date: lastDate.toISOString(),
      equity: lastPoint.equity,
      cumulativePnl: lastPoint.cumulativePnl,
      drawdown: lastPoint.drawdown,
      drawdownPercent: lastPoint.drawdownPercent,
      peak: lastPoint.peak,
    });
  }

  return points;
}

/**
 * Calculate maximum drawdown from equity curve
 */
export function calculateMaxDrawdown(
  equityCurve: Array<{ equity: number; peak: number }>
): { maxDrawdown: number; maxDrawdownPercent: number } {
  if (equityCurve.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPercent: 0 };
  }

  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  for (const point of equityCurve) {
    const drawdown = point.peak - point.equity;
    const drawdownPercent = point.peak > 0 ? (drawdown / point.peak) * 100 : 0;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    if (drawdownPercent > maxDrawdownPercent) {
      maxDrawdownPercent = drawdownPercent;
    }
  }

  return { maxDrawdown, maxDrawdownPercent };
}

/**
 * Generate PnL distribution data for histogram
 */
export function generatePnLDistribution(trades: Trade[]): Array<{ range: string; count: number; pnl: number }> {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== null);
  
  if (closedTrades.length === 0) {
    return [];
  }

  const pnlValues = closedTrades.map(trade => trade.pnl || 0);
  const minPnl = Math.min(...pnlValues);
  const maxPnl = Math.max(...pnlValues);
  
  // Si solo hay una operación, crear un bin simple
  if (closedTrades.length === 1) {
    const pnl = pnlValues[0];
    return [{
      range: pnl >= 0 ? `+${pnl.toFixed(2)}` : pnl.toFixed(2),
      count: 1,
      pnl,
    }];
  }
  
  // Si el rango es muy pequeño, usar menos bins
  const range = maxPnl - minPnl;
  let numBins = Math.min(10, Math.max(3, Math.ceil(Math.sqrt(closedTrades.length))));
  
  // Si el rango es muy pequeño, ajustar bins
  if (range < 0.01) {
    numBins = Math.min(5, closedTrades.length);
  }
  
  const binSize = range / numBins;
  
  // Si binSize es muy pequeño, usar bins más amplios
  const adjustedBinSize = binSize < 0.01 ? Math.max(0.01, range / 5) : binSize;
  const adjustedNumBins = Math.ceil(range / adjustedBinSize);
  
  const bins: Array<{ min: number; max: number; count: number; totalPnl: number }> = [];
  
  // Inicializar bins
  for (let i = 0; i < adjustedNumBins; i++) {
    bins.push({
      min: minPnl + (i * adjustedBinSize),
      max: minPnl + ((i + 1) * adjustedBinSize),
      count: 0,
      totalPnl: 0,
    });
  }
  
  // Asegurar que el último bin incluya el máximo
  if (bins.length > 0) {
    bins[bins.length - 1].max = maxPnl + 0.01; // Pequeño margen para incluir el máximo
  }
  
  // Distribuir operaciones en bins
  for (const pnl of pnlValues) {
    let binIndex = Math.floor((pnl - minPnl) / adjustedBinSize);
    // Asegurar que el último valor vaya al último bin
    if (binIndex >= adjustedNumBins) {
      binIndex = adjustedNumBins - 1;
    }
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].count++;
      bins[binIndex].totalPnl += pnl;
    }
  }
  
  // Convertir a formato para el gráfico con mejor formato
  return bins
    .filter(bin => bin.count > 0)
    .map(bin => {
      const formatValue = (val: number) => {
        if (Math.abs(val) >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toFixed(2);
      };
      
      return {
        range: `${formatValue(bin.min)} - ${formatValue(bin.max)}`,
        count: bin.count,
        pnl: bin.min + (adjustedBinSize / 2), // Centro del bin
      };
    });
}

/**
 * Calculate all analytics metrics at once
 * 
 * @param trades - Array of all trades
 * @returns Complete analytics object
 */
export function calculateAnalytics(trades: Trade[]): {
  winRate: number;
  averageR: number;
  averagePnl: number;
  maxWinStreak: number;
  maxLossStreak: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
} {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== null);
  const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(trade => (trade.pnl || 0) < 0);
  const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

  return {
    winRate: calculateWinRate(trades),
    averageR: calculateAverageR(trades),
    averagePnl: calculateAveragePnl(trades),
    maxWinStreak: calculateMaxWinStreak(trades),
    maxLossStreak: calculateMaxLossStreak(trades),
    profitFactor: calculateProfitFactor(trades),
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalPnl,
  };
}

