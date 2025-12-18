/**
 * Trading Mode Selector Component
 * Global selector for trading mode (Simulation, Demo, Live)
 * Shows confirmation modal when changing modes
 */

import React, { useState } from 'react';
import { useTradingMode } from '@/store/tradingModeStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Info } from 'lucide-react';
import type { TradingMode } from '@/store/tradingModeStore';

const MODE_INFO: Record<TradingMode, { title: string; description: string; warning?: string }> = {
  simulation: {
    title: 'Modo Simulación',
    description: 'Registra trades hipotéticos o de "lo que hubieras hecho". Los datos se mantienen separados de trades reales.',
  },
  demo: {
    title: 'Modo Demo',
    description: 'Registra trades reales de cuenta demo. Los datos se mantienen separados de modo live y simulación.',
  },
  live: {
    title: 'Modo Live',
    description: 'Registra trades reales de cuenta live. Este modo requiere mayor atención y disciplina.',
    warning: '⚠️ Estás registrando trades de cuenta real. Asegúrate de registrar datos precisos.',
  },
};

export const TradingModeSelector: React.FC = () => {
  const { mode, setMode, getModeBadge } = useTradingMode();
  const [showModal, setShowModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<TradingMode | null>(null);

  const badge = getModeBadge();

  const handleModeClick = (newMode: TradingMode) => {
    if (newMode === mode) {
      return; // Already selected
    }
    setPendingMode(newMode);
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (pendingMode) {
      setMode(pendingMode, true);
      setShowModal(false);
      setPendingMode(null);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setPendingMode(null);
  };

  const getModeIcon = (m: TradingMode) => {
    switch (m) {
      case 'simulation':
        return '🟦';
      case 'demo':
        return '🟡';
      case 'live':
        return '🔴';
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background">
          <span className="text-sm font-medium">{getModeIcon(mode)}</span>
          <span className={`text-xs font-semibold ${badge.color}`}>{badge.label}</span>
        </div>
        <div className="relative group">
          <button
            type="button"
            onClick={() => handleModeClick('simulation')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'simulation'
                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                : 'hover:bg-muted'
            }`}
            title="Modo Simulación"
          >
            🟦
          </button>
          <button
            type="button"
            onClick={() => handleModeClick('demo')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'demo'
                ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                : 'hover:bg-muted'
            }`}
            title="Modo Demo"
          >
            🟡
          </button>
          <button
            type="button"
            onClick={() => handleModeClick('live')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'live'
                ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                : 'hover:bg-muted'
            }`}
            title="Modo Live"
          >
            🔴
          </button>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCancel}
        title="Cambiar Modo de Trading"
        size="md"
      >
        <div className="space-y-4">
          {pendingMode && (
            <>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">{MODE_INFO[pendingMode].title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {MODE_INFO[pendingMode].description}
                    </p>
                  </div>
                </div>
              </div>

              {MODE_INFO[pendingMode].warning && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {MODE_INFO[pendingMode].warning}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Importante:</strong> Los trades, métricas e insights se filtrarán automáticamente por el modo seleccionado. 
                  Los datos históricos de otros modos permanecerán intactos.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar Cambio
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

