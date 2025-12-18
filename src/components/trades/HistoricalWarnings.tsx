/**
 * Historical Warnings Component
 * Shows contextual warnings based on negative historical patterns
 */

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { HistoricalWarning } from '@/lib/tradeContext';

interface HistoricalWarningsProps {
  warnings: HistoricalWarning[];
}

export const HistoricalWarnings: React.FC<HistoricalWarningsProps> = ({
  warnings,
}) => {
  if (warnings.length === 0) return null;

  // Only show top warning to avoid clutter
  const topWarning = warnings[0];

  const severityStyles = {
    low: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
    medium: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
    high: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
  };

  const Icon = topWarning.severity === 'high' ? AlertTriangle : Info;

  return (
    <div className={`flex items-start gap-3 p-3 border rounded-lg ${severityStyles[topWarning.severity]}`}>
      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
        topWarning.severity === 'high' ? 'text-red-500' : 
        topWarning.severity === 'medium' ? 'text-orange-500' : 
        'text-amber-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{topWarning.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Basado en {topWarning.historicalMatches} trades históricos
        </p>
      </div>
    </div>
  );
};

