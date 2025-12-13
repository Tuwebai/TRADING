import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getTopAssets } from '@/lib/insights';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { Trade } from '@/types/Trading';
import { Trophy, Target, TrendingUp } from 'lucide-react';

interface TopAssetsProps {
  trades: Trade[];
  baseCurrency: string;
}

export const TopAssets: React.FC<TopAssetsProps> = ({ trades, baseCurrency }) => {
  const topAssets = getTopAssets(trades);
  
  const RankItem = ({ rank, asset, value, label, icon }: {
    rank: number;
    asset: string;
    value: string;
    label: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{asset}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="font-bold">{value}</div>
      </div>
      <div className="flex-shrink-0 text-primary">
        {icon}
      </div>
    </div>
  );
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top por P/L
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topAssets.byPnl.length > 0 ? (
            topAssets.byPnl.map((asset, index) => (
              <RankItem
                key={asset.asset}
                rank={index + 1}
                asset={asset.asset}
                value={formatCurrency(asset.pnl, baseCurrency)}
                label="P/L Total"
                icon={<Trophy className="h-4 w-4" />}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos suficientes</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Top por Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topAssets.byWinrate.length > 0 ? (
            topAssets.byWinrate.map((asset, index) => (
              <RankItem
                key={asset.asset}
                rank={index + 1}
                asset={asset.asset}
                value={formatPercentage(asset.winrate)}
                label={`${asset.trades} operaciones`}
                icon={<Target className="h-4 w-4" />}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos suficientes</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Top por R Promedio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topAssets.byAvgR.length > 0 ? (
            topAssets.byAvgR.map((asset, index) => (
              <RankItem
                key={asset.asset}
                rank={index + 1}
                asset={asset.asset}
                value={`${asset.avgR.toFixed(2)}R`}
                label={`${asset.trades} operaciones`}
                icon={<TrendingUp className="h-4 w-4" />}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos suficientes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

