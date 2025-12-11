import type { Trade } from '@/types/Trading';

export interface HourlyPerformance {
  hour: number;
  trades: number;
  wins: number;
  losses: number;
  totalPnl: number;
  averagePnl: number;
  winRate: number;
}

export interface DailyPerformance {
  day: number; // 0 = Domingo, 1 = Lunes, etc.
  dayName: string;
  trades: number;
  wins: number;
  losses: number;
  totalPnl: number;
  averagePnl: number;
  winRate: number;
}

export interface HeatmapData {
  hour: number;
  day: number;
  dayName: string;
  trades: number;
  totalPnl: number;
  winRate: number;
}

/**
 * Calculate performance by hour of day
 */
export function calculateHourlyPerformance(trades: Trade[]): HourlyPerformance[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  const hourlyData: Map<number, { trades: Trade[]; wins: number; losses: number; totalPnl: number }> = new Map();
  
  // Initialize all hours
  for (let hour = 0; hour < 24; hour++) {
    hourlyData.set(hour, { trades: [], wins: 0, losses: 0, totalPnl: 0 });
  }
  
  // Process trades
  closedTrades.forEach(trade => {
    const entryDate = new Date(trade.entryDate);
    const hour = entryDate.getHours();
    
    const data = hourlyData.get(hour);
    if (data) {
      data.trades.push(trade);
      const pnl = trade.pnl || 0;
      data.totalPnl += pnl;
      if (pnl > 0) {
        data.wins++;
      } else if (pnl < 0) {
        data.losses++;
      }
    }
  });
  
  // Convert to array and calculate metrics
  return Array.from(hourlyData.entries())
    .map(([hour, data]) => ({
      hour,
      trades: data.trades.length,
      wins: data.wins,
      losses: data.losses,
      totalPnl: data.totalPnl,
      averagePnl: data.trades.length > 0 ? data.totalPnl / data.trades.length : 0,
      winRate: data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0,
    }))
    .filter(h => h.trades > 0) // Only return hours with trades
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Calculate performance by day of week
 */
export function calculateDailyPerformance(trades: Trade[]): DailyPerformance[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  const dailyData: Map<number, { trades: Trade[]; wins: number; losses: number; totalPnl: number }> = new Map();
  
  // Initialize all days
  for (let day = 0; day < 7; day++) {
    dailyData.set(day, { trades: [], wins: 0, losses: 0, totalPnl: 0 });
  }
  
  // Process trades
  closedTrades.forEach(trade => {
    const entryDate = new Date(trade.entryDate);
    const day = entryDate.getDay();
    
    const data = dailyData.get(day);
    if (data) {
      data.trades.push(trade);
      const pnl = trade.pnl || 0;
      data.totalPnl += pnl;
      if (pnl > 0) {
        data.wins++;
      } else if (pnl < 0) {
        data.losses++;
      }
    }
  });
  
  // Convert to array and calculate metrics
  return Array.from(dailyData.entries())
    .map(([day, data]) => ({
      day,
      dayName: dayNames[day],
      trades: data.trades.length,
      wins: data.wins,
      losses: data.losses,
      totalPnl: data.totalPnl,
      averagePnl: data.trades.length > 0 ? data.totalPnl / data.trades.length : 0,
      winRate: data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0,
    }))
    .filter(d => d.trades > 0) // Only return days with trades
    .sort((a, b) => a.day - b.day);
}

/**
 * Generate heatmap data (hour x day matrix)
 */
export function generateHeatmapData(trades: Trade[]): HeatmapData[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const heatmapData: Map<string, { trades: Trade[]; wins: number; totalPnl: number }> = new Map();
  
  // Process trades
  closedTrades.forEach(trade => {
    const entryDate = new Date(trade.entryDate);
    const hour = entryDate.getHours();
    const day = entryDate.getDay();
    const key = `${hour}-${day}`;
    
    const existing = heatmapData.get(key);
    if (existing) {
      existing.trades.push(trade);
      const pnl = trade.pnl || 0;
      existing.totalPnl += pnl;
      if (pnl > 0) {
        existing.wins++;
      }
    } else {
      const pnl = trade.pnl || 0;
      heatmapData.set(key, {
        trades: [trade],
        wins: pnl > 0 ? 1 : 0,
        totalPnl: pnl,
      });
    }
  });
  
  // Convert to array
  return Array.from(heatmapData.entries())
    .map(([key, data]) => {
      const [hour, day] = key.split('-').map(Number);
      return {
        hour,
        day,
        dayName: dayNames[day],
        trades: data.trades.length,
        totalPnl: data.totalPnl,
        winRate: data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0,
      };
    });
}

