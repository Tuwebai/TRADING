import React, { useEffect } from 'react';
import { useRiskPanelStore } from '@/store/riskPanelStore';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getRiskMetrics } from '@/lib/risk';
import { RiskPanelCollapsed } from './RiskPanelCollapsed';
import { RiskPanelExpanded } from './RiskPanelExpanded';
import { motion, AnimatePresence } from 'framer-motion';

export const RiskPanel: React.FC = () => {
  const { isOpen, open, close } = useRiskPanelStore();
  const { getTradesByMode, loadTrades } = useTradeStore();
  const trades = getTradesByMode(); // Get trades filtered by current mode
  const { settings, loadSettings } = useSettingsStore();
  
  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);
  
  const metrics = getRiskMetrics(trades, settings);
  
  // Update main content padding based on panel state
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      if (isOpen) {
        main.classList.remove('pr-[60px]');
        main.classList.add('pr-[320px]');
      } else {
        main.classList.remove('pr-[320px]');
        main.classList.add('pr-[60px]');
      }
    }
  }, [isOpen]);
  
  return (
    <div className="fixed right-0 top-0 h-screen z-40 pointer-events-none">
      <div className="h-full flex items-center pointer-events-auto">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="expanded"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <RiskPanelExpanded
                metrics={metrics}
                settings={settings}
                onCollapse={close}
              />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <RiskPanelCollapsed
                metrics={metrics}
                settings={settings}
                onExpand={open}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

