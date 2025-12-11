import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { TradeForm } from '@/components/trades/TradeForm';
import { TradeTable } from '@/components/trades/TradeTable';
import { TradeFilters } from '@/components/trades/TradeFilters';
import { TradeCategoryChart } from '@/components/trades/TradeCategoryChart';
import { BlockedOverlay } from '@/components/trading/BlockedOverlay';
import { Plus, AlertTriangle } from 'lucide-react';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { checkTradingRules, isBlocked, blockUser } from '@/lib/tradingRules';
import type { Trade, TradeFormData } from '@/types/Trading';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';

export const TradesPage = () => {
  const {
    trades,
    filters,
    loadTrades,
    addTrade,
    updateTrade,
    deleteTrade,
    closeTrade,
    setFilters,
    clearFilters,
    getFilteredTrades,
    isLoading,
  } = useTradeStore();
  
  const { settings, updateSettings } = useSettingsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [ruleViolations, setRuleViolations] = useState<string[]>([]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const handleAddTrade = () => {
    setEditingTrade(null);
    setIsModalOpen(true);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsModalOpen(true);
  };

  const handleDeleteTrade = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta operación?')) {
      deleteTrade(id);
    }
  };

  const handleCloseTrade = (trade: Trade) => {
    setClosingTrade(trade);
    setIsModalOpen(true);
  };

  const handleSubmitTrade = (formData: TradeFormData) => {
    // Check trading rules before adding trade
    if (!editingTrade) {
      const violations = checkTradingRules(trades, settings, {
        positionSize: formData.positionSize,
        entryDate: formData.entryDate,
      });
      
      if (violations.length > 0) {
        const violationMessages = violations.map(v => v.message);
        setRuleViolations(violationMessages);
        
        // If ultra-disciplined mode is enabled, block user
        if (settings.advanced?.ultraDisciplinedMode.enabled && 
            settings.advanced?.ultraDisciplinedMode.blockOnRuleBreak) {
          const blockSettings = blockUser(settings, 24); // Block for 24 hours
          updateSettings(blockSettings);
          alert(`⚠️ Has roto una regla de trading!\n\n${violationMessages.join('\n')}\n\nEl trading ha sido bloqueado por 24 horas.`);
          setIsModalOpen(false);
          return;
        } else {
          // Show warning but allow trade
          if (!window.confirm(`⚠️ Advertencia: Has roto una regla de trading.\n\n${violationMessages.join('\n')}\n\n¿Deseas continuar de todas formas?`)) {
            return;
          }
        }
      }
    }
    
    if (editingTrade) {
      updateTrade(editingTrade.id, formData);
    } else {
      addTrade(formData);
    }
    setIsModalOpen(false);
    setEditingTrade(null);
    setClosingTrade(null);
    setRuleViolations([]);
  };

  const handleCloseTradeSubmit = (exitPrice: number, exitDate: string) => {
    if (closingTrade) {
      closeTrade(closingTrade.id, exitPrice, exitDate);
      setIsModalOpen(false);
      setClosingTrade(null);
    }
  };

  const filteredTrades = getFilteredTrades();
  const uniqueAssets = Array.from(new Set(trades.map(t => t.asset))).sort();

  const blocked = isBlocked(settings);
  
  return (
    <BlockedOverlay>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus posiciones de trading y rastrea el rendimiento
          </p>
        </div>
        <Button 
          onClick={handleAddTrade}
          disabled={blocked}
          title={blocked ? 'Trading bloqueado por violación de reglas' : ''}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Operación
        </Button>
      </div>

      <TradeFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        uniqueAssets={uniqueAssets}
      />

      {/* Gráfico de distribución de operaciones */}
      <TradeCategoryChart trades={trades} />

      {isLoading ? (
        <SkeletonTable />
      ) : (
        <TradeTable
          trades={filteredTrades}
          onEdit={handleEditTrade}
          onDelete={handleDeleteTrade}
          onClose={handleCloseTrade}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTrade(null);
          setClosingTrade(null);
        }}
        title={closingTrade ? 'Cerrar Operación' : editingTrade ? 'Editar Operación' : 'Agregar Operación'}
        size={editingTrade ? "xl" : "lg"}
      >
        {closingTrade ? (
          <CloseTradeForm
            trade={closingTrade}
            onSubmit={handleCloseTradeSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setClosingTrade(null);
            }}
          />
        ) : (
          <TradeForm
            trade={editingTrade}
            onSubmit={handleSubmitTrade}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingTrade(null);
            }}
          />
        )}
      </Modal>
      </motion.div>
    </BlockedOverlay>
  );
};

// Close Trade Form Component
interface CloseTradeFormProps {
  trade: Trade;
  onSubmit: (exitPrice: number, exitDate: string) => void;
  onCancel: () => void;
}

const CloseTradeForm: React.FC<CloseTradeFormProps> = ({ trade, onSubmit, onCancel }) => {
  const [exitPrice, setExitPrice] = useState<number>(trade.exitPrice || trade.entryPrice);
  const [exitDate, setExitDate] = useState<string>(
    trade.exitDate ? trade.exitDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exitPrice <= 0) {
      setError('El precio de salida debe ser mayor que 0');
      return;
    }
    onSubmit(exitPrice, exitDate);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Activo</Label>
        <p className="text-muted-foreground mt-1">{trade.asset}</p>
      </div>
      <div>
        <Label>Precio de Entrada</Label>
        <p className="text-muted-foreground mt-1">{trade.entryPrice}</p>
      </div>
      <div>
        <Label htmlFor="exitPrice">
          Precio de Salida *
        </Label>
        <Input
          id="exitPrice"
          type="number"
          step="0.0001"
          value={exitPrice}
          onChange={(e) => {
            setExitPrice(parseFloat(e.target.value) || 0);
            setError('');
          }}
          error={!!error}
          required
        />
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
      <div>
        <Label htmlFor="exitDate">
          Fecha de Salida *
        </Label>
        <Input
          id="exitDate"
          type="date"
          value={exitDate}
          onChange={(e) => setExitDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Cerrar Operación</Button>
      </div>
    </form>
  );
};

