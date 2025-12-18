/**
 * Similar Trade Modal
 * Shows similar trades found in history before saving
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { History, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SimilarTrade } from '@/lib/tradeContext';

interface SimilarTradeModalProps {
  isOpen: boolean;
  similarTrades: SimilarTrade[];
  onViewTrade: (tradeId: string) => void;
  onContinue: () => void;
  onClose: () => void;
}

export const SimilarTradeModal: React.FC<SimilarTradeModalProps> = ({
  isOpen,
  similarTrades,
  onViewTrade,
  onContinue,
  onClose,
}) => {
  if (similarTrades.length === 0) return null;

  const mostSimilar = similarTrades[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trade Similar Detectado"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <History className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground mb-2">
              Este trade es muy parecido al del{' '}
              <strong>
                {format(new Date(mostSimilar.trade.entryDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </strong>
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Criterios coincidentes: {mostSimilar.matchingCriteria.join(', ')}</p>
              <p>Similitud: {Math.round(mostSimilar.similarityScore * 100)}%</p>
            </div>
          </div>
        </div>

        {mostSimilar.trade.pnl !== null && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium mb-1">Resultado del trade anterior:</p>
            <p className={`text-lg font-bold ${mostSimilar.trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {mostSimilar.trade.pnl >= 0 ? '+' : ''}{mostSimilar.trade.pnl.toFixed(2)}
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onContinue}
          >
            Continuar sin revisar
          </Button>
          <Button
            onClick={() => {
              onViewTrade(mostSimilar.trade.id);
              onClose();
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver trade anterior
          </Button>
        </div>
      </div>
    </Modal>
  );
};

