import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { calculateTradeCategories, getCategoryColor } from '@/lib/tradeCategories';
import type { Trade } from '@/types/Trading';
import { motion } from 'framer-motion';

interface TradeCategoryChartProps {
  trades: Trade[];
}

export const TradeCategoryChart: React.FC<TradeCategoryChartProps> = ({ trades }) => {
  const categoryData = useMemo(() => {
    return calculateTradeCategories(trades);
  }, [trades]);

  const totalTrades = trades.length;

  // Preparar datos para el gráfico
  const chartData = categoryData.map((item) => ({
    name: item.category,
    value: item.count,
    percentage: item.percentage,
    color: getCategoryColor(item.category),
  }));

  // Si no hay operaciones, mostrar mensaje
  if (totalTrades === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Operaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>Agrega operaciones para ver la distribución</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom label para mostrar el valor en el centro del donut
  const renderCustomLabel = ({ cx, cy }: { cx: number; cy: number }) => {
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-2xl font-bold fill-foreground"
      >
        {totalTrades}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Cantidad: <span className="font-medium text-foreground">{data.value}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Porcentaje: <span className="font-medium text-foreground">{data.payload.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Operaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total</p>
            </div>

            <div className="space-y-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {item.value} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

