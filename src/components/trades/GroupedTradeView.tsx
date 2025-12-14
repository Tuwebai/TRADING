import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import type { Trade } from '@/types/Trading';
import { TradeTable } from './TradeTable';

interface GroupedTradeViewProps {
  trades: Trade[];
  groupBy: 'day' | 'week' | 'month';
  selectedTradeId?: string | null;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onClose: (trade: Trade) => void;
  onDuplicate: (id: string) => void;
  onShowHistory?: (trade: Trade) => void;
  onSelectTrade?: (trade: Trade) => void;
}

export const GroupedTradeView: React.FC<GroupedTradeViewProps> = ({
  trades,
  groupBy,
  selectedTradeId,
  onEdit,
  onDelete,
  onClose,
  onDuplicate,
  onShowHistory,
  onSelectTrade,
}) => {
  const { settings } = useSettingsStore();

  const groupTrades = () => {
    const grouped: Record<string, Trade[]> = {};

    trades.forEach((trade) => {
      const date = new Date(trade.entryDate);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Semana ${weekStart.toISOString().split('T')[0]}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(trade);
    });

    return grouped;
  };

  const grouped = groupTrades();
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (groupBy === 'day') {
      return new Date(b).getTime() - new Date(a).getTime();
    } else if (groupBy === 'week') {
      const dateA = new Date(a.split(' ')[1]);
      const dateB = new Date(b.split(' ')[1]);
      return dateB.getTime() - dateA.getTime();
    } else {
      return b.localeCompare(a);
    }
  });

  const formatGroupLabel = (key: string) => {
    if (groupBy === 'day') {
      return formatDate(key);
    } else if (groupBy === 'week') {
      return key;
    } else {
      const [year, month] = key.split('-');
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
  };

  const calculateGroupStats = (groupTrades: Trade[]) => {
    const closedTrades = groupTrades.filter(t => t.status === 'closed' && t.pnl !== null);
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const losses = closedTrades.filter(t => (t.pnl || 0) <= 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    return {
      total: groupTrades.length,
      closed: closedTrades.length,
      totalPnL,
      wins,
      losses,
      winRate,
    };
  };

  return (
    <div className="space-y-6">
      {sortedKeys.map((key) => {
        const groupTrades = grouped[key];
        const stats = calculateGroupStats(groupTrades);

        return (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{formatGroupLabel(key)}</CardTitle>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Operaciones: </span>
                    <span className="font-semibold">{stats.total}</span>
                  </div>
                  {stats.closed > 0 && (
                    <>
                      <div>
                        <span className="text-muted-foreground">PnL: </span>
                        <span className={`font-semibold ${
                          stats.totalPnL > 0 ? 'text-profit' : 'text-loss'
                        }`}>
                          {formatCurrency(stats.totalPnL, settings.baseCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate: </span>
                        <span className="font-semibold">{stats.winRate.toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TradeTable
                trades={groupTrades}
                selectedTradeId={selectedTradeId}
                onEdit={onEdit}
                onDelete={onDelete}
                onClose={onClose}
                onDuplicate={onDuplicate}
                onShowHistory={onShowHistory}
                onSelectTrade={onSelectTrade}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

