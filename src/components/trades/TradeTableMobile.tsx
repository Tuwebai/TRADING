import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Edit, Trash2, X, TrendingUp, TrendingDown } from 'lucide-react';
import type { Trade } from '@/types/Trading';
import { formatPrice, formatCurrency, formatDate } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { motion } from 'framer-motion';

interface TradeTableMobileProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onClose: (trade: Trade) => void;
}

export const TradeTableMobile: React.FC<TradeTableMobileProps> = ({ 
  trades, 
  onEdit, 
  onDelete, 
  onClose 
}) => {
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

  return (
    <div className="space-y-3 md:hidden">
      {trades.map((trade, index) => {
        const pnl = trade.pnl || 0;
        const isProfit = pnl > 0;
        
        return (
          <motion.div
            key={trade.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{trade.asset}</h3>
                    <p className="text-sm text-muted-foreground">{formatDate(trade.entryDate)}</p>
                  </div>
                  <div className="flex gap-1">
                    {trade.status === 'open' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClose(trade)}
                        className="touch-manipulation"
                        aria-label="Cerrar Operación"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(trade)}
                      className="touch-manipulation"
                      aria-label="Editar Operación"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(trade.id)}
                      className="touch-manipulation"
                      aria-label="Eliminar Operación"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Tags */}
                {trade.tags && trade.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {trade.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs rounded bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <span className={`px-2 py-1 rounded text-xs inline-block mt-1 ${
                      trade.positionType === 'long' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {trade.positionType === 'long' ? 'LARGO' : 'CORTO'}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estado</p>
                    <span className={`px-2 py-1 rounded text-xs inline-block mt-1 ${
                      trade.status === 'open' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {trade.status === 'open' ? 'ABIERTA' : 'CERRADA'}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Entrada</p>
                    <p className="font-medium">{formatPrice(trade.entryPrice)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Salida</p>
                    <p className="font-medium">
                      {trade.exitPrice ? formatPrice(trade.exitPrice) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tamaño</p>
                    <p className="font-medium">{trade.positionSize}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">R/R</p>
                    <p className="font-medium">{trade.riskReward ? trade.riskReward.toFixed(2) : '-'}</p>
                  </div>
                </div>

                {/* PnL */}
                {trade.status === 'closed' && trade.pnl !== null && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">PnL</p>
                      <span className={`flex items-center gap-1 font-semibold text-lg ${
                        isProfit ? 'text-profit' : 'text-loss'
                      }`}>
                        {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        {formatCurrency(pnl, settings.baseCurrency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

