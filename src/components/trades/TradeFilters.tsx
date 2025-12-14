import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import type { TradeFilters as TradeFiltersType, TradingSession } from '@/types/Trading';
import { useSetupStore } from '@/store/setupStore';

interface TradeFiltersProps {
  filters: TradeFiltersType;
  onFiltersChange: (filters: Partial<TradeFiltersType>) => void;
  onClearFilters: () => void;
  uniqueAssets: string[];
}

export const TradeFiltersComponent: React.FC<TradeFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  uniqueAssets,
}) => {
  const { setups, loadSetups } = useSetupStore();
  const [showAllFilters, setShowAllFilters] = useState(false);
  
  useEffect(() => {
    loadSetups();
  }, [loadSetups]);

  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.asset || 
    filters.winLoss || 
    filters.status ||
    filters.session ||
    filters.setupId ||
    filters.minRiskReward !== null ||
    filters.riskPercentMin !== null ||
    filters.riskPercentMax !== null ||
    filters.ruleStatus ||
    filters.classification;

  // Quick presets
  const applyPreset = (preset: 'last20' | 'onlyLosses' | 'ruleViolations' | 'tradeModelos') => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    
    switch (preset) {
      case 'last20':
        onFiltersChange({
          dateFrom: twentyDaysAgo.toISOString().split('T')[0],
          dateTo: now.toISOString().split('T')[0],
          winLoss: null,
          ruleStatus: null,
          classification: null,
        });
        break;
      case 'onlyLosses':
        onFiltersChange({
          winLoss: 'loss',
          ruleStatus: null,
          classification: null,
        });
        break;
      case 'ruleViolations':
        onFiltersChange({
          ruleStatus: 'violations',
          winLoss: null,
          classification: null,
        });
        break;
      case 'tradeModelos':
        onFiltersChange({
          classification: 'modelo',
          winLoss: null,
          ruleStatus: null,
        });
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filtros</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Presets */}
        <div className="mb-4 pb-4 border-b">
          <Label className="mb-2 block">Presets Rápidos</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('last20')}
            >
              Últimos 20 trades
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('onlyLosses')}
            >
              Solo pérdidas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('ruleViolations')}
            >
              Violaciones de reglas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('tradeModelos')}
            >
              Trades modelo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Primeros 8 filtros - siempre visibles */}
          <div>
            <Label htmlFor="dateFrom">Fecha Desde</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onFiltersChange({ dateFrom: e.target.value || null })}
            />
          </div>

          <div>
            <Label htmlFor="dateTo">Fecha Hasta</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onFiltersChange({ dateTo: e.target.value || null })}
              min={filters.dateFrom || undefined}
            />
          </div>

          <div>
            <Label htmlFor="asset">Activo</Label>
            <Select
              id="asset"
              value={filters.asset || ''}
              onChange={(e) => onFiltersChange({ asset: e.target.value || null })}
            >
              <option value="">Todos los Activos</option>
              {uniqueAssets.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="winLoss">Ganancia/Pérdida</Label>
            <Select
              id="winLoss"
              value={filters.winLoss || 'all'}
              onChange={(e) => onFiltersChange({ winLoss: e.target.value === 'all' ? null : e.target.value as 'win' | 'loss' })}
            >
              <option value="all">Todas</option>
              <option value="win">Ganadoras</option>
              <option value="loss">Perdedoras</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              id="status"
              value={filters.status || 'all'}
              onChange={(e) => onFiltersChange({ status: e.target.value === 'all' ? null : e.target.value as 'open' | 'closed' })}
            >
              <option value="all">Todas</option>
              <option value="open">Abiertas</option>
              <option value="closed">Cerradas</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="groupBy">Agrupar Por</Label>
            <Select
              id="groupBy"
              value={filters.groupBy || 'none'}
              onChange={(e) => onFiltersChange({ groupBy: e.target.value === 'none' ? null : e.target.value as 'day' | 'week' | 'month' })}
            >
              <option value="none">Sin agrupar</option>
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="session">Sesión</Label>
            <Select
              id="session"
              value={filters.session || 'all'}
              onChange={(e) => onFiltersChange({ session: e.target.value === 'all' ? null : e.target.value as TradingSession })}
            >
              <option value="all">Todas</option>
              <option value="asian">Asiática</option>
              <option value="london">Londres</option>
              <option value="new-york">Nueva York</option>
              <option value="overlap">Overlap</option>
              <option value="other">Otra</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="setupId">Setup</Label>
            <Select
              id="setupId"
              value={filters.setupId || ''}
              onChange={(e) => onFiltersChange({ setupId: e.target.value || null })}
            >
              <option value="">Todos</option>
              {setups.map((setup) => (
                <option key={setup.id} value={setup.id}>
                  {setup.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Filtros adicionales - se muestran solo si showAllFilters es true */}
          {showAllFilters && (
            <>
              <div>
                <Label htmlFor="minRiskReward">R/R Mínimo</Label>
                <Input
                  id="minRiskReward"
                  type="number"
                  step="0.1"
                  min="0"
                  value={filters.minRiskReward || ''}
                  onChange={(e) => onFiltersChange({ 
                    minRiskReward: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="Ej: 1.5"
                />
              </div>

              <div>
                <Label htmlFor="riskPercentMin">Riesgo % Mín</Label>
                <Input
                  id="riskPercentMin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={filters.riskPercentMin || ''}
                  onChange={(e) => onFiltersChange({ 
                    riskPercentMin: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="Ej: 0.5"
                />
              </div>

              <div>
                <Label htmlFor="riskPercentMax">Riesgo % Máx</Label>
                <Input
                  id="riskPercentMax"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={filters.riskPercentMax || ''}
                  onChange={(e) => onFiltersChange({ 
                    riskPercentMax: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="Ej: 2.0"
                />
              </div>

              <div>
                <Label htmlFor="ruleStatus">Estado de Reglas</Label>
                <Select
                  id="ruleStatus"
                  value={filters.ruleStatus || 'all'}
                  onChange={(e) => onFiltersChange({ 
                    ruleStatus: e.target.value === 'all' ? null : e.target.value as 'compliant' | 'violations' 
                  })}
                >
                  <option value="all">Todas</option>
                  <option value="compliant">Solo cumplidas</option>
                  <option value="violations">Solo violaciones</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="classification">Clasificación</Label>
                <Select
                  id="classification"
                  value={filters.classification || 'all'}
                  onChange={(e) => onFiltersChange({ 
                    classification: e.target.value === 'all' ? null : e.target.value as 'modelo' | 'neutral' | 'error' 
                  })}
                >
                  <option value="all">Todas</option>
                  <option value="modelo">Trade Modelo</option>
                  <option value="neutral">Neutral</option>
                  <option value="error">Error</option>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Botón para mostrar/ocultar filtros adicionales */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllFilters(!showAllFilters)}
            className="flex items-center gap-2"
          >
            {showAllFilters ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Mostrar menos filtros
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mostrar más filtros
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

