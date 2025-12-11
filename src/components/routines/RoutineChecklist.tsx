import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import type { Routine, RoutineItem, RoutineType } from '@/types/Trading';

interface RoutineChecklistProps {
  routine: Routine | null;
  type: RoutineType;
  onAddItem: (text: string) => void;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (itemId: string, text: string) => void;
}

const typeLabels: Record<RoutineType, string> = {
  'morning': 'Rutina Matutina',
  'pre-market': 'Lista Pre-Mercado',
  'pre-trade': 'Lista Pre-Operación',
  'post-trade': 'Revisión Post-Operación',
  'end-of-day': 'Resumen Fin de Día',
};

export const RoutineChecklist: React.FC<RoutineChecklistProps> = ({
  routine,
  type,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText.trim());
      setNewItemText('');
    }
  };

  const handleStartEdit = (item: RoutineItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = (itemId: string) => {
    if (editText.trim()) {
      onEditItem(itemId, editText.trim());
      setEditingId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const items = routine?.items || [];
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{typeLabels[type]}</CardTitle>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount} / {totalCount} completados
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="Agregar nuevo elemento..."
            className="flex-1"
          />
          <Button onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aún no hay elementos. Agrega tu primer elemento para comenzar.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50"
              >
                <Checkbox
                  checked={item.completed}
                  onChange={() => onToggleItem(item.id)}
                />
                {editingId === item.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <span
                      className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.text}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(item)}
                        disabled={item.completed}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

