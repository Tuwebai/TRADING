import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { CollapsibleWithTitle } from '@/components/ui/CollapsibleWithTitle';
import { TagSelector } from './TagSelector';
import { ImageUpload } from './ImageUpload';
import { VideoLinks } from './VideoLinks';
import { JournalSection } from './JournalSection';
import { AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useTradeStore } from '@/store/tradeStore';
import { checkTradingRules } from '@/lib/tradingRules';
import type { RuleViolation } from '@/lib/tradingRules';
import type { TradeFormData, PositionType, Trade, TradeJournal } from '@/types/Trading';

interface TradeFormProps {
  trade?: Trade | null;
  onSubmit: (data: TradeFormData) => void;
  onCancel: () => void;
}

export const TradeForm: React.FC<TradeFormProps> = ({ trade, onSubmit, onCancel }) => {
  const { settings } = useSettingsStore();
  const { trades } = useTradeStore();
  
  const defaultJournal: TradeJournal = {
    preTrade: {
      technicalAnalysis: '',
      marketSentiment: '',
      entryReasons: '',
      emotion: null,
    },
    duringTrade: {
      marketChanges: '',
      stopLossAdjustments: '',
      takeProfitAdjustments: '',
      emotion: null,
    },
    postTrade: {
      whatWentWell: '',
      whatWentWrong: '',
      lessonsLearned: '',
      emotion: null,
    },
  };

  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([]);
  
  const [formData, setFormData] = useState<TradeFormData>({
    asset: '',
    positionType: 'long',
    entryPrice: 0,
    exitPrice: null,
    positionSize: 0,
    leverage: null,
    stopLoss: null,
    takeProfit: null,
    entryDate: new Date().toISOString().split('T')[0],
    exitDate: null,
    notes: '',
    screenshots: [],
    videos: [],
    tags: [],
    journal: defaultJournal,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TradeFormData, string>>>({});

  useEffect(() => {
    if (trade) {
      setFormData({
        asset: trade.asset,
        positionType: trade.positionType,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        positionSize: trade.positionSize,
        leverage: trade.leverage,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        entryDate: trade.entryDate.split('T')[0],
        exitDate: trade.exitDate ? trade.exitDate.split('T')[0] : null,
        notes: trade.notes || '',
        screenshots: trade.screenshots || [],
        videos: trade.videos || [],
        tags: trade.tags || [],
        journal: trade.journal || defaultJournal,
      });
    }
  }, [trade]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TradeFormData, string>> = {};

    if (!formData.asset.trim()) {
      newErrors.asset = 'El activo es requerido';
    }

    if (formData.entryPrice <= 0) {
      newErrors.entryPrice = 'El precio de entrada debe ser mayor que 0';
    }

    if (formData.positionSize <= 0) {
      newErrors.positionSize = 'El tamaño de la posición debe ser mayor que 0';
    }
    
    // Validate against trading rules
    if (!trade && settings.advanced?.tradingRules.maxLotSize !== null && settings.advanced) {
      if (formData.positionSize > settings.advanced.tradingRules.maxLotSize!) {
        newErrors.positionSize = `El tamaño de lote máximo permitido es ${settings.advanced.tradingRules.maxLotSize}. Tu tamaño actual: ${formData.positionSize}`;
      }
    }

    if (formData.exitPrice !== null && formData.exitPrice <= 0) {
      newErrors.exitPrice = 'El precio de salida debe ser mayor que 0';
    }

    if (formData.leverage !== null && formData.leverage <= 0) {
      newErrors.leverage = 'El apalancamiento debe ser mayor que 0';
    }

    if (formData.stopLoss !== null && formData.stopLoss <= 0) {
      newErrors.stopLoss = 'El stop loss debe ser mayor que 0';
    }

    if (formData.takeProfit !== null && formData.takeProfit <= 0) {
      newErrors.takeProfit = 'El take profit debe ser mayor que 0';
    }

    if (formData.exitDate && formData.exitDate < formData.entryDate) {
      newErrors.exitDate = 'La fecha de salida no puede ser anterior a la fecha de entrada';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check rules when form data changes
  useEffect(() => {
    if (!trade) { // Only check for new trades
      const violations = checkTradingRules(trades, settings, {
        positionSize: formData.positionSize,
        entryDate: formData.entryDate,
        asset: formData.asset,
      });
      setRuleViolations(violations);
    } else {
      setRuleViolations([]);
    }
  }, [formData.positionSize, formData.entryDate, formData.asset, trade, trades, settings]);
  
  // Check if there are critical violations that should block submission
  const hasCriticalViolations = ruleViolations.some((v: RuleViolation) => v.severity === 'error');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rules again before submitting
    if (!trade) {
      const violations = checkTradingRules(trades, settings, {
        positionSize: formData.positionSize,
        entryDate: formData.entryDate,
        asset: formData.asset,
      });
      
      const criticalViolations = violations.filter(v => v.severity === 'error');
      
      if (criticalViolations.length > 0) {
        // Prevent submission if there are critical violations
        alert(`⚠️ No se puede crear la operación:\n\n${criticalViolations.map(v => `• ${v.message}`).join('\n')}`);
        return;
      }
    }
    
    if (validate()) {
      onSubmit({
        ...formData,
        entryDate: new Date(formData.entryDate).toISOString(),
        exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : null,
        screenshots: formData.screenshots,
        videos: formData.videos,
        tags: formData.tags,
        journal: formData.journal,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rule Warnings and Errors */}
      {ruleViolations.length > 0 && !trade && (
        <div className={`p-3 border rounded-md ${
          hasCriticalViolations 
            ? 'bg-red-500/10 border-red-500/50' 
            : 'bg-yellow-500/10 border-yellow-500/50'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              hasCriticalViolations ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${
                hasCriticalViolations 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {hasCriticalViolations ? '❌ Violación de Reglas (No se puede crear la operación)' : '⚠️ Advertencias de Reglas:'}
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {ruleViolations.map((violation, index) => (
                  <li key={violation.id || index} className={violation.severity === 'error' ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                    {violation.severity === 'error' ? '❌' : '⚠️'} {violation.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="asset">Activo *</Label>
          <Input
            id="asset"
            value={formData.asset}
            onChange={(e) => {
              setFormData({ ...formData, asset: e.target.value });
              if (errors.asset) {
                setErrors({ ...errors, asset: undefined });
              }
            }}
            placeholder="ej: BTC/USD"
            error={!!errors.asset}
            required
          />
          {errors.asset && <p className="text-sm text-destructive mt-1">{errors.asset}</p>}
        </div>

        <div>
          <Label htmlFor="positionType">Tipo de Posición *</Label>
          <Select
            id="positionType"
            value={formData.positionType}
            onChange={(e) => setFormData({ ...formData, positionType: e.target.value as PositionType })}
          >
            <option value="long">Largo</option>
            <option value="short">Corto</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="entryPrice">Precio de Entrada *</Label>
          <Input
            id="entryPrice"
            type="number"
            step="0.0001"
            value={formData.entryPrice || ''}
            onChange={(e) => {
              setFormData({ ...formData, entryPrice: parseFloat(e.target.value) || 0 });
              if (errors.entryPrice) {
                setErrors({ ...errors, entryPrice: undefined });
              }
            }}
            error={!!errors.entryPrice}
            required
          />
          {errors.entryPrice && <p className="text-sm text-destructive mt-1">{errors.entryPrice}</p>}
        </div>

        <div>
          <Label htmlFor="exitPrice">Precio de Salida</Label>
          <Input
            id="exitPrice"
            type="number"
            step="0.0001"
            value={formData.exitPrice || ''}
            onChange={(e) => {
              setFormData({ ...formData, exitPrice: e.target.value ? parseFloat(e.target.value) : null });
              if (errors.exitPrice) {
                setErrors({ ...errors, exitPrice: undefined });
              }
            }}
            error={!!errors.exitPrice}
          />
          {errors.exitPrice && <p className="text-sm text-destructive mt-1">{errors.exitPrice}</p>}
        </div>

        <div>
          <Label htmlFor="positionSize">Tamaño de Posición *</Label>
          <Input
            id="positionSize"
            type="number"
            step="0.01"
            value={formData.positionSize || ''}
            onChange={(e) => {
              setFormData({ ...formData, positionSize: parseFloat(e.target.value) || 0 });
              if (errors.positionSize) {
                setErrors({ ...errors, positionSize: undefined });
              }
            }}
            error={!!errors.positionSize}
            required
          />
          {errors.positionSize && <p className="text-sm text-destructive mt-1">{errors.positionSize}</p>}
        </div>

        <div>
          <Label htmlFor="leverage">Apalancamiento</Label>
          <Input
            id="leverage"
            type="number"
            step="0.1"
            value={formData.leverage || ''}
            onChange={(e) => setFormData({ ...formData, leverage: e.target.value ? parseFloat(e.target.value) : null })}
          />
          {errors.leverage && <p className="text-sm text-destructive mt-1">{errors.leverage}</p>}
        </div>

        <div>
          <Label htmlFor="stopLoss">Stop Loss</Label>
          <Input
            id="stopLoss"
            type="number"
            step="0.0001"
            value={formData.stopLoss || ''}
            onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value ? parseFloat(e.target.value) : null })}
          />
          {errors.stopLoss && <p className="text-sm text-destructive mt-1">{errors.stopLoss}</p>}
        </div>

        <div>
          <Label htmlFor="takeProfit">Take Profit</Label>
          <Input
            id="takeProfit"
            type="number"
            step="0.0001"
            value={formData.takeProfit || ''}
            onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value ? parseFloat(e.target.value) : null })}
          />
          {errors.takeProfit && <p className="text-sm text-destructive mt-1">{errors.takeProfit}</p>}
        </div>

        <div>
          <Label htmlFor="entryDate">Fecha de Entrada *</Label>
          <Input
            id="entryDate"
            type="date"
            value={formData.entryDate}
            onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="exitDate">Fecha de Salida</Label>
          <Input
            id="exitDate"
            type="date"
            value={formData.exitDate || ''}
            onChange={(e) => setFormData({ ...formData, exitDate: e.target.value || null })}
            min={formData.entryDate}
          />
          {errors.exitDate && <p className="text-sm text-destructive mt-1">{errors.exitDate}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas Generales</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Notas adicionales sobre esta operación..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Journaling Avanzado</h2>
            <p className="text-sm text-muted-foreground">
              Registra análisis, emociones y aprendizajes de esta operación
            </p>
          </div>
        </div>

        <CollapsibleWithTitle
          title="Pre-Operación"
          description="Análisis y razones antes de abrir la operación"
          defaultOpen={false}
        >
          <JournalSection
            journal={formData.journal}
            onChange={(journal) => setFormData({ ...formData, journal })}
            section="preTrade"
          />
        </CollapsibleWithTitle>

        <CollapsibleWithTitle
          title="Durante la Operación"
          description="Cambios y ajustes mientras la operación está abierta"
          defaultOpen={false}
        >
          <JournalSection
            journal={formData.journal}
            onChange={(journal) => setFormData({ ...formData, journal })}
            section="duringTrade"
            disabled={!trade && !formData.exitPrice}
          />
        </CollapsibleWithTitle>

        <CollapsibleWithTitle
          title="Post-Operación"
          description="Reflexión y aprendizaje después de cerrar"
          defaultOpen={false}
        >
          <JournalSection
            journal={formData.journal}
            onChange={(journal) => setFormData({ ...formData, journal })}
            section="postTrade"
            disabled={!formData.exitPrice}
          />
        </CollapsibleWithTitle>
      </div>

      <CollapsibleWithTitle
        title="Multimedia y Referencias"
        description="Screenshots, gráficos y videos de la operación"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <ImageUpload
            images={formData.screenshots}
            onChange={(screenshots) => setFormData({ ...formData, screenshots })}
          />

          <VideoLinks
            videos={formData.videos}
            onChange={(videos) => setFormData({ ...formData, videos })}
          />
        </div>
      </CollapsibleWithTitle>

      <CollapsibleWithTitle
        title="Organización"
        description="Etiqueta tu operación para facilitar la búsqueda y análisis"
        defaultOpen={false}
      >
        <TagSelector
          tags={formData.tags}
          onChange={(tags) => setFormData({ ...formData, tags })}
        />
      </CollapsibleWithTitle>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={hasCriticalViolations && !trade}
          title={hasCriticalViolations && !trade ? 'No se puede crear la operación debido a violaciones de reglas' : ''}
        >
          {trade ? 'Actualizar Operación' : 'Agregar Operación'}
        </Button>
      </div>
    </form>
  );
};

