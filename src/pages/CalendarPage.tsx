import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCalendarStore } from '@/store/calendarStore';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { WeekdayChart } from '@/components/calendar/WeekdayChart';
import { getBestDay, getWorstDay } from '@/lib/calendarStats';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export const CalendarPage = () => {
  const { trades, loadTrades, isLoading } = useTradeStore();
  const { settings, loadSettings } = useSettingsStore();
  const { selectedYear, selectedMonth, nextMonth, prevMonth, goToToday } = useCalendarStore();
  
  useEffect(() => {
    loadTrades();
    loadSettings();
  }, [loadTrades, loadSettings]);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const bestDay = getBestDay(trades, selectedYear, selectedMonth);
  const worstDay = getWorstDay(trades, selectedYear, selectedMonth);
  
  const handleDayClick = (day: any) => {
    // Could open a modal with day details
    console.log('Day clicked:', day);
  };
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario de Trading</h1>
          <p className="text-muted-foreground mt-1">
            Visualiza tu actividad y rendimiento por día
          </p>
        </div>
        <Button onClick={goToToday} variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Hoy
        </Button>
      </div>
      
      {/* Month Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {monthNames[selectedMonth]} {selectedYear}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={prevMonth} variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={nextMonth} variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <CalendarGrid
              year={selectedYear}
              month={selectedMonth}
              trades={trades}
              baseCurrency={settings.baseCurrency}
              onDayClick={handleDayClick}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Best/Worst Day Panel */}
      <div className={`grid gap-4 ${bestDay && worstDay ? 'grid-cols-1 md:grid-cols-3' : bestDay || worstDay ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {bestDay && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-lg text-green-600 dark:text-green-400">
                Mejor Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(bestDay.totalPnl, settings.baseCurrency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Fecha: {new Date(bestDay.date).toLocaleDateString('es-ES')}</p>
                  <p>Operaciones: {bestDay.tradeCount}</p>
                  <p>Ganadoras: {bestDay.winCount} | Perdedoras: {bestDay.lossCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {worstDay && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-lg text-red-600 dark:text-red-400">
                Peor Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(worstDay.totalPnl, settings.baseCurrency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Fecha: {new Date(worstDay.date).toLocaleDateString('es-ES')}</p>
                  <p>Operaciones: {worstDay.tradeCount}</p>
                  <p>Ganadoras: {worstDay.winCount} | Perdedoras: {worstDay.lossCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Días con operaciones: {(() => {
                  const monthTrades = trades.filter(t => {
                    if (t.status !== 'closed' || !t.exitDate) return false;
                    const date = new Date(t.exitDate);
                    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
                  });
                  const daySet = new Set(monthTrades.map(t => {
                    const date = new Date(t.exitDate!);
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  }));
                  return daySet.size;
                })()}
              </p>
              <p className="text-muted-foreground">
                Total de operaciones: {trades.filter(t => {
                  if (t.status !== 'closed' || !t.exitDate) return false;
                  const date = new Date(t.exitDate);
                  return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Weekly Distribution Chart */}
      <WeekdayChart trades={trades} baseCurrency={settings.baseCurrency} />
    </motion.div>
  );
};

