import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Edit, Trash2, X, TrendingUp, TrendingDown } from 'lucide-react';
import type { Trade } from '@/types/Trading';
import { formatPrice, formatCurrency, formatDate } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { TradeTableMobile } from './TradeTableMobile';

interface TradeTableProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onClose: (trade: Trade) => void;
}

export const TradeTable: React.FC<TradeTableProps> = ({ trades, onEdit, onDelete, onClose }) => {
  const { settings } = useSettingsStore();

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No se encontraron operaciones. Agrega tu primera operación para comenzar.
        </CardContent>
      </Card>
    );
  }

  // Versión móvil con cards
  return (
    <>
      <TradeTableMobile
        trades={trades}
        onEdit={onEdit}
        onDelete={onDelete}
        onClose={onClose}
      />
      
      {/* Versión desktop con tabla */}
      <div className="hidden md:block overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-lg">
            <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="p-4 text-left text-sm font-medium">Activo</th>
            <th className="p-4 text-left text-sm font-medium">Tipo</th>
            <th className="p-4 text-left text-sm font-medium">Entrada</th>
            <th className="p-4 text-left text-sm font-medium">Salida</th>
            <th className="p-4 text-left text-sm font-medium">Tamaño</th>
            <th className="p-4 text-left text-sm font-medium">PnL</th>
            <th className="p-4 text-left text-sm font-medium">R/R</th>
            <th className="p-4 text-left text-sm font-medium">Estado</th>
            <th className="p-4 text-left text-sm font-medium">Fecha</th>
            <th className="p-4 text-left text-sm font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const pnl = trade.pnl || 0;
            const isProfit = pnl > 0;
            
            return (
              <tr key={trade.id} className="border-b hover:bg-accent/50">
                <td className="p-4">
                  <div className="font-medium">{trade.asset}</div>
                  {trade.tags && trade.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {trade.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                      {trade.tags.length > 2 && (
                        <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                          +{trade.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    trade.positionType === 'long' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {trade.positionType === 'long' ? 'LARGO' : 'CORTO'}
                  </span>
                </td>
                <td className="p-4">{formatPrice(trade.entryPrice)}</td>
                <td className="p-4">
                  {trade.exitPrice ? formatPrice(trade.exitPrice) : '-'}
                </td>
                <td className="p-4">{trade.positionSize}</td>
                <td className="p-4">
                  {trade.status === 'closed' && trade.pnl !== null ? (
                    <span className={`flex items-center gap-1 ${isProfit ? 'text-profit' : 'text-loss'}`}>
                      {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {formatCurrency(pnl, settings.baseCurrency)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-4">
                  {trade.riskReward ? trade.riskReward.toFixed(2) : '-'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    trade.status === 'open' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {trade.status === 'open' ? 'ABIERTA' : 'CERRADA'}
                  </span>
                </td>
                <td className="p-4 text-sm">{formatDate(trade.entryDate)}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {trade.status === 'open' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClose(trade)}
                        title="Cerrar Operación"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(trade)}
                      title="Editar Operación"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(trade.id)}
                      title="Eliminar Operación"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

