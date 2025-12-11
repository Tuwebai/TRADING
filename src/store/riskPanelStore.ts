/**
 * Risk Panel store using Zustand
 * Manages risk panel collapsed/expanded state with persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RiskPanelStore {
  isOpen: boolean;
  
  // Actions
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useRiskPanelStore = create<RiskPanelStore>()(
  persist(
    (set) => ({
      isOpen: false, // Default to collapsed
      
      toggle: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },
      
      open: () => {
        set({ isOpen: true });
      },
      
      close: () => {
        set({ isOpen: false });
      },
    }),
    {
      name: 'risk-panel-storage',
    }
  )
);

