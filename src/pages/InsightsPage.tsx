import { useEffect } from 'react';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getPriorityInsights } from '@/lib/proactiveInsights';
import { ProactiveInsightCard } from '@/components/insights/ProactiveInsightCard';
import { TopAssets } from '@/components/insights/TopAssets';
import { TimingHeatmap } from '@/components/insights/TimingHeatmap';
import { motion } from 'framer-motion';
import { Brain, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useGoalsStore } from '@/store/goalsStore';

export const InsightsPage = () => {
  const { trades, loadTrades, isLoading } = useTradeStore();
  const { settings, loadSettings } = useSettingsStore();
  const { goals, loadGoals } = useGoalsStore();
  
  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);
  
  const priorityInsights = getPriorityInsights(trades, settings);
  const hasCriticalInsights = priorityInsights.some(i => i.severity === 'critical');
  const closedTradesCount = trades.filter(t => t.status === 'closed').length;
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Insights Proactivos</h1>
          <p className="text-muted-foreground mt-1">
            Análisis inteligente y accionable de tu trading
          </p>
        </div>
      </div>

      {hasCriticalInsights && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-1">
              Atención Requerida
            </h3>
            <p className="text-sm text-muted-foreground">
              Tienes insights críticos que requieren acción inmediata. Revisa los insights a continuación.
            </p>
          </div>
        </motion.div>
      )}
      
      {isLoading ? (
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          Cargando...
        </div>
      ) : (
        <>
          {/* Priority Insights - Máximo 3 */}
          {closedTradesCount < 5 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
                <div>
                  <p className="mb-2">No hay suficientes operaciones para generar insights.</p>
                  <p className="text-sm">Agrega al menos 5 operaciones cerradas para comenzar a recibir análisis proactivos.</p>
                </div>
              </CardContent>
            </Card>
          ) : priorityInsights.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Insights Prioritarios
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({priorityInsights.length} de {priorityInsights.length} mostrados)
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                {priorityInsights.map((insight) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProactiveInsightCard insight={insight} />
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
                <div>
                  <p className="mb-2">No se detectaron insights prioritarios en este momento.</p>
                  <p className="text-sm">Continúa operando con disciplina y revisa esta sección regularmente.</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Top Assets */}
          {closedTradesCount >= 5 && (
            <TopAssets trades={trades} baseCurrency={settings.baseCurrency} />
          )}
          
          {/* Timing Heatmap */}
          {closedTradesCount >= 5 && (
            <TimingHeatmap trades={trades} baseCurrency={settings.baseCurrency} />
          )}
        </>
      )}
    </motion.div>
  );
};

