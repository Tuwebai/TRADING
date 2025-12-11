/**
 * Calendar store using Zustand
 * Manages calendar view state (selected month/year)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CalendarStore {
  selectedYear: number;
  selectedMonth: number; // 0-11 (0 = January)
  
  // Actions
  setMonth: (year: number, month: number) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  goToToday: () => void;
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set) => ({
      selectedYear: new Date().getFullYear(),
      selectedMonth: new Date().getMonth(),
      
      setMonth: (year: number, month: number) => {
        set({ selectedYear: year, selectedMonth: month });
      },
      
      nextMonth: () => {
        set((state) => {
          if (state.selectedMonth === 11) {
            return { selectedYear: state.selectedYear + 1, selectedMonth: 0 };
          }
          return { selectedMonth: state.selectedMonth + 1 };
        });
      },
      
      prevMonth: () => {
        set((state) => {
          if (state.selectedMonth === 0) {
            return { selectedYear: state.selectedYear - 1, selectedMonth: 11 };
          }
          return { selectedMonth: state.selectedMonth - 1 };
        });
      },
      
      goToToday: () => {
        const now = new Date();
        set({ selectedYear: now.getFullYear(), selectedMonth: now.getMonth() });
      },
    }),
    {
      name: 'calendar-storage',
    }
  )
);

