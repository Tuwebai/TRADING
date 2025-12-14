import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Trade } from '@/types/Trading';
import { calculateAnalytics } from '@/lib/calculations';
import { calculateHistoricalAvgTradesPerDay } from '@/lib/proactiveInsights';
import { cn } from '@/lib/utils';

interface TradeContextualInsightsProps {
  trades: Trade[];
}

export interface ContextualInsight {
  id: string;
  severity: 'critical' | 'important' | 'positive';
  title: string;
  whatHappened: string;
  whyHappened: string;
  whatToDoNext: string;
}

export const TradeContextualInsights: React.FC<TradeContextualInsightsProps> = ({ trades }) => {
  if (trades.length < 5) {
    return null; // Need at least 5 trades for meaningful insights
  }

  const insights: ContextualInsight[] = [];
  const closedTrades = trades.filter(t => t.status === 'closed');
  const analytics = calculateAnalytics(closedTrades);

  // Insight 1: Overtrading detection
  const historicalAvg = calculateHistoricalAvgTradesPerDay(closedTrades);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    return tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear;
  });
  const monthDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthAvg = monthTrades.length / monthDays;

  if (monthAvg > historicalAvg * 1.5 && historicalAvg > 0) {
    // Check if overtrading happens after losses
    const sortedTrades = [...closedTrades].sort((a, b) => 
      new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
    );
    
    let tradesAfterLoss = 0;
    let totalLosses = 0;
    
    for (let i = 1; i < sortedTrades.length; i++) {
      const prevTrade = sortedTrades[i - 1];
      const currentTrade = sortedTrades[i];
      
      if ((prevTrade.pnl || 0) < 0) {
        totalLosses++;
        const prevExit = new Date(prevTrade.exitDate || prevTrade.entryDate);
        const currentEntry = new Date(currentTrade.entryDate);
        const hoursDiff = (currentEntry.getTime() - prevExit.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff <= 4) {
          tradesAfterLoss++;
        }
      }
    }

    const percentageAfterLoss = totalLosses > 0 ? (tradesAfterLoss / totalLosses) * 100 : 0;

    if (percentageAfterLoss > 50) {
      insights.push({
        id: 'overtrading-after-losses',
        severity: 'critical',
        title: 'Overtrading Detectado',
        whatHappened: `Promedio ${monthAvg.toFixed(1)} trades/día, mayormente después de pérdidas`,
        whyHappened: `El ${percentageAfterLoss.toFixed(0)}% de tus operaciones ocurren dentro de 4 horas después de una pérdida`,
        whatToDoNext: 'Sugerencia: implementar regla de bloqueo de 30 minutos post-pérdida',
      });
    }
  }

  // Insight 2: Low efficiency setup
  const setupStats = new Map<string, { trades: Trade[]; wins: number }>();
  closedTrades.forEach(trade => {
    if (trade.setupId) {
      if (!setupStats.has(trade.setupId)) {
        setupStats.set(trade.setupId, { trades: [], wins: 0 });
      }
      const stats = setupStats.get(trade.setupId)!;
      stats.trades.push(trade);
      if ((trade.pnl || 0) > 0) {
        stats.wins++;
      }
    }
  });

  for (const [setupId, stats] of setupStats.entries()) {
    if (stats.trades.length >= 5) {
      const winRate = (stats.wins / stats.trades.length) * 100;
      if (winRate < 40) {
        const setupName = stats.trades[0].setupId || 'Setup';
        insights.push({
          id: `low-efficiency-setup-${setupId}`,
          severity: 'important',
          title: 'Baja Eficiencia de Setup',
          whatHappened: `Setup "${setupName}" tiene winrate < 40% (${winRate.toFixed(1)}%)`,
          whyHappened: `${stats.wins} ganadores de ${stats.trades.length} operaciones`,
          whatToDoNext: 'Sugerencia: reducir frecuencia o refinar condiciones de entrada',
        });
        break; // Only show one setup insight
      }
    }
  }

  // Insight 3: Rule violations pattern
  const tradesWithViolations = closedTrades.filter(t => 
    t.violatedRules && t.violatedRules.length > 0
  );
  const violationRate = (tradesWithViolations.length / closedTrades.length) * 100;

  if (violationRate > 30 && closedTrades.length >= 10) {
    const criticalViolations = tradesWithViolations.filter(t =>
      t.violatedRules?.some(v => v.severity === 'critical')
    );
    
    if (criticalViolations.length > 0) {
      insights.push({
        id: 'rule-violations-pattern',
        severity: 'critical',
        title: 'Patrón de Violaciones de Reglas',
        whatHappened: `${violationRate.toFixed(0)}% de trades violan reglas (${criticalViolations.length} críticas)`,
        whyHappened: 'Frecuentes violaciones de reglas activas',
        whatToDoNext: 'Sugerencia: revisar y ajustar reglas o mejorar disciplina de ejecución',
      });
    }
  }

  // Insight 4: Positive - High R/R consistency
  if (closedTrades.length >= 10) {
    const highRRTrades = closedTrades.filter(t => 
      t.riskReward !== null && t.riskReward >= 2
    );
    const highRRRate = (highRRTrades.length / closedTrades.length) * 100;

    if (highRRRate >= 50 && insights.length < 3) {
      insights.push({
        id: 'high-rr-consistency',
        severity: 'positive',
        title: 'Consistencia en R/R Alto',
        whatHappened: `${highRRRate.toFixed(0)}% de trades tienen R/R ≥ 2.0`,
        whyHappened: 'Mantienes buen ratio risk/reward en la mayoría de operaciones',
        whatToDoNext: 'Sugerencia: mantener este enfoque y considerar aumentar tamaño gradualmente',
      });
    }
  }

  // Limit to 3 insights, prioritize critical > important > positive
  const sortedInsights = insights.sort((a, b) => {
    const priority = { critical: 0, important: 1, positive: 2 };
    return priority[a.severity] - priority[b.severity];
  }).slice(0, 3);

  if (sortedInsights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights para el Período Seleccionado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedInsights.map((insight) => {
            const getConfig = () => {
              switch (insight.severity) {
                case 'critical':
                  return {
                    icon: AlertCircle,
                    iconColor: 'text-red-500',
                    borderColor: 'border-red-500/50',
                    bgColor: 'bg-red-500/10',
                    badge: '🔴',
                  };
                case 'important':
                  return {
                    icon: AlertTriangle,
                    iconColor: 'text-yellow-500',
                    borderColor: 'border-yellow-500/50',
                    bgColor: 'bg-yellow-500/10',
                    badge: '🟡',
                  };
                case 'positive':
                  return {
                    icon: CheckCircle2,
                    iconColor: 'text-green-500',
                    borderColor: 'border-green-500/50',
                    bgColor: 'bg-green-500/10',
                    badge: '🟢',
                  };
              }
            };

            const config = getConfig();
            const Icon = config.icon;

            return (
              <div
                key={insight.id}
                className={cn('p-4 rounded-lg border-2', config.borderColor, config.bgColor)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-lg">{config.badge}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-2">{insight.title}</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">Qué pasó</p>
                        <p className="text-muted-foreground">{insight.whatHappened}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Por qué pasó</p>
                        <p className="text-muted-foreground">{insight.whyHappened}</p>
                      </div>
                      <div className="pt-2 border-t border-current/20">
                        <p className="font-medium text-foreground">Qué hacer ahora</p>
                        <p className="text-muted-foreground">→ {insight.whatToDoNext}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

