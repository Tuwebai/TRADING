import { useEffect } from 'react';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getAllInsights } from '@/lib/insights';
import { InsightCard } from '@/components/insights/InsightCard';
import { TopAssets } from '@/components/insights/TopAssets';
import { TimingHeatmap } from '@/components/insights/TimingHeatmap';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export const InsightsPage = () => {
  const { trades, loadTrades, isLoading } = useTradeStore();
  const { settings, loadSettings } = useSettingsStore();
  
  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);
  
  const initialCapital = (settings.currentCapital && settings.currentCapital > 0) 
    ? settings.currentCapital 
    : (settings.initialCapital && settings.initialCapital > 0)
    ? settings.initialCapital
    : settings.accountSize;
  
  const insights = getAllInsights(trades, initialCapital);
  
  // Group insights by type
  const positiveInsights = insights.filter(i => i.type === 'positive');
  const negativeInsights = insights.filter(i => i.type === 'negative');
  const warningInsights = insights.filter(i => i.type === 'warning');
  const neutralInsights = insights.filter(i => i.type === 'neutral');
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-yellow-500/10">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Motor de Insights</h1>
          <p className="text-muted-foreground mt-1">
            Análisis automático de tus operaciones
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          Cargando...
        </div>
      ) : (
        <>
          {/* All Insights Grid */}
          {insights.length > 0 ? (
            <div className="space-y-6">
              {positiveInsights.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                    Insights Positivos
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {positiveInsights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </div>
              )}
              
              {warningInsights.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-yellow-600 dark:text-yellow-400">
                    Advertencias
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warningInsights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </div>
              )}
              
              {negativeInsights.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">
                    Áreas de Mejora
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {negativeInsights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </div>
              )}
              
              {neutralInsights.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Información</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {neutralInsights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
                No hay suficientes operaciones para generar insights. Agrega más operaciones cerradas.
              </CardContent>
            </Card>
          )}
          
          {/* Top Assets */}
          <TopAssets trades={trades} baseCurrency={settings.baseCurrency} />
          
          {/* Timing Heatmap */}
          <TimingHeatmap trades={trades} baseCurrency={settings.baseCurrency} />
        </>
      )}
    </motion.div>
  );
};

