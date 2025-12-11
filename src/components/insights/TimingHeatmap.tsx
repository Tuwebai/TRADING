import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { calculateHourlyPerformance } from '@/lib/temporalAnalysis';
import { formatCurrency } from '@/lib/utils';
import type { Trade } from '@/types/Trading';
import { cn } from '@/lib/utils';

interface TimingHeatmapProps {
  trades: Trade[];
  baseCurrency: string;
}

export const TimingHeatmap: React.FC<TimingHeatmapProps> = ({ trades, baseCurrency }) => {
  const hourlyData = calculateHourlyPerformance(trades);
  
  if (hourlyData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
          No hay suficientes operaciones para mostrar el heatmap de horarios.
        </CardContent>
      </Card>
    );
  }
  
  // Create map for all 24 hours
  const hourMap = new Map<number, typeof hourlyData[0]>();
  hourlyData.forEach(data => {
    hourMap.set(data.hour, data);
  });
  
  // Find max/min for scaling
  const maxPnl = Math.max(...hourlyData.map(h => h.totalPnl), 0);
  const minPnl = Math.min(...hourlyData.map(h => h.totalPnl), 0);
  const maxAbs = Math.max(Math.abs(maxPnl), Math.abs(minPnl));
  
  const getCellColor = (pnl: number, hasData: boolean) => {
    if (!hasData) return 'bg-muted/20';
    
    const intensity = maxAbs > 0 ? Math.abs(pnl) / maxAbs : 0;
    const opacity = 0.3 + (intensity * 0.5);
    
    if (pnl > 0) {
      return `bg-green-500/[${opacity}] border-green-500/50`;
    } else if (pnl < 0) {
      return `bg-red-500/[${opacity}] border-red-500/50`;
    }
    return 'bg-muted/30';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap de P/L por Hora</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rendimiento por hora del día
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {Array.from({ length: 24 }).map((_, hour) => {
            const data = hourMap.get(hour);
            const hasData = data !== undefined;
            const pnl = data?.totalPnl || 0;
            
            return (
              <div
                key={hour}
                className={cn(
                  'p-3 rounded-md border text-center transition-all hover:scale-105',
                  getCellColor(pnl, hasData)
                )}
                title={
                  hasData
                    ? `${hour.toString().padStart(2, '0')}:00 - ${formatCurrency(pnl, baseCurrency)} (${data.trades} ops)`
                    : `${hour.toString().padStart(2, '0')}:00 - Sin operaciones`
                }
              >
                <div className="text-xs font-medium mb-1">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {hasData && (
                  <>
                    <div className={cn(
                      'text-xs font-semibold',
                      pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {formatCurrency(pnl, baseCurrency)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {data.trades} ops
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

