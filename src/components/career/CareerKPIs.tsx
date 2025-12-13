import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getCareerKPIs } from '@/lib/careerStats';
import { formatCurrency } from '@/lib/utils';
import type { Trade } from '@/types/Trading';
import { Clock, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface CareerKPIsProps {
  trades: Trade[];
  baseCurrency: string;
}

export const CareerKPIs: React.FC<CareerKPIsProps> = ({ trades, baseCurrency }) => {
  const kpis = getCareerKPIs(trades);
  
  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours.toFixed(1)} horas`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours.toFixed(0)}h`;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tiempo Total de Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHours(kpis.totalTradingTime)}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Días Consistentes Consecutivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-profit">{kpis.consecutiveConsistentDays}</div>
          <p className="text-xs text-muted-foreground mt-1">Racha actual</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Meses Verdes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-profit">{kpis.greenMonths}</div>
          <p className="text-xs text-muted-foreground mt-1">Meses con P/L positivo</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Meses Rojos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-loss">{kpis.redMonths}</div>
          <p className="text-xs text-muted-foreground mt-1">Meses con P/L negativo</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Años Activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.yearsActive}</div>
          <p className="text-xs text-muted-foreground mt-1">Tiempo en trading</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Retorno Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${kpis.totalReturn >= 0 ? 'text-profit' : 'text-loss'}`}>
            {formatCurrency(kpis.totalReturn, baseCurrency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Suma de todas las operaciones</p>
        </CardContent>
      </Card>
    </div>
  );
};

