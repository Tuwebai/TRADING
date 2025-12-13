import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X } from 'lucide-react';
import type { TradeFilters as TradeFiltersType } from '@/types/Trading';

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
  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.asset || 
    filters.winLoss || 
    filters.status;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        </div>
      </CardContent>
    </Card>
  );
};

