import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { TradeForm } from '@/components/trades/TradeForm';
import { TradeImageImporter } from '@/components/trades/TradeImageImporter';
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
import { useGoalsStore } from '@/store/goalsStore';
import { useTemplateStore } from '@/store/templateStore';
import { checkTradingRules, isBlocked, blockUser } from '@/lib/tradingRules';
import { isPreTradeComplete } from '@/lib/routineDiscipline';
import { shouldBlockTradingDueToGoals } from '@/lib/goalConstraints';
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
    isLoading,
    selectedTradeId,
    setSelectedTrade,
    getSelectedTrade,
    getFilteredTrades,
    getTradesByMode,
  } = useTradeStore();
  
  const { settings, updateSettings } = useSettingsStore();
  const { goals, loadGoals } = useGoalsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [historyTrade, setHistoryTrade] = useState<Trade | null>(null);
  const [currentFormData, setCurrentFormData] = useState<TradeFormData | undefined>(undefined);
  const [showImageImporter, setShowImageImporter] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState<{ formData: Partial<TradeFormData>; imageBase64: string; detectedFields: string[] } | null>(null);

  const { loadTemplates } = useTemplateStore();

  useEffect(() => {
    const loadData = async () => {
      await loadTrades();
    };
    loadData();
    loadGoals();
    loadTemplates();
  }, [loadTrades, loadGoals, loadTemplates]);

  // Get trades filtered by current mode first
  const modeFilteredTrades = getTradesByMode();
  
  // Evaluate trades on-demand using hook (only evaluate trades in current mode)
  const evaluatedTrades = useEvaluatedTrades(modeFilteredTrades, settings);

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

      // 4️⃣ ENFORCEMENT: Check if goals are blocking trading
      const goalBlocking = shouldBlockTradingDueToGoals(goals, trades, settings);
      if (goalBlocking.blocked) {
        alert(`🔴 CREACIÓN DE OPERACIÓN BLOQUEADA\n\n${goalBlocking.message}\n\nEste bloqueo está relacionado con tus objetivos activos.`);
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

  // Apply filters using getFilteredTrades (which already filters by mode)
  // Then merge with evaluated trades (which contain rule evaluations)
  const filteredTradesRaw = getFilteredTrades();
  const filteredTrades = filteredTradesRaw.map(trade => {
    // Find evaluated version of this trade (contains rule evaluations)
    const evaluated = evaluatedTrades.find(et => et.id === trade.id);
    return evaluated || trade;
  });
  
  // Get unique assets from trades in current mode only
  const uniqueAssets = Array.from(new Set(modeFilteredTrades.map(t => t.asset))).sort();

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
      <TradeCategoryChart trades={filteredTrades} />

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
          setShowImageImporter(false);
          setOcrExtractedData(null);
        }}
        title={closingTrade ? 'Cerrar Operación' : editingTrade ? 'Editar Operación' : showImageImporter ? 'Importar desde Imagen' : 'Agregar Operación'}
        size={editingTrade ? "xl" : showImageImporter ? "lg" : "lg"}
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
        ) : showImageImporter ? (
          <TradeImageImporter
            onDataExtracted={(formData, imageBase64) => {
              // Extract detected fields from the formData
              const detectedFields: string[] = [];
              if (formData.asset) detectedFields.push('asset');
              if (formData.positionType) detectedFields.push('positionType');
              if (formData.entryPrice !== undefined) detectedFields.push('entryPrice');
              if (formData.stopLoss !== undefined) detectedFields.push('stopLoss');
              if (formData.takeProfit !== undefined) detectedFields.push('takeProfit');
              if (formData.exitPrice !== undefined) detectedFields.push('exitPrice');
              if (formData.entryDate) detectedFields.push('entryDate');
              if (formData.exitDate) detectedFields.push('exitDate');
              if (formData.positionSize !== undefined) detectedFields.push('positionSize');
              if (formData.leverage !== undefined) detectedFields.push('leverage');
              
              setOcrExtractedData({ formData, imageBase64, detectedFields });
              setShowImageImporter(false);
            }}
            onCancel={() => {
              setShowImageImporter(false);
            }}
          />
        ) : (
          <>
            {!editingTrade && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImageImporter(false);
                      setOcrExtractedData(null);
                    }}
                    className="flex-1"
                  >
                    ➕ Manual
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowImageImporter(true);
                      setOcrExtractedData(null);
                    }}
                    className="flex-1"
                  >
                    📸 Importar desde Imagen
                  </Button>
                </div>
              </div>
            )}
            <div className="mb-4">
              <TemplateSelector
                onSelectTemplate={handleTemplateSelect}
                currentFormData={currentFormData}
              />
            </div>
            <TradeForm
              trade={editingTrade}
              initialFormData={ocrExtractedData?.formData || currentFormData}
              onSubmit={handleSubmitTrade}
              onCancel={() => {
                setIsModalOpen(false);
                setEditingTrade(null);
                setCurrentFormData(undefined);
                setOcrExtractedData(null);
                setShowImageImporter(false);
              }}
              autoDetectedFields={ocrExtractedData?.detectedFields || []}
              ocrImageBase64={ocrExtractedData?.imageBase64}
              onViewTrade={(tradeId) => {
                // Close modal and show trade details
                setIsModalOpen(false);
                setSelectedTrade(tradeId);
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
        trades={modeFilteredTrades}
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

