import React from 'react';
import { AlertCircle, X, Pause, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/settingsStore';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RiskWarningBannerProps {
  isVisible: boolean;
  onDismiss?: () => void;
  severity: 'high' | 'critical';
  message: string;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive' | 'outline';
    icon?: React.ElementType;
  }>;
}

export const RiskWarningBanner: React.FC<RiskWarningBannerProps> = ({
  isVisible,
  onDismiss,
  severity,
  message,
  actions = [],
}) => {
  const defaultActions = [
    {
      label: 'Pausa Recomendada',
      action: () => {
        // Aquí se podría implementar lógica para pausar trading
        alert('Considera pausar el trading por hoy. Revisa tus reglas de riesgo.');
      },
      variant: 'destructive' as const,
      icon: Pause,
    },
    {
      label: 'Revisar Reglas',
      action: () => {
        // Navegar a configuración
        window.location.href = '/settings';
      },
      variant: 'outline' as const,
      icon: Settings,
    },
  ];

  const finalActions = actions.length > 0 ? actions : defaultActions;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-50 border-b-2 shadow-lg',
            severity === 'critical'
              ? 'bg-red-500/20 border-red-500 text-red-600 dark:text-red-400'
              : 'bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400'
          )}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm md:text-base">{message}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {finalActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={idx}
                      size="sm"
                      variant={action.variant || 'default'}
                      onClick={action.action}
                      className="text-xs"
                    >
                      {Icon && <Icon className="h-3 w-3 mr-1" />}
                      <span className="hidden sm:inline">{action.label}</span>
                      <span className="sm:hidden">
                        {action.label.split(' ')[0]}
                      </span>
                    </Button>
                  );
                })}
                
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDismiss}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

