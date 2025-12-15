import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { TradeForm } from '@/components/trades/TradeForm';
import { TradeTable } from '@/components/trades/TradeTable';
import { TradeFiltersComponent } from '@/components/trades/TradeFilters';
import { TradeCategoryChart } from '@/components/trades/TradeCategoryChart';
import { ExportImportModal } from '@/components/trades/ExportImportModal';
import { TemplateSelector } from '@/components/trades/TemplateSelector';
import { TradeHistoryModal } from '@/components/trades/TradeHistoryModal';
import { GroupedTradeView } from '@/components/trades/GroupedTradeView';
import { TradeDetailsPanel } from '@/components/trades/TradeDetailsPanel';
import { TradeContextualInsights } from '@/components/trades/TradeContextualInsights';
import { BlockedOverlay } from '@/components/trading/BlockedOverlay';
import { Plus, Download } from 'lucide-react';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTemplateStore } from '@/store/templateStore';
import { checkTradingRules, isBlocked, blockUser } from '@/lib/tradingRules';
import { useEvaluatedTrades } from '@/hooks/useTradeRuleEvaluation';
import { initializeBackupSystem } from '@/lib/backup';
import { useCommonShortcuts } from '@/hooks/useKeyboardShortcuts';
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
    duplicateTrade,
    setFilters,
    clearFilters,
    getFilteredTrades,
    isLoading,
    selectedTradeId,
    setSelectedTrade,
    getSelectedTrade,
  } = useTradeStore();
  
  const { settings, updateSettings } = useSettingsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [historyTrade, setHistoryTrade] = useState<Trade | null>(null);
  const [currentFormData, setCurrentFormData] = useState<TradeFormData | undefined>(undefined);

  const { loadTemplates } = useTemplateStore();

  useEffect(() => {
    loadTrades();
    loadTemplates();
  }, [loadTrades, loadTemplates]);

  // Evaluate trades on-demand using hook
  const evaluatedTrades = useEvaluatedTrades(trades, settings);

  // Atajos de teclado
  useCommonShortcuts({
    onNewTrade: () => {
      if (!blocked) {
        handleAddTrade();
      }
    },
    onClose: () => {
      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingTrade(null);
        setClosingTrade(null);
      }
    },
  });

  // Initialize automatic backup system
  useEffect(() => {
    if (trades.length > 0) {
      initializeBackupSystem(trades);
    }
  }, [trades.length]);

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

  const handleTemplateSelect = (formData: TradeFormData) => {
    setCurrentFormData(formData);
    setEditingTrade(null);
    setIsModalOpen(true);
  };

  const handleSubmitTrade = (formData: TradeFormData) => {
    setCurrentFormData(undefined);
    // Check trading rules before adding trade
    if (!editingTrade) {
      // 3️⃣ ENFORCEMENT: Check if pre-trade routine is complete
      const preTradeCheck = isPreTradeComplete();
      
      if (!preTradeCheck.complete) {
        alert(`🔴 CREACIÓN DE OPERACIÓN BLOQUEADA\n\n${preTradeCheck.message}\n\nDebes completar la Lista Pre-Operación al 100% antes de crear cualquier operación.\n\nVe a /routines para completar tu rutina.`);
        return;
      }
      
      const violations = checkTradingRules(trades, settings, {
        positionSize: formData.positionSize,
        entryDate: formData.entryDate,
        asset: formData.asset,
      });
      
      // Separate critical violations (errors) from warnings
      const criticalViolations = violations.filter(v => v.severity === 'error');
      const warnings = violations.filter(v => v.severity === 'warning');
      
      // Always block if there are critical violations
      if (criticalViolations.length > 0) {
        const violationMessages = criticalViolations.map(v => v.message);
        
        // If ultra-disciplined mode is enabled, block user
        if (settings.advanced?.ultraDisciplinedMode.enabled && 
            settings.advanced?.ultraDisciplinedMode.blockOnRuleBreak) {
          const blockSettings = blockUser(settings, 24); // Block for 24 hours
          updateSettings(blockSettings);
          alert(`❌ Has roto una regla de trading!\n\n${violationMessages.join('\n')}\n\nEl trading ha sido bloqueado por 24 horas.`);
          setIsModalOpen(false);
          return;
        } else {
          // Block the trade creation even without ultra-disciplined mode
          alert(`❌ No se puede crear la operación:\n\n${violationMessages.join('\n')}`);
          return;
        }
      }
      
      // Show warnings but allow trade
      if (warnings.length > 0) {
        const warningMessages = warnings.map(v => v.message);
        if (!window.confirm(`⚠️ Advertencia: Has roto una regla de trading.\n\n${warningMessages.join('\n')}\n\n¿Deseas continuar de todas formas?`)) {
          return;
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
  };

  const handleCloseTradeSubmit = (exitPrice: number, exitDate: string) => {
    if (closingTrade) {
      closeTrade(closingTrade.id, exitPrice, exitDate);
      setIsModalOpen(false);
      setClosingTrade(null);
    }
  };

  const handleImportComplete = (importedTrades: Trade[]) => {
    // Add imported trades to the store
    importedTrades.forEach(trade => {
      try {
        addTrade({
          asset: trade.asset,
          positionType: trade.positionType,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          positionSize: trade.positionSize,
          leverage: trade.leverage,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          entryDate: trade.entryDate,
          exitDate: trade.exitDate,
          notes: trade.notes,
          screenshots: trade.screenshots,
          videos: trade.videos,
          tags: trade.tags,
          journal: trade.journal,
        });
      } catch (error) {
        console.error('Error importing trade:', error);
      }
    });
    loadTrades(); // Reload to refresh the list
  };

  // Use evaluated trades for filtering and display
  const baseTrades = evaluatedTrades.length > 0 ? evaluatedTrades : trades;
  
  // Apply filters to evaluated trades
  const filteredTrades = baseTrades.filter(trade => {
    
    // Apply all filters (reuse logic from getFilteredTrades)
    if (filters.dateFrom && trade.entryDate < filters.dateFrom) return false;
    if (filters.dateTo && trade.entryDate > filters.dateTo) return false;
    if (filters.asset && trade.asset.toLowerCase() !== filters.asset.toLowerCase()) return false;
    
    if (filters.winLoss && filters.winLoss !== 'all') {
      if (trade.status !== 'closed' || trade.pnl === null) return false;
      if (filters.winLoss === 'win' && trade.pnl <= 0) return false;
      if (filters.winLoss === 'loss' && trade.pnl >= 0) return false;
    }
    
    if (filters.status && filters.status !== 'all' && trade.status !== filters.status) return false;
    if (filters.session && filters.session !== 'all' && trade.session !== filters.session) return false;
    if (filters.setupId && trade.setupId !== filters.setupId) return false;
    
    if (filters.minRiskReward !== null && filters.minRiskReward !== undefined) {
      if (!trade.riskReward || trade.riskReward < filters.minRiskReward) return false;
    }
    
    if (filters.ruleStatus) {
      const hasViolations = trade.violatedRules && trade.violatedRules.length > 0;
      if (filters.ruleStatus === 'compliant' && hasViolations) return false;
      if (filters.ruleStatus === 'violations' && !hasViolations) return false;
    }
    
    if (filters.classification && filters.classification !== 'all') {
      if (trade.tradeClassification !== filters.classification) return false;
    }
    
    return true;
  });
  
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
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsExportImportModalOpen(true)}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar/Importar
          </Button>
          <Button 
            onClick={handleAddTrade}
            disabled={blocked}
            title={blocked ? 'Trading bloqueado por violación de reglas' : ''}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Operación
          </Button>
        </div>
      </div>

      <TradeFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        uniqueAssets={uniqueAssets}
      />

      {/* Contextual Insights - Above table */}
      {filteredTrades.length > 0 && (
        <TradeContextualInsights trades={filteredTrades} />
      )}

      {/* Gráfico de distribución de operaciones */}
      <TradeCategoryChart trades={trades} />

      {isLoading ? (
        <SkeletonTable />
      ) : filters.groupBy ? (
        <GroupedTradeView
          trades={filteredTrades}
          groupBy={filters.groupBy}
          selectedTradeId={selectedTradeId}
          onEdit={handleEditTrade}
          onDelete={handleDeleteTrade}
          onClose={handleCloseTrade}
          onDuplicate={(id) => {
            duplicateTrade(id);
            loadTrades();
          }}
          onShowHistory={(trade) => setHistoryTrade(trade)}
          onSelectTrade={(trade) => setSelectedTrade(trade.id)}
        />
      ) : (
        <TradeTable
          trades={filteredTrades}
          selectedTradeId={selectedTradeId}
          onEdit={handleEditTrade}
          onDelete={handleDeleteTrade}
          onClose={handleCloseTrade}
          onDuplicate={(id) => {
            duplicateTrade(id);
            loadTrades();
          }}
          onShowHistory={(trade) => setHistoryTrade(trade)}
          onSelectTrade={(trade) => setSelectedTrade(trade.id)}
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
          <>
            <div className="mb-4">
              <TemplateSelector
                onSelectTemplate={handleTemplateSelect}
                currentFormData={currentFormData}
              />
            </div>
            <TradeForm
              trade={editingTrade}
              initialFormData={currentFormData}
              onSubmit={handleSubmitTrade}
              onCancel={() => {
                setIsModalOpen(false);
                setEditingTrade(null);
                setCurrentFormData(undefined);
              }}
            />
          </>
        )}
      </Modal>

      <TradeHistoryModal
        isOpen={!!historyTrade}
        onClose={() => setHistoryTrade(null)}
        trade={historyTrade}
      />

      {/* Trade Details Panel */}
      {getSelectedTrade() && (
        <TradeDetailsPanel
          trade={getSelectedTrade()!}
          onEdit={handleEditTrade}
          onDelete={handleDeleteTrade}
          onDuplicate={(id) => {
            duplicateTrade(id);
            loadTrades();
          }}
          onClose={() => setSelectedTrade(null)}
        />
      )}

      <ExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
        trades={trades}
        onImportComplete={handleImportComplete}
      />
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

