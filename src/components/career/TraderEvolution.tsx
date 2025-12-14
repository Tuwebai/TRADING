import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { type TraderEvolution } from '@/lib/traderEvolution';
import { AlertCircle, TrendingUp, Target, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TraderEvolutionProps {
  evolution: TraderEvolution;
}

export const TraderEvolutionCard: React.FC<TraderEvolutionProps> = ({ evolution }) => {
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/50';
      case 2:
        return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/50';
      case 3:
        return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/50';
      case 4:
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/50';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/50';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'exploration':
        return 'text-blue-600 dark:text-blue-400';
      case 'consolidation':
        return 'text-purple-600 dark:text-purple-400';
      case 'consistency':
        return 'text-green-600 dark:text-green-400';
      case 'optimization':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const ProgressBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground font-semibold">{Math.round(value)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Nivel y Fase Principal */}
      <Card className={cn('border-2', getLevelColor(evolution.level))}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tu Evolución como Trader</span>
            <span className="text-2xl font-bold">Nivel {evolution.level}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Nivel Actual</p>
            <p className="text-xl font-bold">{evolution.levelName}</p>
          </div>
          
          <div className="pt-3 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Fase de Desarrollo</p>
            <p className={cn('text-lg font-semibold', getPhaseColor(evolution.phase))}>
              {evolution.phaseName}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cuello de Botella */}
      {evolution.bottleneck && (
        <Card className="border-2 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                  Cuello de Botella Actual
                </h3>
                <p className="text-sm text-foreground font-medium">
                  {evolution.bottleneck}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Este es el área que más está limitando tu progreso. Enfócate en mejorarlo para avanzar al siguiente nivel.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas de Progreso */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Progreso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar
            label="Control de Drawdown"
            value={evolution.progress.drawdownControl}
            icon={Shield}
          />
          <ProgressBar
            label="Meses Verdes"
            value={evolution.progress.greenMonths}
            icon={TrendingUp}
          />
          <ProgressBar
            label="Consistencia Operativa"
            value={evolution.progress.operationalConsistency}
            icon={Target}
          />
          <ProgressBar
            label="Respeto de Reglas de Riesgo"
            value={evolution.progress.riskRespect}
            icon={Shield}
          />
        </CardContent>
      </Card>

      {/* Estadísticas Detalladas */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas Detalladas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Meses Totales</p>
              <p className="text-lg font-semibold">{evolution.metrics.totalMonths}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Meses Verdes</p>
              <p className="text-lg font-semibold text-profit">{evolution.metrics.greenMonths}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Drawdown Actual</p>
              <p className="text-lg font-semibold text-loss">
                {evolution.metrics.currentDrawdownPercent.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Drawdown Máximo</p>
              <p className="text-lg font-semibold text-loss">
                {evolution.metrics.maxDrawdownPercent.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Win Rate</p>
              <p className="text-lg font-semibold">{evolution.metrics.winRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">R Promedio</p>
              <p className="text-lg font-semibold">{evolution.metrics.avgR.toFixed(2)}R</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

