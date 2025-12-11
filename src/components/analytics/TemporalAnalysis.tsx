import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { calculateHourlyPerformance, calculateDailyPerformance } from '@/lib/temporalAnalysis';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { Trade } from '@/types/Trading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface TemporalAnalysisProps {
  trades: Trade[];
  baseCurrency: string;
}

export const TemporalAnalysis: React.FC<TemporalAnalysisProps> = ({ trades, baseCurrency }) => {
  const hourlyData = calculateHourlyPerformance(trades);
  const dailyData = calculateDailyPerformance(trades);

  if (hourlyData.length === 0 && dailyData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
          No hay suficientes operaciones para análisis temporal. Agrega más operaciones cerradas.
        </CardContent>
      </Card>
    );
  }

  // Find best/worst hours
  const bestHour = hourlyData.reduce((best, current) => 
    current.totalPnl > best.totalPnl ? current : best, 
    hourlyData[0] || { hour: 0, totalPnl: 0 }
  );
  const worstHour = hourlyData.reduce((worst, current) => 
    current.totalPnl < worst.totalPnl ? current : worst, 
    hourlyData[0] || { hour: 0, totalPnl: 0 }
  );

  // Find best/worst days
  const bestDay = dailyData.reduce((best, current) => 
    current.totalPnl > best.totalPnl ? current : best, 
    dailyData[0] || { day: 0, totalPnl: 0 }
  );
  const worstDay = dailyData.reduce((worst, current) => 
    current.totalPnl < worst.totalPnl ? current : worst, 
    dailyData[0] || { day: 0, totalPnl: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Resumen de mejores/peores momentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mejor Hora para Operar</CardTitle>
          </CardHeader>
          <CardContent>
            {bestHour && bestHour.totalPnl > 0 ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-profit">
                  {bestHour.hour.toString().padStart(2, '0')}:00
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>PnL Total: {formatCurrency(bestHour.totalPnl, baseCurrency)}</p>
                  <p>Operaciones: {bestHour.trades} ({bestHour.wins} ganadoras, {bestHour.losses} perdedoras)</p>
                  <p>Win Rate: {formatPercentage(bestHour.winRate)}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No hay datos suficientes</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mejor Día para Operar</CardTitle>
          </CardHeader>
          <CardContent>
            {bestDay && bestDay.totalPnl > 0 ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-profit">
                  {bestDay.dayName}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>PnL Total: {formatCurrency(bestDay.totalPnl, baseCurrency)}</p>
                  <p>Operaciones: {bestDay.trades} ({bestDay.wins} ganadoras, {bestDay.losses} perdedoras)</p>
                  <p>Win Rate: {formatPercentage(bestDay.winRate)}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No hay datos suficientes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico por hora */}
      {hourlyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Hora del Día</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(value) => `${value.toString().padStart(2, '0')}:00`}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value, baseCurrency)}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, baseCurrency)}
                    labelFormatter={(label) => `Hora ${label.toString().padStart(2, '0')}:00`}
                  />
                  <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
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
        </motion.div>
      )}

      {/* Gráfico por día */}
      {dailyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Día de la Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="dayName"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value, baseCurrency)}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, baseCurrency)}
                  />
                  <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                    {dailyData.map((entry, index) => (
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
        </motion.div>
      )}
    </div>
  );
};

