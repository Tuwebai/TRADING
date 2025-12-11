import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getPLByWeekday } from '@/lib/calendarStats';
import { formatCurrency } from '@/lib/utils';
import type { Trade } from '@/types/Trading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface WeekdayChartProps {
  trades: Trade[];
  baseCurrency: string;
}

export const WeekdayChart: React.FC<WeekdayChartProps> = ({ trades, baseCurrency }) => {
  const weekdayData = getPLByWeekday(trades);
  
  if (weekdayData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
          No hay suficientes operaciones para mostrar la distribución por día de la semana.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de P/L por Día de la Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weekdayData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="weekdayName"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value, baseCurrency)}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
              {weekdayData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.totalPnl >= 0 ? 'hsl(var(--profit-color))' : 'hsl(var(--loss-color))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

