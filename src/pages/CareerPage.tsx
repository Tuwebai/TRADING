import { useEffect } from 'react';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateTraderEvolution } from '@/lib/traderEvolution';
import { TraderEvolutionCard } from '@/components/career/TraderEvolution';
import { CareerKPIs } from '@/components/career/CareerKPIs';
import { CareerTimeline } from '@/components/career/CareerTimeline';
import { Achievements } from '@/components/career/Achievements';
import { motion } from 'framer-motion';
import { User, AlertCircle } from 'lucide-react';

export const CareerPage = () => {
  const { getTradesByMode, loadTrades, isLoading } = useTradeStore();
  const trades = getTradesByMode(); // Get trades filtered by current mode
  const { settings, loadSettings } = useSettingsStore();
  
  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);
  
  const evolution = calculateTraderEvolution(trades, settings);
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
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Mi Carrera</h1>
          <p className="text-muted-foreground mt-1">
            Mapa de progreso y evolución como trader
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          Cargando...
        </div>
      ) : closedTradesCount < 5 ? (
        <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-2">
            No hay suficientes operaciones para calcular tu evolución.
          </p>
          <p className="text-sm text-muted-foreground">
            Agrega al menos 5 operaciones cerradas para comenzar a ver tu progreso.
          </p>
        </div>
      ) : (
        <>
          {/* Evolución del Trader - Principal */}
          <TraderEvolutionCard evolution={evolution} />
          
          {/* Mensaje de Fase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border-2 border-primary/50 rounded-lg p-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/20">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">
                  Estás en fase: {evolution.phaseName.toUpperCase()}
                </h3>
                {evolution.bottleneck ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Cuello de botella actual:</span>{' '}
                    {evolution.bottleneck}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Estás progresando bien en todas las áreas. Mantén la disciplina y continúa mejorando.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* KPIs */}
          <CareerKPIs trades={trades} baseCurrency={settings.baseCurrency} />
          
          {/* Career Timeline */}
          <CareerTimeline trades={trades} baseCurrency={settings.baseCurrency} />
          
          {/* Achievements */}
          <Achievements trades={trades} />
        </>
      )}
    </motion.div>
  );
};

