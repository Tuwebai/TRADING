import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatTime } from '@/lib/utils';
import type { Trade, TradeChange } from '@/types/Trading';

interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
}

export const TradeHistoryModal: React.FC<TradeHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  trade 
}) => {
  if (!trade || !trade.changeHistory || trade.changeHistory.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Historial de Cambios" size="md">
        <p className="text-muted-foreground text-center py-8">
          No hay cambios registrados para esta operación.
        </p>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Historial de Cambios" size="lg">
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Operación: <span className="font-semibold text-foreground">{trade.asset}</span>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {trade.changeHistory
            .slice()
            .reverse()
            .map((change) => (
              <div
                key={change.id}
                className="p-3 border rounded-lg bg-accent/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-sm capitalize">
                    {change.field.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(change.timestamp)} {formatTime(change.timestamp)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Anterior:</span>
                    <div className="mt-1 p-2 bg-destructive/10 rounded text-destructive">
                      {typeof change.oldValue === 'object' 
                        ? JSON.stringify(change.oldValue, null, 2)
                        : String(change.oldValue || '-')}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nuevo:</span>
                    <div className="mt-1 p-2 bg-green-500/10 rounded text-green-600 dark:text-green-400">
                      {typeof change.newValue === 'object' 
                        ? JSON.stringify(change.newValue, null, 2)
                        : String(change.newValue || '-')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </Modal>
  );
};

