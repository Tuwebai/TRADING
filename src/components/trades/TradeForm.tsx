import React, { useState, useEffect, useRef } from 'react';
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
import { useSetupStore } from '@/store/setupStore';
import { checkTradingRules } from '@/lib/tradingRules';
import type { RuleViolation } from '@/lib/tradingRules';
import type { TradeFormData, PositionType, Trade, TradeJournal, TradingSession } from '@/types/Trading';
import { isForexPair, calculateSwap } from '@/lib/forexCalculations';
import { 
  getContextualSuggestions, 
  getHistoricalWarnings, 
  findSimilarTrades,
  hasEnoughContextData,
  type ContextualSuggestion,
  type HistoricalWarning,
  type SimilarTrade
} from '@/lib/tradeContext';
import { ContextualSuggestions } from './ContextualSuggestions';
import { HistoricalWarnings } from './HistoricalWarnings';
import { SimilarTradeModal } from './SimilarTradeModal';

interface TradeFormProps {
  trade?: Trade | null;
  initialFormData?: TradeFormData | Partial<TradeFormData>;
  onSubmit: (data: TradeFormData) => void;
  onCancel: () => void;
  autoDetectedFields?: string[]; // Fields that were auto-detected from OCR
  ocrImageBase64?: string; // Base64 image from OCR to include in screenshots
  onViewTrade?: (tradeId: string) => void; // Callback to view a trade (for similar trades modal)
}

