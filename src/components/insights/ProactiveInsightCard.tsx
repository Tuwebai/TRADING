import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { type ProactiveInsight } from '@/lib/proactiveInsights';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface ProactiveInsightCardProps {
  insight: ProactiveInsight;
}

export const ProactiveInsightCard: React.FC<ProactiveInsightCardProps> = ({ insight }) => {
  const getSeverityConfig = () => {
    switch (insight.severity) {
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

  const config = getSeverityConfig();
  const Icon = config.icon;

  return (
    <Card className={cn('transition-all hover:shadow-lg', config.borderColor, config.bgColor)}>
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
                  {insight.title}
                </h3>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            {/* Qué pasó */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Qué pasó</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.whatHappened}
              </p>
            </div>

            {/* Por qué pasó */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Por qué pasó</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.whyHappened}
              </p>
            </div>

            {/* Qué hacer ahora */}
            <div className="pt-2 border-t border-border/30">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Qué hacer ahora
              </h4>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {insight.whatToDoNow}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

