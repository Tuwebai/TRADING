import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { CollapsibleWithTitle } from '@/components/ui/CollapsibleWithTitle';
import { useGoalsStore } from '@/store/goalsStore';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateAnalytics } from '@/lib/calculations';
import { Target, Plus, Trash2, Edit2, TrendingUp, CheckCircle2, XCircle, Star, Download, AlertTriangle, FileText } from 'lucide-react';
import type { GoalPeriod, GoalType, TradingGoal } from '@/types/Trading';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { simulateGoalFuture } from '@/lib/goalSimulation';
import { exportGoalsToPDF } from '@/lib/goalExport';
import { getActiveGoalConstraints } from '@/lib/goalConstraints';
import { evaluateGoals } from '@/lib/goalIntegration';
import { goalPostMortemsStorage, type GoalPostMortem } from '@/lib/storage';

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
  const { goals, loadGoals, addGoal, updateGoal, deleteGoal, getGoalsByPeriod, setPrimaryGoal, getPrimaryGoal } = useGoalsStore();
  const { trades, loadTrades } = useTradeStore();
  const { settings, updateSettings } = useSettingsStore();
  const [selectedPeriod, setSelectedPeriod] = useState<GoalPeriod>('daily');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);

  const [formData, setFormData] = useState({
    period: 'daily' as GoalPeriod,
    type: 'pnl' as GoalType,
    target: 0,
    isPrimary: false,
    isBinding: false,
    constraintType: 'none' as TradingGoal['constraintType'],
    constraintConfig: undefined as TradingGoal['constraintConfig'],
    consequences: undefined as TradingGoal['consequences'],
  });

  useEffect(() => {
    loadGoals();
    loadTrades();
  }, [loadGoals, loadTrades]);

  // Calcular progreso de objetivos basado en trades reales y evaluar fallos
  useEffect(() => {
    const analytics = calculateAnalytics(trades);
    const now = new Date();
    const previousStates = new Map<string, number>();
    
    // Store previous states
    goals.forEach(goal => {
      previousStates.set(goal.id, goal.current);
    });

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

    // Evaluate goals after state updates (in next tick to avoid stale state)
    // This will generate insights and post-mortems when goals fail
    setTimeout(() => {
      const { goals: updatedGoals } = useGoalsStore.getState();
      evaluateGoals(updatedGoals, trades, settings, updateGoal, updateSettings, previousStates);
    }, 100);
  }, [trades, goals, updateGoal, settings, updateSettings]);

  const handleAddGoal = () => {
    setEditingGoal(null);
    setFormData({ 
      period: selectedPeriod, 
      type: 'pnl', 
      target: 0,
      isPrimary: false,
      isBinding: false,
      constraintType: 'none',
      constraintConfig: undefined,
      consequences: undefined,
    });
    setShowSimulation(false);
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
        isPrimary: goal.isPrimary || false,
        isBinding: goal.isBinding || false,
        constraintType: goal.constraintType || 'none',
        constraintConfig: goal.constraintConfig,
        consequences: goal.consequences,
      });
      setShowSimulation(false);
      setIsModalOpen(true);
    }
  };

  const handleSubmit = () => {
    if (editingGoal) {
      updateGoal(editingGoal, {
        type: formData.type,
        target: formData.target,
        isPrimary: formData.isPrimary,
        isBinding: formData.isBinding,
        constraintType: formData.constraintType,
        constraintConfig: formData.constraintConfig,
        consequences: formData.consequences,
      });
      if (formData.isPrimary) {
        setPrimaryGoal(editingGoal);
      }
    } else {
      addGoal(formData.period, formData.type, formData.target, {
        isPrimary: formData.isPrimary,
        isBinding: formData.isBinding,
        constraintType: formData.constraintType,
        constraintConfig: formData.constraintConfig,
        consequences: formData.consequences,
      });
      if (formData.isPrimary) {
        const newGoal = goals[goals.length - 1];
        if (newGoal) {
          setPrimaryGoal(newGoal.id);
        }
      }
    }
    setIsModalOpen(false);
    setEditingGoal(null);
    setShowSimulation(false);
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

  // Get primary goal (Foco del Día)
  const primaryGoal = useMemo(() => getPrimaryGoal(), [goals, getPrimaryGoal]);
  
  // Get active constraints
  const activeConstraints = useMemo(() => getActiveGoalConstraints(goals, trades, settings), [goals, trades, settings]);
  
  // Simulation data
  const simulationData = useMemo(() => {
    if (!showSimulation || !formData.target) return null;
    const tempGoal: TradingGoal = {
      id: 'temp',
      period: formData.period,
      type: formData.type,
      target: formData.target,
      current: 0,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return simulateGoalFuture(tempGoal, trades, settings);
  }, [showSimulation, formData, trades, settings]);

  const handleExportPDF = () => {
    exportGoalsToPDF(goals, trades, settings);
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
        <div className="flex gap-2">
          {goals.length > 0 && (
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}
          <Button onClick={handleAddGoal}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Objetivo
          </Button>
        </div>
      </div>

      {/* Foco del Día - Primary Goal Display */}
      {primaryGoal && (
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <CardTitle>Hoy tu única misión es:</CardTitle>
            </div>
            <CardDescription>
              {typeLabels[primaryGoal.type]} - {periodLabels[primaryGoal.period]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progreso</span>
                <span className="text-lg font-bold">
                  {formatGoalValue(primaryGoal)} / {formatTarget(primaryGoal)}
                </span>
              </div>
              <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${getProgress(primaryGoal)}%` }}
                />
              </div>
              {activeConstraints.length > 0 && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-warning mb-1">Restricción Activa</div>
                      <div className="text-muted-foreground">{activeConstraints[0].message}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
              <Card key={goal.id} className={isCompleted ? 'border-profit bg-profit border-2' : goal.isPrimary ? 'border-primary border-2' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{typeLabels[goal.type]}</CardTitle>
                      {goal.isPrimary && (
                        <Star className="h-4 w-4 text-primary fill-primary" />
                      )}
                      {goal.isBinding && (
                        <FileText className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-profit" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription>
                    Objetivo {periodLabels[goal.period]}
                    {goal.isPrimary && ' • Foco del Día'}
                    {goal.isBinding && ' • Vinculante'}
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
                    {!goal.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryGoal(goal.id)}
                        className="flex-1 text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Hacer Primario
                      </Button>
                    )}
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

      {/* Post-Mortems de Objetivos Fallidos */}
      {(() => {
        const postMortems = goalPostMortemsStorage.getAll();
        const recentPostMortems = postMortems
          .sort((a: GoalPostMortem, b: GoalPostMortem) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime())
          .slice(0, 5);
        
        return recentPostMortems.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Análisis Post-Mortem</CardTitle>
              <CardDescription>
                Análisis automático de objetivos fallidos recientemente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPostMortems.map((pm: GoalPostMortem) => (
                <div key={pm.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{pm.goalTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(pm.failedAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Causa Probable:</div>
                    <div className="text-sm text-muted-foreground">{pm.cause}</div>
                  </div>
                  {pm.relatedRuleViolations.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">Reglas Violadas:</div>
                      <div className="text-sm text-muted-foreground">
                        {pm.relatedRuleViolations.join(', ')}
                      </div>
                    </div>
                  )}
                  {pm.historicalPatterns.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">Patrones Históricos:</div>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {pm.historicalPatterns.map((pattern: string, idx: number) => (
                          <li key={idx}>{pattern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null;
      })()}

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
          setShowSimulation(false);
        }}
        title={editingGoal ? 'Editar Objetivo' : 'Agregar Objetivo'}
        size="lg"
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
              onChange={(e) => {
                const newTarget = parseFloat(e.target.value) || 0;
                setFormData({ ...formData, target: newTarget });
                if (newTarget > 0) {
                  setShowSimulation(true);
                }
              }}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.type === 'pnl' && 'Ganancia objetivo para este período'}
              {formData.type === 'winRate' && 'Tasa de éxito objetivo (%)'}
              {formData.type === 'numTrades' && 'Número de operaciones objetivo'}
            </p>
          </div>

          {/* Simulación de Futuro */}
          {showSimulation && simulationData && formData.target > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-sm">Simulación de Futuro (90 días)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {simulationData.warning && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                      <div className="text-sm text-warning">{simulationData.warning}</div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Conservadora</div>
                    <div className="font-bold">{formData.type === 'pnl' 
                      ? formatCurrency(simulationData.projectionBreakdown.conservative, settings.baseCurrency)
                      : formData.type === 'winRate'
                      ? formatPercentage(simulationData.projectionBreakdown.conservative)
                      : simulationData.projectionBreakdown.conservative.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Moderada</div>
                    <div className="font-bold">{formData.type === 'pnl' 
                      ? formatCurrency(simulationData.projectionBreakdown.moderate, settings.baseCurrency)
                      : formData.type === 'winRate'
                      ? formatPercentage(simulationData.projectionBreakdown.moderate)
                      : simulationData.projectionBreakdown.moderate.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Optimista</div>
                    <div className="font-bold">{formData.type === 'pnl' 
                      ? formatCurrency(simulationData.projectionBreakdown.optimistic, settings.baseCurrency)
                      : formData.type === 'winRate'
                      ? formatPercentage(simulationData.projectionBreakdown.optimistic)
                      : simulationData.projectionBreakdown.optimistic.toFixed(0)}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Proyección basada en tu historial de trading.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Opciones Avanzadas */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Establecer como "Foco del Día" (Objetivo Primario)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Solo un objetivo puede ser primario a la vez. Este será tu único objetivo visible en el dashboard.
            </p>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isBinding"
                checked={formData.isBinding}
                onChange={(e) => setFormData({ ...formData, isBinding: e.target.checked })}
              />
              <Label htmlFor="isBinding" className="cursor-pointer">
                Objetivo Vinculante (Modo Avanzado)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Si este objetivo falla, se aplicarán consecuencias automáticas configuradas.
            </p>

            {/* Configuración de Restricciones */}
            {formData.isBinding && (
              <CollapsibleWithTitle
                title="Configurar Restricciones de UI"
                description="Define cómo este objetivo afecta la interfaz cuando está activo"
                defaultOpen={false}
              >
                <div className="space-y-3 mt-3 ml-6">
                  <div>
                    <Label htmlFor="constraintType">Tipo de Restricción</Label>
                    <Select
                      id="constraintType"
                      value={formData.constraintType}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        constraintType: e.target.value as TradingGoal['constraintType'],
                        constraintConfig: e.target.value === 'none' ? undefined : formData.constraintConfig,
                      })}
                    >
                      <option value="none">Ninguna</option>
                      <option value="session">Restringir a Sesión Específica</option>
                      <option value="hours">Restringir a Horas Específicas</option>
                      <option value="max-trades">Bloquear después de X trades</option>
                      <option value="max-loss">Bloquear después de X pérdida</option>
                    </Select>
                  </div>

                  {formData.constraintType === 'session' && (
                    <div>
                      <Label htmlFor="session">Sesión</Label>
                      <Select
                        id="session"
                        value={formData.constraintConfig?.session || 'new-york'}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          constraintConfig: { session: e.target.value as any },
                        })}
                      >
                        <option value="asian">Asian</option>
                        <option value="london">London</option>
                        <option value="new-york">New York</option>
                        <option value="overlap">Overlap</option>
                      </Select>
                    </div>
                  )}

                  {formData.constraintType === 'hours' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="startHour">Hora Inicio</Label>
                        <Input
                          id="startHour"
                          type="number"
                          min="0"
                          max="23"
                          value={formData.constraintConfig?.startHour || 9}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            constraintConfig: { 
                              startHour: parseInt(e.target.value) || 9,
                              endHour: formData.constraintConfig?.endHour || 17,
                            },
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endHour">Hora Fin</Label>
                        <Input
                          id="endHour"
                          type="number"
                          min="0"
                          max="23"
                          value={formData.constraintConfig?.endHour || 17}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            constraintConfig: { 
                              startHour: formData.constraintConfig?.startHour || 9,
                              endHour: parseInt(e.target.value) || 17,
                            },
                          })}
                        />
                      </div>
                    </div>
                  )}

                  {(formData.constraintType === 'max-trades' || formData.constraintType === 'max-loss') && (
                    <div>
                      <Label htmlFor="maxValue">Valor Máximo</Label>
                      <Input
                        id="maxValue"
                        type="number"
                        step={formData.constraintType === 'max-loss' ? '0.01' : '1'}
                        value={formData.constraintConfig?.maxValue || formData.target}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          constraintConfig: { maxValue: parseFloat(e.target.value) || formData.target },
                        })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.constraintType === 'max-trades' 
                          ? 'Número máximo de trades antes de bloquear'
                          : 'Pérdida máxima antes de bloquear'}
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleWithTitle>
            )}

            {/* Configuración de Consecuencias */}
            {formData.isBinding && (
              <CollapsibleWithTitle
                title="Configurar Consecuencias"
                description="Define qué ocurre cuando este objetivo vinculante falla"
                defaultOpen={false}
              >
                <div className="space-y-3 mt-3 ml-6">
                  <div>
                    <Label htmlFor="cooldownHours">Cooldown (horas)</Label>
                    <Input
                      id="cooldownHours"
                      type="number"
                      min="0"
                      value={formData.consequences?.cooldownHours || 0}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        consequences: {
                          ...formData.consequences,
                          cooldownHours: parseInt(e.target.value) || 0,
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Horas de bloqueo de trading después de fallar (0 = sin cooldown)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="reduceRiskPercent">Reducir Riesgo (%)</Label>
                    <Input
                      id="reduceRiskPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.consequences?.reduceRiskPercent || 0}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        consequences: {
                          ...formData.consequences,
                          reduceRiskPercent: parseFloat(e.target.value) || 0,
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Porcentaje de reducción del riesgo por trade después de fallar
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="blockPartial"
                      checked={formData.consequences?.blockPartial || false}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        consequences: {
                          ...formData.consequences,
                          blockPartial: e.target.checked,
                        },
                      })}
                    />
                    <Label htmlFor="blockPartial" className="cursor-pointer">
                      Bloqueo Parcial (deshabilitar creación de trades)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="blockFull"
                      checked={formData.consequences?.blockFull || false}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        consequences: {
                          ...formData.consequences,
                          blockFull: e.target.checked,
                        },
                      })}
                    />
                    <Label htmlFor="blockFull" className="cursor-pointer">
                      Bloqueo Completo (bloquear todo el sistema)
                    </Label>
                  </div>
                </div>
              </CollapsibleWithTitle>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingGoal(null);
                setShowSimulation(false);
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

