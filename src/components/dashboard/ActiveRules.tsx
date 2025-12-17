import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { Trade, Settings, TradingRules } from '@/types/Trading';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveRulesProps {
  trades: Trade[];
  settings: Settings;
}

export const ActiveRules: React.FC<ActiveRulesProps> = ({ trades, settings }) => {
  const rules: TradingRules | undefined = settings.advanced?.tradingRules;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Trades hoy
  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    tradeDate.setHours(0, 0, 0, 0);
    return tradeDate.getTime() === today.getTime();
  });

  // Trades esta semana
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Domingo
  const weekTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    return tradeDate >= weekStart;
  });

  const activeRules: Array<{
    label: string;
    current: number;
    limit: number;
    violated: boolean;
  }> = [];

  // Máximo de trades diarios
  if (rules?.maxTradesPerDay) {
    activeRules.push({
      label: `Máx ${rules.maxTradesPerDay} trades diarios`,
      current: todayTrades.length,
      limit: rules.maxTradesPerDay,
      violated: todayTrades.length >= rules.maxTradesPerDay,
    });
  }

  // Máximo de trades semanales
  if (rules?.maxTradesPerWeek) {
    activeRules.push({
      label: `Máx ${rules.maxTradesPerWeek} trades semanales`,
      current: weekTrades.length,
      limit: rules.maxTradesPerWeek,
      violated: weekTrades.length >= rules.maxTradesPerWeek,
    });
  }

  // Límite de pérdida diaria
  const todayClosedTrades = todayTrades.filter(t => t.status === 'closed' && t.exitDate);
  const todayPnL = todayClosedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const currentCapital = settings.currentCapital || settings.accountSize;
  const dailyLossPercent = currentCapital > 0 ? (Math.abs(Math.min(0, todayPnL)) / currentCapital) * 100 : 0;
  
  if (rules?.dailyLossLimit) {
    activeRules.push({
      label: `Límite pérdida diaria: ${rules.dailyLossLimit}%`,
      current: dailyLossPercent,
      limit: rules.dailyLossLimit,
      violated: dailyLossPercent >= rules.dailyLossLimit,
    });
  }

  // Objetivo de ganancia diaria
  if (rules?.dailyProfitTarget) {
    activeRules.push({
      label: `Objetivo ganancia diaria: ${rules.dailyProfitTarget}%`,
      current: currentCapital > 0 ? (Math.max(0, todayPnL) / currentCapital) * 100 : 0,
      limit: rules.dailyProfitTarget,
      violated: false, // No es una violación, es un objetivo
    });
  }

  if (activeRules.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Reglas Activas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeRules.map((rule, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                rule.violated
                  ? 'border-red-500/50 bg-red-500/10'
                  : 'border-border bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2 flex-1">
                {rule.violated ? (
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">{rule.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-sm font-bold',
                  rule.violated ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                )}>
                  {rule.current.toFixed(rule.label.includes('%') ? 2 : 0)} / {rule.limit.toFixed(rule.label.includes('%') ? 2 : 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

