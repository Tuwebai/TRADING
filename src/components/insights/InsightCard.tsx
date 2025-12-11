import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { type Insight } from '@/lib/insights';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';

interface InsightCardProps {
  insight: Insight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'positive':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getBorderColor = () => {
    switch (insight.type) {
      case 'positive':
        return 'border-green-500/50 bg-green-500/5';
      case 'negative':
        return 'border-red-500/50 bg-red-500/5';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/5';
      default:
        return 'border-blue-500/50 bg-blue-500/5';
    }
  };
  
  return (
    <Card className={cn('transition-all hover:scale-105', getBorderColor())}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{insight.metric}</span>
              {insight.change !== undefined && (
                <span className={cn(
                  'text-sm font-medium',
                  insight.change > 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {insight.change > 0 ? '+' : ''}{insight.change.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

