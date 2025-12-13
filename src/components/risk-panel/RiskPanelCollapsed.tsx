import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskMetrics } from '@/lib/risk';
import { getRiskLevel, getRiskWarnings } from '@/lib/risk';
import type { Settings } from '@/types/Trading';

interface RiskPanelCollapsedProps {
  metrics: RiskMetrics;
  settings: Settings;
  onExpand: () => void;
}

export const RiskPanelCollapsed: React.FC<RiskPanelCollapsedProps> = ({
  metrics,
  settings,
  onExpand,
}) => {
  const warnings = getRiskWarnings(metrics, settings);
  const riskLevel = getRiskLevel(metrics, warnings);
  
  const getColorClasses = () => {
    switch (riskLevel) {
      case 'danger':
        return 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400';
    }
  };
  
  const getIcon = () => {
    switch (riskLevel) {
      case 'danger':
        return <AlertTriangle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };
  
  return (
    <button
      onClick={onExpand}
      className={cn(
        'relative w-[60px] h-auto min-h-[200px] flex flex-col items-center justify-center gap-2 p-3',
        'border-l border-t border-b rounded-l-lg transition-all',
        'hover:scale-105 active:scale-95',
        'bg-card shadow-lg',
        getColorClasses()
      )}
      title={`Riesgo: ${riskLevel === 'danger' ? 'Alto' : riskLevel === 'warning' ? 'Moderado' : 'Bajo'} | DD: ${metrics.currentDrawdownPercent.toFixed(1)}% | Exp: ${metrics.currentExposurePercent.toFixed(1)}%`}
    >
      {getIcon()}
      <div className="text-xs font-bold text-center">
        {metrics.currentDrawdownPercent.toFixed(0)}%
      </div>
      <div className="text-[10px] text-center opacity-75">
        DD
      </div>
      {warnings.length > 0 && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </button>
  );
};