export const TradeForm: React.FC<TradeFormProps> = ({ 
  trade, 
  initialFormData, 
  onSubmit, 
  onCancel,
  autoDetectedFields = [],
  ocrImageBase64,
  onViewTrade,
}) => {
  const { settings } = useSettingsStore();
  const { trades } = useTradeStore();
  const { setups, loadSetups } = useSetupStore();
  
  useEffect(() => {
    loadSetups();
  }, [loadSetups]);
  
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
  const [contextualSuggestions, setContextualSuggestions] = useState<ContextualSuggestion[]>([]);
  const [historicalWarnings, setHistoricalWarnings] = useState<HistoricalWarning[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [showSimilarTradeModal, setShowSimilarTradeModal] = useState(false);
  const [similarTrades, setSimilarTrades] = useState<SimilarTrade[]>([]);
  
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
    commission: undefined,
    spread: undefined,
    swap: undefined,
    swapRate: undefined,
    swapType: undefined,
    session: undefined,
    setupId: undefined,
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
        commission: trade.commission,
        spread: trade.spread,
        swap: trade.swap ?? undefined,
        swapRate: trade.swapRate,
        swapType: trade.swapType,
        session: trade.session,
        setupId: trade.setupId,
      });
    } else if (initialFormData) {
      // Merge initial form data (from template or OCR)
      // Only apply on first load - don't overwrite user edits
      setFormData(prev => {
        // Check if form is still in default/empty state (first load)
        const isFirstLoad = prev.asset === '' && prev.entryPrice === 0 && prev.positionSize === 0;
        
        if (isFirstLoad) {
          // First load: apply all initialFormData
          return {
            ...prev,
            ...initialFormData,
            // Preserve default journal structure
            journal: initialFormData.journal || defaultJournal,
            // Add OCR image to screenshots if provided
            screenshots: ocrImageBase64 
              ? [ocrImageBase64, ...(initialFormData.screenshots || [])]
              : (initialFormData.screenshots || []),
            // Don't reset entry date if provided in initialFormData
            entryDate: initialFormData.entryDate || prev.entryDate || new Date().toISOString().split('T')[0],
          };
        } else {
          // User has already edited - only update screenshots if OCR image is new
          return {
            ...prev,
            screenshots: ocrImageBase64 && !prev.screenshots.includes(ocrImageBase64)
              ? [ocrImageBase64, ...prev.screenshots]
              : prev.screenshots,
          };
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade]);
  
  // Separate effect for initialFormData - only run once on mount
  const hasAppliedInitialData = useRef(false);
  useEffect(() => {
    if (!trade && initialFormData && !hasAppliedInitialData.current) {
      setFormData(prev => {
        // Only apply if form is still in default state
        const isFirstLoad = prev.asset === '' && prev.entryPrice === 0 && prev.positionSize === 0;
        if (isFirstLoad) {
          hasAppliedInitialData.current = true;
          return {
            ...prev,
            ...initialFormData,
            journal: initialFormData.journal || defaultJournal,
            screenshots: ocrImageBase64 
              ? [ocrImageBase64, ...(initialFormData.screenshots || [])]
              : (initialFormData.screenshots || []),
            entryDate: initialFormData.entryDate || prev.entryDate || new Date().toISOString().split('T')[0],
          };
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to check if a field was auto-detected
  const isAutoDetected = (fieldName: string): boolean => {
    return autoDetectedFields.includes(fieldName);
  };

  // Component for field label with auto-detected indicator
  const FieldLabel: React.FC<{ htmlFor: string; required?: boolean; children: React.ReactNode }> = ({ 
    htmlFor, 
    required, 
    children 
  }) => {
    const autoDetected = isAutoDetected(htmlFor);
    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor} className={required ? 'required' : ''}>
          {children}
        </Label>
        {autoDetected && (
          <span 
            className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1"
            title="Detectado desde imagen"
          >
            ✓ Auto
          </span>
        )}
      </div>
    );
  };

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

  // Analyze historical context when enough data is available
  useEffect(() => {
    if (!trade && hasEnoughContextData(formData)) {
      // Get contextual suggestions
      const suggestions = getContextualSuggestions(formData, trades, 5);
      // Filter out dismissed suggestions
      const activeSuggestions = suggestions.filter(s => {
        const key = `${s.type}_${s.suggestedValue || ''}`;
        return !dismissedSuggestions.has(key);
      });
      setContextualSuggestions(activeSuggestions);

      // Get historical warnings
      const warnings = getHistoricalWarnings(formData, trades);
      setHistoricalWarnings(warnings);
    } else {
      setContextualSuggestions([]);
      setHistoricalWarnings([]);
    }
  }, [formData.asset, formData.entryDate, formData.entryPrice, formData.stopLoss, formData.takeProfit, trades, trade, dismissedSuggestions]);

  // Calculate swap automatically for forex trades
  useEffect(() => {
    if (isForexPair(formData.asset) && formData.swapRate && formData.entryDate && formData.exitDate) {
      const tempTrade: Trade = {
        id: '',
        asset: formData.asset,
        positionType: formData.positionType,
        entryPrice: formData.entryPrice,
        exitPrice: formData.exitPrice,
        positionSize: formData.positionSize,
        leverage: formData.leverage,
        stopLoss: formData.stopLoss,
        takeProfit: formData.takeProfit,
        entryDate: formData.entryDate,
        exitDate: formData.exitDate,
        notes: formData.notes,
        screenshots: formData.screenshots,
        videos: formData.videos,
        tags: formData.tags,
        journal: formData.journal,
        status: formData.exitPrice ? 'closed' : 'open',
        pnl: null,
        riskReward: null,
        createdAt: '',
        updatedAt: '',
      };
      
      const calculatedSwap = calculateSwap(
        tempTrade,
        formData.swapRate,
        formData.swapType || 'both'
      );
      
      if (Math.abs(calculatedSwap - (formData.swap || 0)) > 0.01) {
        setFormData(prev => ({ ...prev, swap: calculatedSwap }));
      }
    } else if (!isForexPair(formData.asset) || !formData.swapRate || !formData.exitDate) {
      if (formData.swap !== undefined && formData.swap !== null) {
        setFormData(prev => ({ ...prev, swap: undefined }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.asset, formData.swapRate, formData.swapType, formData.entryDate, formData.exitDate, formData.positionSize, formData.positionType]);
  
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
      // Check for similar trades before submitting (only for new trades)
      if (!trade && hasEnoughContextData(formData)) {
        const similar = findSimilarTrades(formData, trades, 3);
        if (similar.length > 0) {
          setSimilarTrades(similar);
          setShowSimilarTradeModal(true);
          return; // Don't submit yet, wait for user decision
        }
      }
      
      // Submit trade
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

  const handleContinueWithoutReview = () => {
    setShowSimilarTradeModal(false);
    // Submit trade
    onSubmit({
      ...formData,
      entryDate: new Date(formData.entryDate).toISOString(),
      exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : null,
      screenshots: formData.screenshots,
      videos: formData.videos,
      tags: formData.tags,
      journal: formData.journal,
    });
  };

  const handleApplySuggestion = (suggestion: ContextualSuggestion) => {
    if (suggestion.type === 'strategy' && suggestion.suggestedValue) {
      setFormData(prev => ({ ...prev, setupId: suggestion.suggestedValue }));
    } else if (suggestion.type === 'tag' && suggestion.suggestedValue) {
      setFormData(prev => ({
        ...prev,
        tags: prev.tags.includes(suggestion.suggestedValue!)
          ? prev.tags
          : [...prev.tags, suggestion.suggestedValue!],
      }));
    } else if (suggestion.type === 'session' && suggestion.suggestedValue) {
      setFormData(prev => ({ ...prev, session: suggestion.suggestedValue as TradingSession }));
    }
    
    // Mark as dismissed to avoid showing again
    const key = `${suggestion.type}_${suggestion.suggestedValue || ''}`;
    setDismissedSuggestions(prev => new Set(prev).add(key));
  };

  const handleDismissSuggestion = (suggestion: ContextualSuggestion) => {
    const key = `${suggestion.type}_${suggestion.suggestedValue || ''}`;
    setDismissedSuggestions(prev => new Set(prev).add(key));
  };

  return (
    <>
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

      {/* Contextual Suggestions - Only show if enough data and not dismissed */}
      {contextualSuggestions.length > 0 && (
        <div className="mb-4">
          <ContextualSuggestions
            suggestions={contextualSuggestions}
            onApply={handleApplySuggestion}
            onDismiss={handleDismissSuggestion}
          />
        </div>
      )}

      {/* Historical Warnings - Only show if there are warnings */}
      {historicalWarnings.length > 0 && (
        <div className="mb-4">
          <HistoricalWarnings warnings={historicalWarnings} />
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="asset" required>Activo</FieldLabel>
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
            className={isAutoDetected('asset') ? 'border-green-500/50 bg-green-500/5' : ''}
          />
          {errors.asset && <p className="text-sm text-destructive mt-1">{errors.asset}</p>}
        </div>

        <div>
          <FieldLabel htmlFor="positionType" required>Tipo de Posición</FieldLabel>
          <Select
            id="positionType"
            value={formData.positionType}
            onChange={(e) => setFormData({ ...formData, positionType: e.target.value as PositionType })}
            className={isAutoDetected('positionType') ? 'border-green-500/50 bg-green-500/5' : ''}
          >
            <option value="long">Largo</option>
            <option value="short">Corto</option>
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="entryPrice" required>Precio de Entrada</FieldLabel>
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
            className={isAutoDetected('entryPrice') ? 'border-green-500/50 bg-green-500/5' : ''}
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
          <FieldLabel htmlFor="stopLoss">Stop Loss</FieldLabel>
          <Input
            id="stopLoss"
            type="number"
            step="0.0001"
            value={formData.stopLoss || ''}
            onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value ? parseFloat(e.target.value) : null })}
            className={isAutoDetected('stopLoss') ? 'border-green-500/50 bg-green-500/5' : ''}
          />
          {errors.stopLoss && <p className="text-sm text-destructive mt-1">{errors.stopLoss}</p>}
        </div>

        <div>
          <FieldLabel htmlFor="takeProfit">Take Profit</FieldLabel>
          <Input
            id="takeProfit"
            type="number"
            step="0.0001"
            value={formData.takeProfit || ''}
            onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value ? parseFloat(e.target.value) : null })}
            className={isAutoDetected('takeProfit') ? 'border-green-500/50 bg-green-500/5' : ''}
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

      <CollapsibleWithTitle
        title="Costos y Configuración Avanzada"
        description="Comisiones, spreads, swap y configuración adicional"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commission">Comisión</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={formData.commission || ''}
                onChange={(e) => setFormData({ ...formData, commission: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comisión pagada por esta operación
              </p>
            </div>

            <div>
              <Label htmlFor="spread">Spread</Label>
              <Input
                id="spread"
                type="number"
                step="0.01"
                value={formData.spread || ''}
                onChange={(e) => setFormData({ ...formData, spread: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Costo del spread
              </p>
            </div>
          </div>

          {isForexPair(formData.asset) && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm">Swap (Forex)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="swapRate">Swap Rate (pips)</Label>
                  <Input
                    id="swapRate"
                    type="number"
                    step="0.1"
                    value={formData.swapRate || ''}
                    onChange={(e) => setFormData({ ...formData, swapRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="0.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tasa de swap en pips (puede ser negativa)
                  </p>
                </div>

                <div>
                  <Label htmlFor="swapType">Tipo de Swap</Label>
                  <Select
                    id="swapType"
                    value={formData.swapType || 'both'}
                    onChange={(e) => setFormData({ ...formData, swapType: e.target.value as 'long' | 'short' | 'both' })}
                  >
                    <option value="both">Ambos (Long y Short)</option>
                    <option value="long">Solo Long</option>
                    <option value="short">Solo Short</option>
                  </Select>
                </div>

                {formData.swap !== undefined && formData.swap !== null && (
                  <div className="sm:col-span-2">
                    <Label>Swap Calculado</Label>
                    <Input
                      type="number"
                      value={formData.swap}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Calculado automáticamente basado en swap rate y duración
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label htmlFor="session">Sesión de Trading</Label>
              <Select
                id="session"
                value={formData.session || ''}
                onChange={(e) => setFormData({ ...formData, session: e.target.value ? e.target.value as TradingSession : undefined })}
              >
                <option value="">No especificada</option>
                <option value="asian">Asiática</option>
                <option value="london">Londres</option>
                <option value="new-york">Nueva York</option>
                <option value="overlap">Overlap (Londres/NY)</option>
                <option value="other">Otra</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="setupId">Setup Utilizado</Label>
              <Select
                id="setupId"
                value={formData.setupId || ''}
                onChange={(e) => setFormData({ ...formData, setupId: e.target.value || undefined })}
              >
                <option value="">Ninguno</option>
                {setups.map((setup) => (
                  <option key={setup.id} value={setup.id}>
                    {setup.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
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

    {/* Similar Trade Modal */}
      <SimilarTradeModal
        isOpen={showSimilarTradeModal}
        similarTrades={similarTrades}
        onViewTrade={(tradeId) => {
          if (onViewTrade) {
            onViewTrade(tradeId);
          } else {
            setShowSimilarTradeModal(false);
          }
        }}
        onContinue={handleContinueWithoutReview}
        onClose={() => setShowSimilarTradeModal(false)}
      />
    </>
  );
};

