/**
 * Trading Mode Store
 * Manages the global trading mode (simulation, demo, live)
 * Single source of truth for trading mode across the entire app
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TradingMode = 'simulation' | 'demo' | 'live';

interface TradingModeState {
  mode: TradingMode;
  setMode: (mode: TradingMode, confirmed?: boolean) => void;
  getModeLabel: () => string;
  getModeColor: () => string;
  getModeBadge: () => { label: string; color: string; bgColor: string; borderColor: string };
}

const MODE_LABELS: Record<TradingMode, string> = {
  simulation: 'SIMULACIÓN',
  demo: 'DEMO',
  live: 'LIVE',
};

const MODE_COLORS: Record<TradingMode, string> = {
  simulation: 'blue',
  demo: 'yellow',
  live: 'red',
};

export const useTradingModeStore = create<TradingModeState>()(
  persist(
    (set, get) => ({
      mode: 'simulation', // Default mode

      setMode: (mode: TradingMode, confirmed = false) => {
        // Always set the mode (confirmation is handled by UI)
        set({ mode });
      },

      getModeLabel: () => {
        return MODE_LABELS[get().mode];
      },

      getModeColor: () => {
        return MODE_COLORS[get().mode];
      },

      getModeBadge: () => {
        const mode = get().mode;
        const labels = {
          simulation: { label: 'SIMULACIÓN', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
          demo: { label: 'DEMO', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
          live: { label: 'LIVE', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
        };
        return labels[mode];
      },
    }),
    {
      name: 'trading-mode-storage',
    }
  )
);

/**
 * Hook to get current trading mode
 */
export function useTradingMode() {
  const { mode, setMode, getModeLabel, getModeColor, getModeBadge } = useTradingModeStore();
  return {
    mode,
    setMode,
    getModeLabel,
    getModeColor,
    getModeBadge,
  };
}

