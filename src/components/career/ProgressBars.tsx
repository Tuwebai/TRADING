import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getDisciplineLevel, getConsistencyLevel, getSetupMastery } from '@/lib/careerStats';
import type { Trade } from '@/types/Trading';

interface ProgressBarsProps {
  trades: Trade[];
}

export const ProgressBars: React.FC<ProgressBarsProps> = ({ trades }) => {
  const discipline = getDisciplineLevel(trades);
  const consistency = getConsistencyLevel(trades);
  const setupMastery = getSetupMastery(trades);
  
  const ProgressBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Niveles de Progreso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProgressBar
          label="Nivel de Disciplina"
          value={discipline}
          color="bg-primary"
        />
        <ProgressBar
          label="Nivel de Consistencia"
          value={consistency}
          color="bg-profit"
        />
        <ProgressBar
          label="Maestría de Setup"
          value={setupMastery}
          color="bg-blue-500"
        />
      </CardContent>
    </Card>
  );
};

