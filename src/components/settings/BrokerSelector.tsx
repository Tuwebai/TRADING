/**
 * Broker Selector Component
 * Autocomplete searchable para seleccionar un broker conocido
 */

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { searchBrokers, getBrokerInfo, type BrokerInfo } from '@/lib/supabaseBrokerAccounts';
import { Search, ChevronDown, Check } from 'lucide-react';

interface BrokerSelectorProps {
  value: string | null;
  onSelect: (broker: BrokerInfo | null) => void;
  error?: string;
  disabled?: boolean;
}

export const BrokerSelector: React.FC<BrokerSelectorProps> = ({
  value,
  onSelect,
  error,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBroker = value ? getBrokerInfo(value) : null;
  const filteredBrokers = searchBrokers(query);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsOpen(true);
    setHighlightedIndex(0);

    // Si el usuario borra todo, limpiar selección
    if (!newQuery.trim()) {
      onSelect(null);
    }
  };

  const handleSelect = (broker: BrokerInfo) => {
    setQuery(broker.name);
    onSelect(broker);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev + 1) % filteredBrokers.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev - 1 + filteredBrokers.length) % filteredBrokers.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredBrokers[highlightedIndex]) {
          handleSelect(filteredBrokers[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Label htmlFor="broker-selector">Broker *</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="broker-selector"
            type="text"
            value={query || selectedBroker?.name || ''}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Buscar broker (ej: MetaTrader, Binance...)"
            disabled={disabled}
            className={`pl-10 pr-10 ${error ? 'border-red-500' : ''}`}
            autoComplete="off"
          />
          <ChevronDown
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {isOpen && !disabled && filteredBrokers.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto" style={{ backgroundColor: 'var(--background)' }}>
            {filteredBrokers.map((broker, index) => (
              <div
                key={broker.name}
                onClick={() => handleSelect(broker)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between ${
                  index === highlightedIndex
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                } ${
                  selectedBroker?.name === broker.name ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium">{broker.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {broker.platforms.join(', ')} • {broker.description}
                  </div>
                </div>
                {selectedBroker?.name === broker.name && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        )}

        {isOpen && !disabled && filteredBrokers.length === 0 && query.trim() && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-4 text-sm text-muted-foreground" style={{ backgroundColor: 'var(--background)' }}>
            No se encontraron brokers. Selecciona uno de la lista.
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {selectedBroker && (
        <div className="mt-2 p-2 bg-muted rounded-md text-sm">
          <div className="font-medium">{selectedBroker.name}</div>
          <div className="text-muted-foreground mt-1">
            Plataformas: {selectedBroker.platforms.join(', ')}
          </div>
          <div className="text-muted-foreground">
            Tipos de integración: {selectedBroker.integrationTypes.map(t => {
              const labels: Record<string, string> = {
                ea: 'Expert Advisor',
                api: 'API Oficial',
                manual: 'Manual',
              };
              return labels[t];
            }).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

