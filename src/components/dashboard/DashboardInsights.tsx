import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getDashboardInsights, type DashboardInsight } from '@/lib/dashboardInsights';
import type { Trade } from '@/types/Trading';
import { AlertTriangle, Clock, TrendingDown, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

import { useSettingsStore } from '@/store/settingsStore';

interface DashboardInsightsProps {
  trades: Trade[];
}

export const DashboardInsights: React.FC<DashboardInsightsProps> = ({ trades }) => {
  const { settings } = useSettingsStore();
  const insights = getDashboardInsights(trades, settings);
  
  if (insights.length === 0) {
    return null;
  }
  
  const getIcon = (type: DashboardInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };
  
  const getColorClasses = (type: DashboardInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'success':
        return 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400';
      default:
        return 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Insights Automáticos
            </CardTitle>
            <Link to="/insights">
              <Button variant="ghost" size="sm">
                Ver todos
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 transition-all hover:scale-[1.02]',
                  getColorClasses(insight.type)
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(insight.type)}
                </div>
                <p className="flex-1 font-medium text-sm leading-relaxed">
                  {insight.message}
                </p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

