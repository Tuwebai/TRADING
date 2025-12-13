import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { generateHeatmapData } from '@/lib/temporalAnalysis';
import { formatCurrency } from '@/lib/utils';
import type { Trade } from '@/types/Trading';
import { motion } from 'framer-motion';

interface PerformanceHeatmapProps {
  trades: Trade[];
  baseCurrency: string;
}

export const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({ trades, baseCurrency }) => {
  const heatmapData = generateHeatmapData(trades);
  
  if (heatmapData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
          No hay suficientes operaciones para generar el heatmap. Agrega más operaciones cerradas.
        </CardContent>
      </Card>
    );
  }

  // Create matrix: hour (rows) x day (columns)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // Find min/max for color scaling (currently not used but may be needed for intensity)
  // const allPnL = heatmapData.map(d => d.totalPnl);
  // const maxPnl = Math.max(...allPnL, 0);
  // const minPnl = Math.min(...allPnL, 0);
  // const maxAbs = Math.max(Math.abs(maxPnl), Math.abs(minPnl));

  const getCellColor = (pnl: number, trades: number) => {
    if (trades === 0) return 'bg-muted/20';
    
    // intensity calculated but not used - opacity handled inline in className
    
    if (pnl > 0) {
      return `bg-green-500/20 border-green-500/50`;
    } else if (pnl < 0) {
      return `bg-red-500/20 border-red-500/50`;
    }
    return 'bg-muted/20';
  };

  const getCellData = (hour: number, day: number) => {
    return heatmapData.find(d => d.hour === hour && d.day === day);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Heatmap de Rendimiento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rendimiento por hora del día y día de la semana. Verde = ganancias, Rojo = pérdidas.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-xs text-muted-foreground p-2 text-left">Hora</th>
                    {days.map((day, idx) => (
                      <th key={idx} className="text-xs text-muted-foreground p-2 text-center min-w-[60px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map((hour) => {
                    const hourData = heatmapData.filter(d => d.hour === hour);
                    if (hourData.length === 0) return null;
                    
                    return (
                      <tr key={hour}>
                        <td className="text-xs text-muted-foreground p-2 font-medium">
                          {hour.toString().padStart(2, '0')}:00
                        </td>
                        {days.map((_, dayIdx) => {
                          const cellData = getCellData(hour, dayIdx);
                          const cellTrades = cellData?.trades || 0;
                          const cellPnl = cellData?.totalPnl || 0;
                          
                          return (
                            <td
                              key={dayIdx}
                              className={`p-2 text-center border border-border/50 ${getCellColor(cellPnl, cellTrades)}`}
                              title={
                                cellTrades > 0
                                  ? `${cellTrades} operaciones | PnL: ${formatCurrency(cellPnl, baseCurrency)} | Win Rate: ${cellData?.winRate.toFixed(1)}%`
                                  : 'Sin operaciones'
                              }
                            >
                              {cellTrades > 0 && (
                                <div className="space-y-1">
                                  <div className={`text-xs font-semibold ${cellPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {formatCurrency(cellPnl, baseCurrency)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {cellTrades} ops
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/20 border border-green-500/50" />
              <span>Ganancias</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/20 border border-red-500/50" />
              <span>Pérdidas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted/20 border border-border/50" />
              <span>Sin operaciones</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

