import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useGoalsStore } from '@/store/goalsStore';
import { calculateAnalytics, generateEquityCurve, calculateMaxDrawdown } from '@/lib/calculations';
import { formatPrice, formatCurrency, formatPercentage } from '@/lib/utils';
import { getRiskMetrics } from '@/lib/risk';
import { calculateTradingStatus } from '@/lib/tradingStatus';
import { TradingStatusBar } from '@/components/dashboard/TradingStatusBar';
import { DailySummary } from '@/components/dashboard/DailySummary';
import { ActiveRules } from '@/components/dashboard/ActiveRules';
import { PriorityInsight } from '@/components/dashboard/PriorityInsight';
import { TradeDetailsPanel } from '@/components/trades/TradeDetailsPanel';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, Plus, Shield, AlertTriangle, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { SkeletonStatCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { compareWinRate, compareAveragePnL, compareProfitFactor } from '@/lib/metricComparisons';
import { shouldBlockTradingDueToGoals } from '@/lib/goalConstraints';
import type { Trade } from '@/types/Trading';

export const DashboardPage = () => {
  const { trades, loadTrades, isLoading, deleteTrade, duplicateTrade } = useTradeStore();
  const { settings, loadSettings } = useSettingsStore();
  const { goals, loadGoals, getPrimaryGoal } = useGoalsStore();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    loadTrades();
    loadSettings();
    loadGoals();
  }, [loadTrades, loadSettings, loadGoals]);

  // Get primary goal and check if trading should be blocked
  const primaryGoal = useMemo(() => getPrimaryGoal(), [goals, getPrimaryGoal]);
  const goalBlocking = useMemo(() => shouldBlockTradingDueToGoals(goals, trades, settings), [goals, trades, settings]);

  const analytics = calculateAnalytics(trades);
  const openTrades = trades.filter(t => t.status === 'open');
  const recentTrades = trades
    .filter(t => t.status === 'closed')
    .sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime())
    .slice(0, 5);

  // Calcular estado de trading
  const tradingStatus = calculateTradingStatus(trades, settings);

  // Calcular métricas de riesgo
  const riskMetrics = getRiskMetrics(trades, settings);
  
  // Calcular drawdown
  const initialCapital = settings.currentCapital || settings.initialCapital || settings.accountSize;
  const equityCurve = generateEquityCurve(trades, initialCapital);
  const drawdown = calculateMaxDrawdown(equityCurve);
  const lastPoint = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1] : null;
  const currentDrawdownPercent = lastPoint && lastPoint.peak > 0
    ? ((lastPoint.peak - lastPoint.equity) / lastPoint.peak) * 100
    : 0;

  // Determinar si mostrar UI de supervivencia
  const isCriticalDrawdown = currentDrawdownPercent > 15 || drawdown.maxDrawdownPercent > 20;
  const showSurvivalMode = tradingStatus.status === 'pause-recommended' || isCriticalDrawdown;

  // Comparaciones históricas
  const winRateComparison = compareWinRate(trades);
  const pnlComparison = compareAveragePnL(trades);
  const profitFactorComparison = compareProfitFactor(trades);

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

  // Cards condicionales con contexto histórico
  const overviewCards = showSurvivalMode ? [
    {
      title: 'Drawdown Actual',
      value: `${currentDrawdownPercent.toFixed(2)}%`,
      change: 'negative' as const,
      icon: TrendingDown,
      critical: true,
      context: null,
    },
    {
      title: 'Capital Restante',
      value: formatCurrency(
        (settings.currentCapital || settings.accountSize) * (1 - currentDrawdownPercent / 100),
        settings.baseCurrency
      ),
      change: 'negative' as const,
      icon: Shield,
      critical: true,
      context: null,
    },
    {
      title: 'Riesgo por Trade',
      value: `${riskMetrics.averageRiskPerTrade.toFixed(2)}%`,
      change: riskMetrics.averageRiskPerTrade > riskMetrics.maxRiskAllowed ? 'negative' as const : 'neutral' as const,
      icon: AlertTriangle,
      critical: true,
      context: `Límite: ${riskMetrics.maxRiskAllowed}%`,
    },
    {
      title: 'Exposición Actual',
      value: `${riskMetrics.currentExposurePercent.toFixed(1)}%`,
      change: riskMetrics.currentExposurePercent > 50 ? 'negative' as const : 'neutral' as const,
      icon: Shield,
      critical: true,
      context: 'Límite recomendado: 50%',
    },
  ] : [
    {
      title: 'PnL Total',
      value: formatCurrency(analytics.totalPnl, settings.baseCurrency),
      change: analytics.totalPnl >= 0 ? 'positive' as const : 'negative' as const,
      icon: analytics.totalPnl >= 0 ? TrendingUp : TrendingDown,
      critical: false,
      context: pnlComparison.historical !== null
        ? `Promedio histórico: ${formatCurrency(pnlComparison.historical, settings.baseCurrency)}`
        : pnlComparison.reliabilityMessage || null,
    },
    {
      title: 'Tasa de Éxito',
      value: formatPercentage(analytics.winRate),
      description: `${analytics.winningTrades}G / ${analytics.losingTrades}P`,
      icon: Activity,
      critical: false,
      context: winRateComparison.historical !== null
        ? `Promedio histórico: ${formatPercentage(winRateComparison.historical)}`
        : winRateComparison.reliabilityMessage || null,
    },
    {
      title: 'Posiciones Abiertas',
      value: openTrades.length.toString(),
      description: 'Operaciones activas',
      icon: Activity,
      critical: false,
      context: null,
    },
    {
      title: 'Factor de Beneficio',
      value: analytics.profitFactor === Infinity ? '∞' : analytics.profitFactor.toFixed(2),
      description: 'Ganancia bruta / Pérdida bruta',
      icon: TrendingUp,
      critical: false,
      context: profitFactorComparison.historical !== null && isFinite(profitFactorComparison.historical)
        ? `Promedio histórico: ${profitFactorComparison.historical.toFixed(2)}`
        : profitFactorComparison.reliabilityMessage || null,
    },
  ];

  const handleReduceRisk = () => {
    // Navegar a configuración de riesgo
    window.location.href = '/settings';
  };

  const handlePauseTrading = () => {
    // Aquí se podría implementar lógica para pausar trading
    alert('Considera pausar el trading por hoy. Revisa tus reglas de riesgo.');
  };

  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade);
  };

  const handleCloseTradeDetails = () => {
    setSelectedTrade(null);
  };

  const handleEditTrade = (trade: Trade) => {
    // Navegar a edición
    window.location.href = `/trades?edit=${trade.id}`;
  };

  const handleDeleteTrade = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta operación?')) {
      deleteTrade(id);
      if (selectedTrade?.id === id) {
        setSelectedTrade(null);
      }
    }
  };

  const handleDuplicateTrade = (id: string) => {
    duplicateTrade(id);
  };

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
    <>
      {/* Trading Status Bar */}
      <TradingStatusBar
        status={tradingStatus.status}
        mainReason={tradingStatus.mainReason}
        suggestedAction={tradingStatus.suggestedAction}
        onReduceRisk={handleReduceRisk}
        onPauseTrading={handlePauseTrading}
      />

      <motion.div
        className={cn('space-y-6 pt-4', showSurvivalMode && 'pb-4')}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="flex items-center justify-between" variants={itemVariants}>
          <div>
            <h1 className="text-3xl font-bold">
              {showSurvivalMode ? 'Modo Supervivencia' : 'Panel'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {showSurvivalMode
                ? 'Enfócate en proteger tu capital. Revisa tus posiciones.'
                : 'Resumen de tu rendimiento en trading'}
            </p>
          </div>
          <Link to="/trades">
            <Button variant={showSurvivalMode ? 'destructive' : 'default'}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Operación
            </Button>
          </Link>
        </motion.div>

        {/* Foco del Día - Primary Goal */}
        {primaryGoal && (
          <motion.div variants={itemVariants}>
            <Card className="border-2 border-primary bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary fill-primary" />
                  <CardTitle>Hoy tu única misión es:</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {primaryGoal.type === 'pnl' && 'PnL'}
                      {primaryGoal.type === 'winRate' && 'Tasa de Éxito'}
                      {primaryGoal.type === 'numTrades' && 'Número de Operaciones'}
                    </div>
                    <div className="text-2xl font-bold">
                      {primaryGoal.type === 'pnl' && formatCurrency(primaryGoal.current, settings.baseCurrency)}
                      {primaryGoal.type === 'winRate' && formatPercentage(primaryGoal.current)}
                      {primaryGoal.type === 'numTrades' && primaryGoal.current}
                      {' / '}
                      {primaryGoal.type === 'pnl' && formatCurrency(primaryGoal.target, settings.baseCurrency)}
                      {primaryGoal.type === 'winRate' && formatPercentage(primaryGoal.target)}
                      {primaryGoal.type === 'numTrades' && primaryGoal.target}
                    </div>
                  </div>
                  {goalBlocking.blocked && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                        <div className="text-sm text-destructive">
                          <div className="font-medium mb-1">Trading Bloqueado</div>
                          <div>{goalBlocking.message}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Resumen Diario - PRIORITARIO */}
        <motion.div variants={itemVariants}>
          <DailySummary trades={trades} settings={settings} />
        </motion.div>

        {/* Reglas Activas */}
        <motion.div variants={itemVariants}>
          <ActiveRules trades={trades} settings={settings} />
        </motion.div>

        {/* Cards de Métricas */}
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
                    <div className={cn(
                      'text-2xl font-bold',
                      card.critical && 'text-red-600 dark:text-red-400',
                      !card.critical && card.change === 'positive' && 'text-profit',
                      !card.critical && card.change === 'negative' && 'text-loss'
                    )}>
                      {card.value}
                    </div>
                    {(card as any).description && (
                      <p className="text-xs text-muted-foreground mt-1">{(card as any).description}</p>
                    )}
                    {card.context && (
                      <p className={cn(
                        'text-xs mt-1',
                        card.context.includes('poco confiable') || card.context.includes('Dato')
                          ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                          : 'text-muted-foreground'
                      )}>
                        {card.context}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Insight Principal */}
        {!showSurvivalMode && (
          <motion.div variants={itemVariants}>
            <PriorityInsight
              trades={trades}
              settings={settings}
              onApplyAction={(insightId, action) => {
                console.log('Aplicar acción:', insightId, action);
                // Aquí se podría implementar lógica para aplicar acciones
              }}
              onIgnore={(insightId) => {
                console.log('Ignorar insight:', insightId);
              }}
            />
          </motion.div>
        )}

        {/* Mensaje de supervivencia si hay riesgo crítico */}
        {showSurvivalMode && (
          <motion.div
            variants={itemVariants}
            className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-6"
          >
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-red-600 dark:text-red-400 mb-2">
                  Modo Supervivencia Activado
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Tu capital está en riesgo. Las métricas "bonitas" están ocultas para que te enfoques en lo esencial: proteger tu capital.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Revisa todas tus posiciones abiertas</li>
                  <li>Considera reducir tamaño de posición</li>
                  <li>No operes hasta que el riesgo vuelva a niveles seguros</li>
                  <li>Revisa tus reglas de riesgo en Configuración</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6 landscape:md:grid-cols-2" variants={containerVariants}>
          {/* Posiciones Abiertas - Comportamiento Inteligente */}
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
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleTradeClick(trade)}
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
                  <div className="space-y-3 py-4">
                    {tradingStatus.status === 'pause-recommended' ? (
                      <>
                        <p className="text-center text-muted-foreground font-medium">
                          Riesgo elevado: no abrir nuevas posiciones
                        </p>
                        <p className="text-xs text-center text-muted-foreground">
                          Espera a que el riesgo vuelva a niveles seguros antes de operar.
                        </p>
                      </>
                    ) : tradingStatus.status === 'risk-elevated' ? (
                      <>
                        <p className="text-center text-muted-foreground font-medium">
                          Buen momento para análisis
                        </p>
                        <p className="text-xs text-center text-muted-foreground">
                          Revisa tus reglas de riesgo antes de abrir nuevas posiciones.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-center text-muted-foreground font-medium">
                          No hay posiciones abiertas
                        </p>
                        <div className="space-y-2 mt-3">
                          <p className="text-xs font-semibold text-foreground">Checklist rápido:</p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            <li>¿Tienes un plan para hoy?</li>
                            <li>¿Revisaste noticias relevantes?</li>
                            <li>¿Tus reglas de riesgo están activas?</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Operaciones Recientes - Con Preview Detallado */}
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
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => handleTradeClick(trade)}
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

      {/* Drawer de Detalles de Trade */}
      {selectedTrade && (
        <TradeDetailsPanel
          trade={selectedTrade}
          onEdit={handleEditTrade}
          onDelete={handleDeleteTrade}
          onDuplicate={handleDuplicateTrade}
          onClose={handleCloseTradeDetails}
        />
      )}
    </>
  );
};
