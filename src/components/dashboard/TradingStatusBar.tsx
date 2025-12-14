import React from 'react';
import { Button } from '@/components/ui/Button';
import { Pause, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export type TradingStatus = 'operable' | 'risk-elevated' | 'pause-recommended';

interface TradingStatusBarProps {
  status: TradingStatus;
  mainReason: string;
  suggestedAction: string;
  onReduceRisk?: () => void;
  onPauseTrading?: () => void;
}

export const TradingStatusBar: React.FC<TradingStatusBarProps> = ({
  status,
  mainReason,
  suggestedAction,
  onReduceRisk,
  onPauseTrading,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'operable':
        return {
          color: 'bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400',
          icon: CheckCircle2,
          label: 'OPERABLE',
          badge: '🟢',
        };
      case 'risk-elevated':
        return {
          color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
          icon: AlertTriangle,
          label: 'RIESGO ELEVADO',
          badge: '🟡',
        };
      case 'pause-recommended':
        return {
          color: 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400',
          icon: Pause,
          label: 'PAUSA RECOMENDADA',
          badge: '🔴',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'sticky top-0 z-40 border-b-2 shadow-sm',
        config.color
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Icon className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">{config.badge}</span>
                <span className="font-semibold text-sm md:text-base">
                  Estado: {config.label}
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {mainReason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {status === 'pause-recommended' && (
              <>
                {onReduceRisk && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReduceRisk}
                    className="text-xs"
                  >
                    Reducir Riesgo
                  </Button>
                )}
                {onPauseTrading && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onPauseTrading}
                    className="text-xs"
                  >
                    <Pause className="h-3 w-3 mr-1" />
                    Pausar Trading
                  </Button>
                )}
              </>
            )}
            {status === 'risk-elevated' && onReduceRisk && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReduceRisk}
                className="text-xs"
              >
                Revisar Riesgo
              </Button>
            )}
            <Link to="/settings">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Configuración
              </Button>
            </Link>
          </div>
        </div>
        {suggestedAction && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <p className="text-xs font-medium">
              👉 {suggestedAction}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

