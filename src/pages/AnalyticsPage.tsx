import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateAnalytics, generateEquityCurve, calculateMaxDrawdown, generatePnLDistribution } from '@/lib/calculations';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, BarChart, Bar, Cell, Line } from 'recharts';
import { motion } from 'framer-motion';
import { SkeletonChart, SkeletonStatCard } from '@/components/ui/Skeleton';
import { PerformanceHeatmap } from '@/components/analytics/PerformanceHeatmap';
import { TemporalAnalysis } from '@/components/analytics/TemporalAnalysis';
import { ChartExportButton } from '@/components/analytics/ChartExportButton';

export const AnalyticsPage = () => {
  const { getTradesByMode, loadTrades, isLoading } = useTradeStore();
  const trades = getTradesByMode(); // Get trades filtered by current mode
  const { settings, loadSettings } = useSettingsStore();
  const [chartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);

  useEffect(() => {
    if (trades.length > 0 && !isLoading) {
      // Pequeño delay para mostrar la animación
      const timer = setTimeout(() => setChartLoaded(true), 100);
      return () => clearTimeout(timer);
    }
  }, [trades, isLoading]);

  const analytics = calculateAnalytics(trades);
  // Usar currentCapital si está disponible y es diferente de 0, sino initialCapital, sino accountSize
  const initialCapital = (settings.currentCapital && settings.currentCapital > 0) 
    ? settings.currentCapital 
    : (settings.initialCapital && settings.initialCapital > 0)
    ? settings.initialCapital
    : settings.accountSize;
  const equityCurve = generateEquityCurve(trades, initialCapital);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  const pnlDistribution = generatePnLDistribution(trades);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut" as const,
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  };

  const statCards = [
    {
      title: 'Tasa de Éxito',
      value: formatPercentage(analytics.winRate),
      description: `${analytics.winningTrades} ganadoras / ${analytics.totalTrades} operaciones`,
    },
    {
      title: 'R Promedio',
      value: analytics.averageR.toFixed(2),
      description: 'Ratio Riesgo/Beneficio',
    },
    {
      title: 'PnL Promedio',
      value: formatCurrency(analytics.averagePnl, settings.baseCurrency),
      description: 'Por operación cerrada',
    },
    {
      title: 'Factor de Beneficio',
      value: analytics.profitFactor === Infinity ? '∞' : analytics.profitFactor.toFixed(2),
      description: 'Ganancia bruta / Pérdida bruta',
    },
    {
      title: 'Racha Máxima de Ganadoras',
      value: analytics.maxWinStreak.toString(),
      description: 'Ganadoras consecutivas',
    },
    {
      title: 'Racha Máxima de Perdedoras',
      value: analytics.maxLossStreak.toString(),
      description: 'Perdedoras consecutivas',
    },
    {
      title: 'PnL Total',
      value: formatCurrency(analytics.totalPnl, settings.baseCurrency),
      description: `${analytics.winningTrades} ganadoras, ${analytics.losingTrades} perdedoras`,
      className: analytics.totalPnl >= 0 ? 'text-profit' : 'text-loss',
    },
    {
      title: 'Total de Operaciones',
      value: analytics.totalTrades.toString(),
      description: 'Posiciones cerradas',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Análisis</h1>
          <p className="text-muted-foreground mt-1">
            Métricas de rendimiento en tiempo real e insights de tus operaciones
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <SkeletonChart />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold">Análisis</h1>
        <p className="text-muted-foreground mt-1">
          Métricas de rendimiento en tiempo real e insights de tus operaciones
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 landscape:md:grid-cols-4"
        variants={containerVariants}
      >
        {statCards.map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.className || ''}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Gráfico de Equity con Drawdowns */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Curva de Equity con Drawdowns</CardTitle>
              <div className="flex items-center gap-4">
                {maxDrawdown.maxDrawdown > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-destructive">
                      Drawdown Máximo: {formatCurrency(maxDrawdown.maxDrawdown, settings.baseCurrency)} ({maxDrawdown.maxDrawdownPercent.toFixed(2)}%)
                    </span>
                  </div>
                )}
                <ChartExportButton chartId="equity-chart" filename="curva_equity" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {equityCurve.length > 0 ? (
              <motion.div
                id="equity-chart"
                variants={chartVariants}
                initial="hidden"
                animate={chartLoaded ? 'visible' : 'hidden'}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart 
                    data={equityCurve} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                      }}
                      style={{ fontSize: '11px' }}
                      interval={equityCurve.length > 10 ? 'preserveStartEnd' : 0}
                    />
                    <YAxis
                      yAxisId="equity"
                      tickFormatter={(value) => {
                        // Formato más compacto y legible
                        if (Math.abs(value) >= 1000000) {
                          return `${(value / 1000000).toFixed(1)}M`;
                        }
                        if (Math.abs(value) >= 1000) {
                          return `${(value / 1000).toFixed(1)}K`;
                        }
                        // Para valores pequeños, mostrar con 2 decimales
                        return value.toFixed(2);
                      }}
                      style={{ fontSize: '11px' }}
                      domain={['dataMin - 5%', 'dataMax + 5%']}
                      allowDataOverflow={false}
                      label={{ value: 'Equity', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
                              <p className="font-semibold">{new Date(label).toLocaleDateString('es-ES')}</p>
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="text-muted-foreground">Equity: </span>
                                  <span className="font-medium">{formatCurrency(data.equity, settings.baseCurrency)}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">PnL Acumulado: </span>
                                  <span className={`font-medium ${data.cumulativePnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {formatCurrency(data.cumulativePnl, settings.baseCurrency)}
                                  </span>
                                </p>
                                {data.drawdown > 0 && (
                                  <p>
                                    <span className="text-muted-foreground">Drawdown: </span>
                                    <span className="font-medium text-destructive">
                                      {formatCurrency(data.drawdown, settings.baseCurrency)} ({data.drawdownPercent.toFixed(2)}%)
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Área de equity (relleno suave) */}
                    <Area
                      yAxisId="equity"
                      type="monotone"
                      dataKey="equity"
                      fill="hsl(var(--primary) / 0.1)"
                      stroke="none"
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                    {/* Línea de equity (principal) */}
                    <Line
                      yAxisId="equity"
                      type="monotone"
                      dataKey="equity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ r: equityCurve.length <= 15 ? 5 : 0, fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 7, stroke: 'hsl(var(--primary))', strokeWidth: 2, fill: '#fff' }}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      name="Equity"
                    />
                    {/* Línea de peak (máximo histórico) - solo si hay drawdown */}
                    {equityCurve.some(p => p.drawdown > 0) && (
                      <Line
                        yAxisId="equity"
                        type="monotone"
                        dataKey="peak"
                        stroke="hsl(var(--primary) / 0.4)"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Peak"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                <p>Agrega y cierra operaciones para ver tu curva de equity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Gráfico de Distribución de PnL */}
      {pnlDistribution.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Distribución de PnL</CardTitle>
                <ChartExportButton chartId="pnl-distribution-chart" filename="distribucion_pnl" />
              </div>
            </CardHeader>
            <CardContent>
              <motion.div
                id="pnl-distribution-chart"
                variants={chartVariants}
                initial="hidden"
                animate={chartLoaded ? 'visible' : 'hidden'}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pnlDistribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="range"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis
                      label={{ value: 'Cantidad de Operaciones', angle: -90, position: 'insideLeft' }}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-semibold mb-2">{data.range}</p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Operaciones: </span>
                                <span className="font-medium">{data.count}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      animationDuration={1000}
                    >
                      {pnlDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pnl >= 0 ? 'hsl(var(--profit-color))' : 'hsl(var(--loss-color))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Heatmap de Rendimiento */}
      <motion.div variants={itemVariants}>
        <PerformanceHeatmap trades={trades} baseCurrency={settings.baseCurrency} />
      </motion.div>

      {/* Análisis Temporal */}
      <motion.div variants={itemVariants}>
        <TemporalAnalysis trades={trades} baseCurrency={settings.baseCurrency} />
      </motion.div>
    </motion.div>
  );
};

