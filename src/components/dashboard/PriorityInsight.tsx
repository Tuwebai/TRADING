import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getPriorityInsights, type ProactiveInsight } from '@/lib/proactiveInsights';
import type { Trade, Settings } from '@/types/Trading';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PriorityInsightProps {
  trades: Trade[];
  settings: Settings;
  onApplyAction?: (insightId: string, action: string) => void;
  onIgnore?: (insightId: string) => void;
}

export const PriorityInsight: React.FC<PriorityInsightProps> = ({
  trades,
  settings,
  onApplyAction,
  onIgnore,
}) => {
  const [ignoredInsights, setIgnoredInsights] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const allInsights = getPriorityInsights(trades, settings);
  const visibleInsights = allInsights.filter(i => !ignoredInsights.has(i.id));
  const primaryInsight = visibleInsights[0];
  const otherInsights = visibleInsights.slice(1);

  if (!primaryInsight && otherInsights.length === 0) {
    return null;
  }

  const getSeverityConfig = (severity: ProactiveInsight['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-500',
          borderColor: 'border-red-500/50',
          bgColor: 'bg-red-500/10',
          titleColor: 'text-red-600 dark:text-red-400',
          badge: '🔴 CRÍTICO',
          badgeBg: 'bg-red-500/20 text-red-600 dark:text-red-400',
        };
      case 'important':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          borderColor: 'border-yellow-500/50',
          bgColor: 'bg-yellow-500/10',
          titleColor: 'text-yellow-600 dark:text-yellow-400',
          badge: '🟡 IMPORTANTE',
          badgeBg: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        };
      case 'positive':
        return {
          icon: CheckCircle2,
          iconColor: 'text-green-500',
          borderColor: 'border-green-500/50',
          bgColor: 'bg-green-500/10',
          titleColor: 'text-green-600 dark:text-green-400',
          badge: '🟢 POSITIVO',
          badgeBg: 'bg-green-500/20 text-green-600 dark:text-green-400',
        };
    }
  };

  const handleApply = () => {
    if (onApplyAction && primaryInsight) {
      // Extraer acción de "whatToDoNow"
      const action = primaryInsight.whatToDoNow.split('👉')[1]?.trim() || primaryInsight.whatToDoNow;
      onApplyAction(primaryInsight.id, action);
    }
  };

  const handleIgnore = () => {
    if (primaryInsight) {
      setIgnoredInsights(prev => new Set(prev).add(primaryInsight.id));
      if (onIgnore) {
        onIgnore(primaryInsight.id);
      }
    }
  };

  if (!primaryInsight) {
    return null;
  }

  const config = getSeverityConfig(primaryInsight.severity);
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      {/* Insight Principal */}
      <Card className={cn('border-2', config.borderColor, config.bgColor)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  <Icon className={cn('h-6 w-6', config.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('text-xs font-bold px-2 py-1 rounded', config.badgeBg)}>
                      {config.badge}
                    </span>
                  </div>
                  <h3 className={cn('text-xl font-bold mb-1', config.titleColor)}>
                    {primaryInsight.title}
                  </h3>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleIgnore}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Contenido */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Qué pasó</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {primaryInsight.whatHappened}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Por qué pasó</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {primaryInsight.whyHappened}
                </p>
              </div>

              <div className="pt-2 border-t border-border/30">
                <h4 className="text-sm font-semibold text-foreground mb-2">Qué hacer ahora</h4>
                <p className="text-sm font-medium text-foreground leading-relaxed mb-3">
                  {primaryInsight.whatToDoNow}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={primaryInsight.severity === 'critical' ? 'destructive' : 'default'}
                    onClick={handleApply}
                  >
                    Aplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleIgnore}
                  >
                    Ignorar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Otros Insights (Colapsados) */}
      {otherInsights.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Ocultar {otherInsights.length} insight{otherInsights.length > 1 ? 's' : ''} adicional{otherInsights.length > 1 ? 'es' : ''}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Ver {otherInsights.length} insight{otherInsights.length > 1 ? 's' : ''} adicional{otherInsights.length > 1 ? 'es' : ''}
              </>
            )}
          </Button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 mt-3"
              >
                {otherInsights.map((insight) => {
                  const insightConfig = getSeverityConfig(insight.severity);
                  const InsightIcon = insightConfig.icon;
                  return (
                    <Card
                      key={insight.id}
                      className={cn('border', insightConfig.borderColor, insightConfig.bgColor)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <InsightIcon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', insightConfig.iconColor)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('text-xs font-bold px-2 py-0.5 rounded', insightConfig.badgeBg)}>
                                {insightConfig.badge}
                              </span>
                            </div>
                            <h4 className={cn('font-semibold text-sm mb-1', insightConfig.titleColor)}>
                              {insight.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {insight.whatHappened}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

