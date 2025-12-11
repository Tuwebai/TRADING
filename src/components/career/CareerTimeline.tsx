import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getCareerTimelineData, type CareerTimelineMonth } from '@/lib/careerStats';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { Trade } from '@/types/Trading';
import { Tooltip } from 'recharts';

interface CareerTimelineProps {
  trades: Trade[];
  baseCurrency: string;
}

export const CareerTimeline: React.FC<CareerTimelineProps> = ({ trades, baseCurrency }) => {
  const timeline = getCareerTimelineData(trades);
  
  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
          No hay suficientes operaciones para mostrar la línea de tiempo.
        </CardContent>
      </Card>
    );
  }
  
  const maxPnl = Math.max(...timeline.map(m => Math.abs(m.totalPnl)), 1);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Línea de Tiempo de Carrera</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rendimiento mensual a lo largo de tu carrera
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-full" style={{ minWidth: `${timeline.length * 80}px` }}>
            {timeline.map((month, index) => {
              const intensity = Math.abs(month.totalPnl) / maxPnl;
              const opacity = 0.3 + (intensity * 0.7);
              const isPositive = month.totalPnl >= 0;
              
              return (
                <div
                  key={`${month.year}-${month.month}`}
                  className="flex-1 min-w-[60px] group relative"
                >
                  <div
                    className={`h-32 rounded-t-md border-2 transition-all hover:scale-105 cursor-pointer ${
                      isPositive
                        ? `bg-green-500/[${opacity}] border-green-500/50`
                        : `bg-red-500/[${opacity}] border-red-500/50`
                    }`}
                    style={{
                      height: `${Math.max(40, Math.abs(month.totalPnl) / maxPnl * 200)}px`,
                    }}
                    title={`${month.monthName} ${month.year}: ${formatCurrency(month.totalPnl, baseCurrency)}`}
                  />
                  <div className="text-xs text-center mt-2 text-muted-foreground">
                    {month.monthName.substring(0, 3)}
                  </div>
                  <div className="text-xs text-center text-muted-foreground">
                    {month.year}
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-card border rounded-md p-2 shadow-lg min-w-[200px]">
                    <div className="text-sm font-semibold">{month.monthName} {month.year}</div>
                    <div className={`text-xs ${isPositive ? 'text-profit' : 'text-loss'}`}>
                      P/L: {formatCurrency(month.totalPnl, baseCurrency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Operaciones: {month.tradeCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Win Rate: {formatPercentage(month.winRate)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

