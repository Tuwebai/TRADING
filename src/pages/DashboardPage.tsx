import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateAnalytics } from '@/lib/calculations';
import { formatPrice, formatCurrency, formatPercentage } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { SkeletonStatCard } from '@/components/ui/Skeleton';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';

export const DashboardPage = () => {
  const { trades, loadTrades, isLoading } = useTradeStore();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);

  const analytics = calculateAnalytics(trades);
  const openTrades = trades.filter(t => t.status === 'open');
  const recentTrades = trades
    .filter(t => t.status === 'closed')
    .sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime())
    .slice(0, 5);

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
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const overviewCards = [
    {
      title: 'PnL Total',
      value: formatCurrency(analytics.totalPnl, settings.baseCurrency),
      change: analytics.totalPnl >= 0 ? 'positive' : 'negative',
      icon: analytics.totalPnl >= 0 ? TrendingUp : TrendingDown,
    },
    {
      title: 'Tasa de Éxito',
      value: formatPercentage(analytics.winRate),
      description: `${analytics.winningTrades}G / ${analytics.losingTrades}P`,
      icon: Activity,
    },
    {
      title: 'Posiciones Abiertas',
      value: openTrades.length.toString(),
      description: 'Operaciones activas',
      icon: Activity,
    },
    {
      title: 'Factor de Beneficio',
      value: analytics.profitFactor === Infinity ? '∞' : analytics.profitFactor.toFixed(2),
      description: 'Ganancia bruta / Pérdida bruta',
      icon: TrendingUp,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Panel</h1>
            <p className="text-muted-foreground mt-1">
              Resumen de tu rendimiento en trading
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
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
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-3xl font-bold">Panel</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de tu rendimiento en trading
          </p>
        </div>
        <Link to="/trades">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Operación
          </Button>
        </Link>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 landscape:md:grid-cols-4"
        variants={containerVariants}
      >
        {overviewCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div key={index} variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    card.change === 'positive' ? 'text-profit' : 
                    card.change === 'negative' ? 'text-loss' : ''
                  }`}>
                    {card.value}
                  </div>
                  {card.description && (
                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Dashboard Insights */}
      <motion.div variants={itemVariants}>
        <DashboardInsights trades={trades} />
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6 landscape:md:grid-cols-2" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Posiciones Abiertas</CardTitle>
            </CardHeader>
            <CardContent>
              {openTrades.length > 0 ? (
                <div className="space-y-2">
                  {openTrades.slice(0, 5).map((trade, idx) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{trade.asset}</p>
                      <p className="text-sm text-muted-foreground">
                        {trade.positionType.toUpperCase()} @ {formatPrice(trade.entryPrice)}
                      </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Tamaño: {trade.positionSize}</p>
                        {trade.riskReward && (
                          <p className="text-xs text-muted-foreground">R/R: {trade.riskReward.toFixed(2)}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {openTrades.length > 5 && (
                    <Link to="/trades">
                      <Button variant="outline" className="w-full mt-2">
                        Ver Todas ({openTrades.length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No hay posiciones abiertas
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Operaciones Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades.length > 0 ? (
                <div className="space-y-2">
                  {recentTrades.map((trade, idx) => {
                    const pnl = trade.pnl || 0;
                    return (
                      <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{trade.asset}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(trade.exitDate || trade.entryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`text-right font-medium ${
                          pnl >= 0 ? 'text-profit' : 'text-loss'
                        }`}>
                          {formatCurrency(pnl, settings.baseCurrency)}
                        </div>
                      </motion.div>
                    );
                  })}
                  <Link to="/trades">
                    <Button variant="outline" className="w-full mt-2">
                      Ver Todas las Operaciones
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Aún no hay operaciones cerradas
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

