import { useEffect } from 'react';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { CareerKPIs } from '@/components/career/CareerKPIs';
import { CareerTimeline } from '@/components/career/CareerTimeline';
import { ProgressBars } from '@/components/career/ProgressBars';
import { Achievements } from '@/components/career/Achievements';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

export const CareerPage = () => {
  const { trades, loadTrades, isLoading } = useTradeStore();
  const { settings, loadSettings } = useSettingsStore();
  
  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);
  
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
          <h1 className="text-3xl font-bold">Mi Perfil de Carrera</h1>
          <p className="text-muted-foreground mt-1">
            Estadísticas de largo plazo y progresión
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          Cargando...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <CareerKPIs trades={trades} baseCurrency={settings.baseCurrency} />
          
          {/* Career Timeline */}
          <CareerTimeline trades={trades} baseCurrency={settings.baseCurrency} />
          
          {/* Progress Bars and Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressBars trades={trades} />
            <Achievements trades={trades} />
          </div>
        </>
      )}
    </motion.div>
  );
};

