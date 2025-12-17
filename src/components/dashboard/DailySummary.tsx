import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { Trade, Settings, EmotionType } from '@/types/Trading';
import { Calendar, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailySummaryProps {
  trades: Trade[];
  settings: Settings;
}

export const DailySummary: React.FC<DailySummaryProps> = ({ trades, settings }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Trades de hoy
  const todayTrades = trades.filter(t => {
    const tradeDate = new Date(t.entryDate);
    tradeDate.setHours(0, 0, 0, 0);
    return tradeDate.getTime() === today.getTime();
  });

  // Trades cerrados hoy
  const todayClosedTrades = todayTrades.filter(t => t.status === 'closed' && t.exitDate);

  // PnL de hoy (solo trades cerrados)
  const todayPnL = todayClosedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Riesgo utilizado hoy (aproximado)
  const currentCapital = settings.currentCapital || settings.accountSize;
  const todayRisk = todayClosedTrades.reduce((sum, t) => {
    const stopLoss = t.stopLoss || t.entryPrice;
    const priceDiff = Math.abs(t.entryPrice - stopLoss);
    const leverage = t.leverage || 1;
    const riskAmount = priceDiff * t.positionSize * leverage;
    return sum + (riskAmount / currentCapital) * 100;
  }, 0);

  // Estado emocional promedio (si existe) - busca en preTrade, duringTrade o postTrade
  const emotions = todayTrades
    .map(t => t.journal?.preTrade?.emotion || t.journal?.duringTrade?.emotion || t.journal?.postTrade?.emotion)
    .filter((emotion): emotion is EmotionType => emotion !== null && emotion !== undefined);
  
  const emotionCounts = emotions.reduce((acc, emotion) => {
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {} as Record<EmotionType, number>);

  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionType | undefined;

  const emotionLabels: Record<EmotionType, string> = {
    confiado: 'Confianza',
    ansioso: 'Ansiedad',
    temeroso: 'Temor',
    emocionado: 'Emoción',
    neutral: 'Neutral',
    frustrado: 'Frustración',
    euforico: 'Euforia',
    deprimido: 'Depresión',
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Resumen de Hoy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Trades Hoy</p>
            <p className="text-2xl font-bold">{todayTrades.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {todayClosedTrades.length} cerrados
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">PnL Hoy</p>
            <p className={cn(
              'text-2xl font-bold',
              todayPnL >= 0 ? 'text-profit' : 'text-loss'
            )}>
              {formatCurrency(todayPnL, settings.baseCurrency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {todayClosedTrades.length > 0 ? `${todayClosedTrades.length} operaciones` : 'Sin operaciones cerradas'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Riesgo Utilizado</p>
            <p className={cn(
              'text-2xl font-bold',
              todayRisk > (settings.riskPerTrade * 2) ? 'text-loss' : 'text-foreground'
            )}>
              {todayRisk.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Límite: {settings.riskPerTrade}%
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Estado Emocional</p>
            {dominantEmotion ? (
              <>
                <div className="flex items-center gap-2">
                  <Smile className="h-5 w-5" />
                  <p className="text-lg font-semibold">
                    {dominantEmotion ? emotionLabels[dominantEmotion] || dominantEmotion : 'Sin datos'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dominantEmotion ? emotionCounts[dominantEmotion] : 0} de {todayTrades.length} trades
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

