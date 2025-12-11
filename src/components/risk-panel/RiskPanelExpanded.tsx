import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { X, AlertTriangle, TrendingDown, DollarSign, Shield, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { RiskMetrics, RiskWarning } from '@/lib/risk';
import { getRiskWarnings, getRiskLevel } from '@/lib/risk';
import type { Settings } from '@/types/Trading';

interface RiskPanelExpandedProps {
  metrics: RiskMetrics;
  settings: Settings;
  onCollapse: () => void;
}

export const RiskPanelExpanded: React.FC<RiskPanelExpandedProps> = ({
  metrics,
  settings,
  onCollapse,
}) => {
  const warnings = getRiskWarnings(metrics, settings);
  const riskLevel = getRiskLevel(metrics, warnings);
  
  const getColorForValue = (value: number, thresholds: { warning: number; danger: number }, isPercent = true) => {
    const displayValue = isPercent ? value : value;
    if (displayValue >= thresholds.danger) return 'text-red-600 dark:text-red-400';
    if (displayValue >= thresholds.warning) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };
  
  const getWarningIcon = (severity: RiskWarning['severity']) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };
  
  return (
    <div className="w-[320px] h-full flex flex-col bg-card border-l border-t border-b rounded-l-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Shield className={cn(
            'h-5 w-5',
            riskLevel === 'danger' ? 'text-red-500' :
            riskLevel === 'warning' ? 'text-yellow-500' :
            'text-green-500'
          )} />
          <CardTitle className="text-lg">Panel de Riesgo</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapse}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Riesgo Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Riesgo Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Nivel:</span>
              <span className={cn(
                'text-sm font-semibold',
                riskLevel === 'danger' ? 'text-red-600 dark:text-red-400' :
                riskLevel === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              )}>
                {riskLevel === 'danger' ? 'Alto' : riskLevel === 'warning' ? 'Moderado' : 'Bajo'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Drawdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Drawdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Actual:</span>
              <span className={cn(
                'text-sm font-semibold',
                getColorForValue(metrics.currentDrawdownPercent, { warning: 10, danger: 20 })
              )}>
                {formatPercentage(metrics.currentDrawdownPercent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Máximo:</span>
              <span className={cn(
                'text-sm font-semibold',
                getColorForValue(metrics.maxDrawdownPercent, { warning: 10, danger: 20 })
              )}>
                {formatPercentage(metrics.maxDrawdownPercent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Monto:</span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(metrics.currentDrawdown, settings.baseCurrency)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Exposición */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Exposición
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Actual:</span>
              <span className={cn(
                'text-sm font-semibold',
                getColorForValue(metrics.currentExposurePercent, { warning: 30, danger: 50 })
              )}>
                {formatPercentage(metrics.currentExposurePercent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Monto:</span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(metrics.currentExposure, settings.baseCurrency)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Límites */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Límites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Riesgo por op:</span>
              <span className={cn(
                'text-sm font-semibold',
                metrics.averageRiskPerTrade > metrics.maxRiskAllowed
                  ? 'text-red-600 dark:text-red-400'
                  : metrics.averageRiskPerTrade > metrics.maxRiskAllowed * 0.8
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
              )}>
                {formatPercentage(metrics.averageRiskPerTrade)} / {formatPercentage(metrics.maxRiskAllowed)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Pérdida diaria:</span>
              <span className={cn(
                'text-sm font-semibold',
                getColorForValue(metrics.dailyLossPercent, { warning: 3, danger: 5 })
              )}>
                {formatPercentage(metrics.dailyLossPercent)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Alertas */}
        {warnings.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Alertas Actuales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {warnings.map((warning) => (
                <div
                  key={warning.id}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded-md text-xs',
                    warning.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' :
                    warning.severity === 'medium' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                    'bg-blue-500/10 border border-blue-500/20'
                  )}
                >
                  {getWarningIcon(warning.severity)}
                  <span className="flex-1">{warning.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

