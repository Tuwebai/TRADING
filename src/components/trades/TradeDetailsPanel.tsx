import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Trash2, Copy, TrendingUp, TrendingDown, Clock, Percent, AlertCircle, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSetupStore } from '@/store/setupStore';
import { formatPrice, formatCurrency, formatDateTime } from '@/lib/utils';
import { calculateTradeDuration, calculateTradeRisk, calculateAccountPercentage } from '@/lib/tradeMetrics';
import { isForexPair } from '@/lib/forexCalculations';
import type { Trade } from '@/types/Trading';
import { cn } from '@/lib/utils';

interface TradeDetailsPanelProps {
  trade: Trade;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClose: () => void;
}

export const TradeDetailsPanel: React.FC<TradeDetailsPanelProps> = ({
  trade,
  onEdit,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  const { updateTradeNotes } = useTradeStore();
  const { settings } = useSettingsStore();
  const { getSetup } = useSetupStore();
  const [notes, setNotes] = useState(trade.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const setup = trade.setupId ? getSetup(trade.setupId) : null;
  const isForex = isForexPair(trade.asset);

  // Auto-save notes with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (notes !== trade.notes) {
      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(() => {
        updateTradeNotes(trade.id, notes);
        setIsSaving(false);
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, trade.notes, trade.id, updateTradeNotes]);

  // Handle ESC key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent body scroll when panel is open
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const pnl = trade.pnl || 0;
  const isProfit = pnl > 0;
  const duration = calculateTradeDuration(trade);
  const risk = calculateTradeRisk(trade, settings.currentCapital);
  const accountPercent = calculateAccountPercentage(trade, settings.currentCapital);

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta operación?')) {
      onDelete(trade.id);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 z-50 md:bg-black/30"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-screen w-full md:w-[500px] lg:w-[600px] bg-card border-l shadow-2xl z-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b z-10">
          <div className="flex items-center justify-between p-6">
            <div>
              <h2 className="text-2xl font-bold">{trade.asset}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDateTime(trade.entryDate)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 1. Resumen */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className={`font-semibold mt-1 ${
                    trade.positionType === 'long' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trade.positionType === 'long' ? 'Largo' : 'Corto'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${
                    trade.status === 'open' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {trade.status === 'open' ? 'Abierta' : 'Cerrada'}
                  </span>
                </div>
              </div>

              {trade.status === 'closed' && trade.pnl !== null && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">PnL</p>
                    <div className={`flex items-center gap-2 text-2xl font-bold ${
                      isProfit ? 'text-profit' : 'text-loss'
                    }`}>
                      {isProfit ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                      {formatCurrency(pnl, settings.baseCurrency)}
                    </div>
                  </div>
                </div>
              )}

              {trade.riskReward && (
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Risk/Reward</p>
                    <p className="font-semibold">{trade.riskReward.toFixed(2)}R</p>
                  </div>
                </div>
              )}

              {isForex && trade.pips !== null && trade.pips !== undefined && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Pips</p>
                    <p className={`font-semibold ${trade.pips >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {trade.pips > 0 ? '+' : ''}{trade.pips.toFixed(1)} pips
                    </p>
                  </div>
                  {trade.riskPips && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">Riesgo</p>
                      <p className="text-xs font-medium">{trade.riskPips.toFixed(1)} pips</p>
                    </div>
                  )}
                </div>
              )}

              {trade.session && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Sesión</p>
                    <p className="font-semibold capitalize">
                      {trade.session === 'new-york' ? 'Nueva York' : 
                       trade.session === 'overlap' ? 'Overlap' :
                       trade.session.charAt(0).toUpperCase() + trade.session.slice(1)}
                    </p>
                  </div>
                </div>
              )}

              {setup && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Setup</p>
                    <p className="font-semibold">{setup.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Ejecución */}
          <Card>
            <CardHeader>
              <CardTitle>Ejecución</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Precio de Entrada</p>
                  <p className="font-semibold mt-1">{formatPrice(trade.entryPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precio de Salida</p>
                  <p className="font-semibold mt-1">
                    {trade.exitPrice ? formatPrice(trade.exitPrice) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tamaño / Lotaje</p>
                  <p className="font-semibold mt-1">{trade.positionSize}</p>
                </div>
                {trade.leverage && (
                  <div>
                    <p className="text-sm text-muted-foreground">Apalancamiento</p>
                    <p className="font-semibold mt-1">{trade.leverage}x</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Stop Loss</p>
                  <p className="font-semibold mt-1">
                    {trade.stopLoss ? formatPrice(trade.stopLoss) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Take Profit</p>
                  <p className="font-semibold mt-1">
                    {trade.takeProfit ? formatPrice(trade.takeProfit) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Métricas Calculadas */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duración</p>
                    <p className="font-semibold mt-1">{duration.formatted}</p>
                  </div>
                </div>
                {risk.riskAmount > 0 && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Riesgo Asumido</p>
                      <p className="font-semibold mt-1">
                        {formatCurrency(risk.riskAmount, settings.baseCurrency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ({risk.riskPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Percent className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">% de la Cuenta</p>
                    <p className="font-semibold mt-1">{accountPercent.toFixed(2)}%</p>
                  </div>
                </div>
              </div>

              {/* Costos */}
              {(trade.commission || trade.spread || trade.swap) && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Costos</h4>
                  <div className="space-y-2">
                    {trade.commission && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Comisión</span>
                        <span className="font-medium">{formatCurrency(trade.commission, settings.baseCurrency)}</span>
                      </div>
                    )}
                    {trade.spread && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Spread</span>
                        <span className="font-medium">{formatCurrency(trade.spread, settings.baseCurrency)}</span>
                      </div>
                    )}
                    {trade.swap && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Swap</span>
                        <span className={`font-medium ${trade.swap >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrency(trade.swap, settings.baseCurrency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t">
                      <span>Total Costos</span>
                      <span>
                        {formatCurrency(
                          (trade.commission || 0) + (trade.spread || 0) + (trade.swap || 0),
                          settings.baseCurrency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3.5. Evaluación de Reglas */}
          {trade.evaluatedRules && trade.evaluatedRules.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Evaluación de Reglas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {trade.evaluatedRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border-2',
                      rule.respected
                        ? 'border-green-500/50 bg-green-500/10'
                        : rule.severity === 'critical'
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-yellow-500/50 bg-yellow-500/10'
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {rule.respected ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className={cn(
                          'h-5 w-5',
                          rule.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                        )} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{rule.ruleName}</p>
                      {!rule.respected && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Esperado:</span>
                            <span className="font-medium">{String(rule.expectedValue)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Actual:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {String(rule.actualValue)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Trade Classification */}
                {trade.tradeClassification && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Clasificación del Trade</p>
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold',
                        trade.tradeClassification === 'modelo'
                          ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                          : trade.tradeClassification === 'error'
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                      )}>
                        {trade.tradeClassification === 'modelo' ? 'Trade Modelo' :
                         trade.tradeClassification === 'error' ? 'Error' :
                         'Neutral'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 4. Notas del Trader */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notas</CardTitle>
                {isSaving && (
                  <span className="text-xs text-muted-foreground">Guardando...</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega notas sobre esta operación..."
                className="min-h-[120px] resize-none"
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Las notas se guardan automáticamente
              </p>
            </CardContent>
          </Card>

          {/* Tags */}
          {trade.tags && trade.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Etiquetas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trade.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. Acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onEdit(trade);
                    onClose();
                  }}
                  className="w-full justify-start"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Operación
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onDuplicate(trade.id);
                    onClose();
                  }}
                  className="w-full justify-start"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Operación
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="w-full justify-start text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Operación
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

