import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useGoalsStore } from '@/store/goalsStore';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateAnalytics } from '@/lib/calculations';
import { Target, Plus, Trash2, Edit2, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import type { GoalPeriod, GoalType } from '@/types/Trading';
import { formatCurrency, formatPercentage } from '@/lib/utils';

const periodLabels: Record<GoalPeriod, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

const typeLabels: Record<GoalType, string> = {
  pnl: 'PnL',
  winRate: 'Tasa de Éxito',
  numTrades: 'Número de Operaciones',
};

export const GoalsPage = () => {
  const { goals, loadGoals, addGoal, updateGoal, deleteGoal, getGoalsByPeriod } = useGoalsStore();
  const { trades, loadTrades } = useTradeStore();
  const { settings } = useSettingsStore();
  const [selectedPeriod, setSelectedPeriod] = useState<GoalPeriod>('daily');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    period: 'daily' as GoalPeriod,
    type: 'pnl' as GoalType,
    target: 0,
  });

  useEffect(() => {
    loadGoals();
    loadTrades();
  }, [loadGoals, loadTrades]);

  // Calcular progreso de objetivos basado en trades reales
  useEffect(() => {
    const analytics = calculateAnalytics(trades);
    const now = new Date();

    goals.forEach(goal => {
      let current = 0;
      const startDate = new Date(goal.startDate);
      const endDate = new Date(goal.endDate);

      if (now >= startDate && now <= endDate) {
        switch (goal.type) {
          case 'pnl':
            // Calcular PnL del período
            const periodTrades = trades.filter(t => {
              const tradeDate = new Date(t.exitDate || t.entryDate);
              return tradeDate >= startDate && tradeDate <= endDate && t.status === 'closed';
            });
            current = periodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
            break;
          case 'winRate':
            current = analytics.winRate;
            break;
          case 'numTrades':
            const periodTradesCount = trades.filter(t => {
              const tradeDate = new Date(t.entryDate);
              return tradeDate >= startDate && tradeDate <= endDate;
            });
            current = periodTradesCount.length;
            break;
        }

        if (current !== goal.current) {
          updateGoal(goal.id, { current });
        }
      }
    });
  }, [trades, goals, updateGoal]);

  const handleAddGoal = () => {
    setEditingGoal(null);
    setFormData({ period: selectedPeriod, type: 'pnl', target: 0 });
    setIsModalOpen(true);
  };

  const handleEditGoal = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setEditingGoal(goalId);
      setFormData({
        period: goal.period,
        type: goal.type,
        target: goal.target,
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = () => {
    if (editingGoal) {
      updateGoal(editingGoal, {
        type: formData.type,
        target: formData.target,
      });
    } else {
      addGoal(formData.period, formData.type, formData.target);
    }
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleDelete = (goalId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este objetivo?')) {
      deleteGoal(goalId);
    }
  };

  const filteredGoals = getGoalsByPeriod(selectedPeriod);
  const periodGoals = filteredGoals.filter(g => {
    const now = new Date();
    const startDate = new Date(g.startDate);
    const endDate = new Date(g.endDate);
    return now >= startDate && now <= endDate;
  });

  const formatGoalValue = (goal: typeof filteredGoals[0]) => {
    switch (goal.type) {
      case 'pnl':
        return formatCurrency(goal.current, settings.baseCurrency);
      case 'winRate':
        return formatPercentage(goal.current);
      case 'numTrades':
        return goal.current.toString();
      default:
        return goal.current.toString();
    }
  };

  const formatTarget = (goal: typeof filteredGoals[0]) => {
    switch (goal.type) {
      case 'pnl':
        return formatCurrency(goal.target, settings.baseCurrency);
      case 'winRate':
        return formatPercentage(goal.target);
      case 'numTrades':
        return goal.target.toString();
      default:
        return goal.target.toString();
    }
  };

  const getProgress = (goal: typeof filteredGoals[0]) => {
    if (goal.target === 0) return 0;
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Objetivos y Metas</h1>
          <p className="text-muted-foreground mt-1">
            Establece y rastrea tus objetivos de trading
          </p>
        </div>
        <Button onClick={handleAddGoal}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Objetivo
        </Button>
      </div>

      {/* Filtro por período */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            {(Object.keys(periodLabels) as GoalPeriod[]).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod(period)}
              >
                {periodLabels[period]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Objetivos del período seleccionado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periodGoals.length > 0 ? (
          periodGoals.map((goal) => {
            const progress = getProgress(goal);
            const isCompleted = goal.completed || progress >= 100;

            return (
              <Card key={goal.id} className={isCompleted ? 'border-profit bg-profit border-2' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{typeLabels[goal.type]}</CardTitle>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-profit" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription>
                    Objetivo {periodLabels[goal.period]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Progreso</span>
                      <span className={`text-sm font-bold ${isCompleted ? 'text-profit' : ''}`}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isCompleted
                            ? 'bg-profit'
                            : progress >= 75
                            ? 'bg-yellow-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Actual</span>
                      <span className={`text-lg font-bold ${isCompleted ? 'text-profit' : ''}`}>
                        {formatGoalValue(goal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Objetivo</span>
                      <span className="text-lg font-bold text-muted-foreground">
                        {formatTarget(goal)}
                      </span>
                    </div>
                    {!isCompleted && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Falta</span>
                        <span className="text-sm font-medium">
                          {goal.type === 'pnl'
                            ? formatCurrency(Math.max(0, goal.target - goal.current), settings.baseCurrency)
                            : goal.type === 'winRate'
                            ? formatPercentage(Math.max(0, goal.target - goal.current))
                            : Math.max(0, goal.target - goal.current).toString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditGoal(goal.id)}
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(goal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay objetivos para el período {periodLabels[selectedPeriod]}</p>
                <Button variant="outline" className="mt-4" onClick={handleAddGoal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Objetivo
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Resumen de todos los objetivos */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Objetivos</CardTitle>
            <CardDescription>
              Vista general de todos tus objetivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(periodLabels) as GoalPeriod[]).map((period) => {
                const periodGoals = getGoalsByPeriod(period);
                const activeGoals = periodGoals.filter(g => {
                  const now = new Date();
                  return now >= new Date(g.startDate) && now <= new Date(g.endDate);
                });
                const completed = activeGoals.filter(g => g.completed).length;
                const total = activeGoals.length;

                return (
                  <div key={period} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{periodLabels[period]}</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {completed} / {total}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Objetivos completados
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para agregar/editar objetivo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        title={editingGoal ? 'Editar Objetivo' : 'Agregar Objetivo'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="goalPeriod">Período</Label>
            <Select
              id="goalPeriod"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as GoalPeriod })}
              disabled={!!editingGoal}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="goalType">Tipo de Objetivo</Label>
            <Select
              id="goalType"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as GoalType })}
            >
              <option value="pnl">PnL (Ganancia/Pérdida)</option>
              <option value="winRate">Tasa de Éxito (%)</option>
              <option value="numTrades">Número de Operaciones</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="goalTarget">
              Objetivo {formData.type === 'pnl' ? `(${settings.baseCurrency})` : formData.type === 'winRate' ? '(%)' : ''}
            </Label>
            <Input
              id="goalTarget"
              type="number"
              step={formData.type === 'winRate' ? '0.1' : '0.01'}
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) || 0 })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.type === 'pnl' && 'Ganancia objetivo para este período'}
              {formData.type === 'winRate' && 'Tasa de éxito objetivo (%)'}
              {formData.type === 'numTrades' && 'Número de operaciones objetivo'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingGoal(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingGoal ? 'Actualizar' : 'Crear'} Objetivo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

