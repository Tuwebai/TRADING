/**
 * Contextual Suggestions Component
 * Shows non-intrusive suggestions based on historical patterns
 */

import React from 'react';
import { Check, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ContextualSuggestion } from '@/lib/tradeContext';

interface ContextualSuggestionsProps {
  suggestions: ContextualSuggestion[];
  onApply: (suggestion: ContextualSuggestion) => void;
  onDismiss: (suggestion: ContextualSuggestion) => void;
}

export const ContextualSuggestions: React.FC<ContextualSuggestionsProps> = ({
  suggestions,
  onApply,
  onDismiss,
}) => {
  if (suggestions.length === 0) return null;

  // Only show top 2 suggestions to avoid clutter
  const topSuggestions = suggestions.slice(0, 2);

  return (
    <div className="space-y-2">
      {topSuggestions.map((suggestion, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
        >
          <Lightbulb className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">{suggestion.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en {suggestion.historicalMatches} trades similares
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApply(suggestion)}
              className="h-7 px-2"
              title="Aplicar sugerencia"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(suggestion)}
              className="h-7 px-2"
              title="Ignorar"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

