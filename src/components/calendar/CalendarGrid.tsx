import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { getTotalPLPerDay, getMonthPLRange, type DayTradeData } from '@/lib/calendarStats';
import type { Trade } from '@/types/Trading';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  year: number;
  month: number;
  trades: Trade[];
  baseCurrency: string;
  onDayClick?: (day: DayTradeData | null) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  trades,
  baseCurrency,
  onDayClick,
}) => {
  const dayData = getTotalPLPerDay(trades, year, month);
  const range = getMonthPLRange(trades, year, month);
  const maxAbs = Math.max(Math.abs(range.max), Math.abs(range.min));
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const getDayData = (day: number): DayTradeData | null => {
    const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dayData.get(dayKey) || null;
  };
  
  const getCellColor = (pnl: number, hasTrades: boolean) => {
    if (!hasTrades) {
      return 'bg-muted/20 border-border/50';
    }
    
    if (pnl > 0) {
      const intensity = maxAbs > 0 ? Math.min(1, pnl / maxAbs) : 0;
      const opacity = 0.3 + (intensity * 0.5);
      return `bg-green-500/[${opacity}] border-green-500/50`;
    } else if (pnl < 0) {
      const intensity = maxAbs > 0 ? Math.min(1, Math.abs(pnl) / maxAbs) : 0;
      const opacity = 0.3 + (intensity * 0.5);
      return `bg-red-500/[${opacity}] border-red-500/50`;
    }
    
    return 'bg-muted/30 border-border/50';
  };
  
  const getBubbleSize = (pnl: number, hasTrades: boolean) => {
    if (!hasTrades || maxAbs === 0) return 0;
    const normalized = Math.abs(pnl) / maxAbs;
    return Math.max(20, Math.min(60, normalized * 60 + 20));
  };
  
  const renderDay = (day: number) => {
    const data = getDayData(day);
    const hasTrades = data !== null;
    const pnl = data?.totalPnl || 0;
    const bubbleSize = getBubbleSize(pnl, hasTrades);
    
    return (
      <button
        key={day}
        onClick={() => onDayClick?.(data)}
        className={cn(
          'relative h-20 w-full border rounded-md p-2 transition-all hover:scale-105',
          getCellColor(pnl, hasTrades),
          hasTrades && 'cursor-pointer'
        )}
        disabled={!hasTrades}
      >
        <div className="text-xs font-medium mb-1">{day}</div>
        {hasTrades && (
          <>
            <div className="text-[10px] font-semibold mb-1">
              {formatCurrency(pnl, baseCurrency)}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {data.tradeCount} ops
            </div>
            {bubbleSize > 0 && (
              <div
                className={cn(
                  'absolute bottom-1 right-1 rounded-full',
                  pnl > 0 ? 'bg-green-600' : 'bg-red-600'
                )}
                style={{
                  width: `${bubbleSize}px`,
                  height: `${bubbleSize}px`,
                  opacity: 0.6,
                }}
              />
            )}
          </>
        )}
      </button>
    );
  };
  
  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-20" />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          return renderDay(day);
        })}
      </div>
    </div>
  );
};

