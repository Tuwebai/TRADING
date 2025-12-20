import { useEffect, useState, useMemo } from 'react';
import { RoutineChecklist } from '@/components/routines/RoutineChecklist';
import { useRoutineStore } from '@/store/routineStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTradeStore } from '@/store/tradeStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { 
  Calendar, 
  Clock, 
  Shield, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  BarChart3,
  Target,
  BookOpen,
  Save
} from 'lucide-react';
import type { RoutineType, RoutineBlockStatus, EmotionType } from '@/types/Trading';
import { getCurrentSession } from '@/lib/assetStats';
import { calculateDrawdown } from '@/lib/risk';
import { calculateTradingStatus } from '@/lib/tradingStatus';
import { isPreTradeComplete, calculateDisciplineMetrics, getTodayDate } from '@/lib/routineDiscipline';
import { isBlocked } from '@/lib/tradingRules';
import { motion } from 'framer-motion';

const routineTypes: RoutineType[] = [
  'morning',
  'pre-market',
  'pre-trade',
  'post-trade',
  'end-of-day',
];

const typeLabels: Record<RoutineType, string> = {
  'morning': 'Rutina Matutina',
  'pre-market': 'Lista Pre-Mercado',
  'pre-trade': 'Lista Pre-Operación',
  'post-trade': 'Revisión Post-Operación',
  'end-of-day': 'Resumen Fin de Día',
};

const sessionNames: Record<string, string> = {
  'asian': 'Asiática',
  'london': 'Londres',
  'new-york': 'Nueva York',
  'overlap': 'Overlap',
  'other': 'Otra',
};

const emotionOptions: EmotionType[] = [
  'confiado',
  'ansioso',
  'temeroso',
  'emocionado',
  'neutral',
  'frustrado',
  'euforico',
  'deprimido',
];

export const RoutinesPage = () => {
  const {
    routines,
    dailyExecutions,
    loadRoutines,
    loadDailyExecutions,
    getTodayExecution,
    addRoutineItem,
    deleteRoutineItem,
    updateRoutineItem,
    markBlockComplete,
    markBlockSkipped,
    toggleItemCompletion,
    markEndOfDay,
    savePostTradeData,
    getRoutine,
  } = useRoutineStore();

  const { settings } = useSettingsStore();
  const { getTradesByMode } = useTradeStore();
  const trades = getTradesByMode(); // Get trades filtered by current mode

  const [skipReason, setSkipReason] = useState<Record<RoutineType, string>>({
    morning: '',
    'pre-market': '',
    'pre-trade': '',
    'post-trade': '',
    'end-of-day': '',
  });

  const [showPostTradeForm, setShowPostTradeForm] = useState(false);
  const [postTradeData, setPostTradeData] = useState({
    respectedPlan: true,
    brokenRule: '',
    emotionalState: null as EmotionType | null,
    learning: '',
  });

  const [endOfDayData, setEndOfDayData] = useState({
    isValid: true,
    justification: '',
  });

  useEffect(() => {
    loadRoutines();
    loadDailyExecutions();
  }, [loadRoutines, loadDailyExecutions]);

  // Get today's execution from store state directly, avoiding state updates during render
  const today = getTodayDate();
  const todayExecution = useMemo(() => {
    const existing = dailyExecutions.find(exec => exec.date === today);
    if (existing) {
      return existing;
    }
    // If not in store, use the library function directly to get it without updating store
    return getTodayExecution();
  }, [dailyExecutions, today, getTodayExecution]);

  // Calculate context data
  const currentSession = getCurrentSession();
  const currentCapital = settings.currentCapital || settings.accountSize;
  const initialCapital = settings.initialCapital || settings.accountSize;
  
  const { currentPercent: currentDrawdownPercent } = calculateDrawdown(trades, initialCapital);
  
  const tradingStatus = useMemo(() => 
    calculateTradingStatus(trades, settings),
    [trades, settings]
  );
  
  const blocked = isBlocked(settings);
  const dayStatus = blocked || tradingStatus.status !== 'operable' ? 'bloqueado' : 'operable';

  // Check pre-trade completion
  const preTradeCheck = useMemo(() => isPreTradeComplete(), [todayExecution]);

  // Calculate discipline metrics
  const disciplineMetrics = useMemo(() => 
    calculateDisciplineMetrics(dailyExecutions),
    [dailyExecutions]
  );

  // Get today's date formatted for display
  const todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSkipBlock = (type: RoutineType) => {
    const reason = skipReason[type];
    if (!reason.trim()) {
      alert('Debes proporcionar un motivo para saltar esta rutina.');
      return;
    }
    markBlockSkipped(type, reason);
    setSkipReason({ ...skipReason, [type]: '' });
  };

  const handleItemToggle = async (type: RoutineType, itemId: string, completed: boolean) => {
    await toggleItemCompletion(type, itemId, completed);
    // Auto-mark block as complete if all items are done
    const routine = await getRoutine(type);
    if (routine) {
      const allCompleted = routine.items.every((item: { id: string }) => {
        if (item.id === itemId) return completed;
        const execution = todayExecution.blocks[type];
        return execution.itemCompletions[item.id]?.completed || false;
      });
      if (allCompleted && routine.items.length > 0) {
        await markBlockComplete(type);
      }
    }
  };

  const handleSavePostTrade = () => {
    if (!postTradeData.learning.trim()) {
      alert('Debes proporcionar al menos un aprendizaje.');
      return;
    }
    
    savePostTradeData({
      ...postTradeData,
      completedAt: new Date().toISOString(),
    });
    
    setShowPostTradeForm(false);
    setPostTradeData({
      respectedPlan: true,
      brokenRule: '',
      emotionalState: null,
      learning: '',
    });
  };

  const handleMarkEndOfDay = () => {
    if (!endOfDayData.isValid && !endOfDayData.justification.trim()) {
      alert('Debes proporcionar una justificación si el día fue inválido.');
      return;
    }
    
    markEndOfDay(endOfDayData.isValid, endOfDayData.justification);
    alert(endOfDayData.isValid 
      ? '✅ Día marcado como válido. Buen trabajo manteniendo la disciplina.'
      : '⚠️ Día marcado como inválido. Revisa tu justificación y aprende de esto.'
    );
  };

  const getBlockStatus = (type: RoutineType): RoutineBlockStatus => {
    return todayExecution.blocks[type].status;
  };

  const getBlockStatusColor = (status: RoutineBlockStatus): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-500/10 border-green-500/20';
      case 'incomplete':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
      case 'skipped':
        return 'text-red-600 bg-red-500/10 border-red-500/20';
      default:
        return 'text-muted-foreground bg-muted border';
    }
  };

  const getBlockStatusIcon = (status: RoutineBlockStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'incomplete':
        return <AlertTriangle className="h-5 w-5" />;
      case 'skipped':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h1 className="text-3xl font-bold">Sistema de Disciplina Operativa</h1>
        <p className="text-muted-foreground mt-1">
          Rutinas diarias con enforcement real - No es una checklist decorativa
        </p>
      </div>

      {/* 2️⃣ CONTEXTO DIARIO */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Contexto Diario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Fecha</div>
              <div className="font-semibold">{todayFormatted}</div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Sesión Activa</div>
              <div className="font-semibold">{sessionNames[currentSession] || currentSession}</div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Capital Actual</div>
              <div className="font-semibold">{currentCapital.toFixed(2)} {settings.baseCurrency}</div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Drawdown Actual</div>
              <div className={`font-semibold ${
                currentDrawdownPercent > 10 ? 'text-red-600' :
                currentDrawdownPercent > 5 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {currentDrawdownPercent.toFixed(2)}%
              </div>
            </div>
            
            <div className={`p-3 border rounded-lg ${
              dayStatus === 'bloqueado' ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
            }`}>
              <div className="text-sm text-muted-foreground mb-1">Estado del Día</div>
              <div className={`font-semibold ${
                dayStatus === 'bloqueado' ? 'text-red-600' : 'text-green-600'
              }`}>
                {dayStatus === 'bloqueado' ? '🔴 Bloqueado' : '✅ Operable'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7️⃣ MÉTRICAS DE DISCIPLINA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas de Disciplina
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Rutinas Completadas</div>
              <div className="text-3xl font-bold">{disciplineMetrics.routinesCompletedPercent.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {disciplineMetrics.totalDays} días registrados
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Días Operados Sin Rutina</div>
              <div className="text-3xl font-bold text-yellow-600">{disciplineMetrics.daysOperatedWithoutRoutine}</div>
            </div>
            
            <div className="p-4 border rounded-lg bg-green-500/10 border-green-500/20">
              <div className="text-sm text-muted-foreground mb-2">Días Perfectos</div>
              <div className="text-3xl font-bold text-green-600">{disciplineMetrics.perfectDays}</div>
            </div>
            
            <div className="p-4 border rounded-lg bg-red-500/10 border-red-500/20">
              <div className="text-sm text-muted-foreground mb-2">Días Inválidos</div>
              <div className="text-3xl font-bold text-red-600">{disciplineMetrics.invalidDays}</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Racha Actual</div>
              <div className="text-2xl font-bold">{disciplineMetrics.currentStreak} días</div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Racha Más Larga</div>
              <div className="text-2xl font-bold">{disciplineMetrics.longestStreak} días</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3️⃣ ENFORCEMENT CON OPERACIONES - Banner de advertencia */}
      {!preTradeCheck.complete && (
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-destructive mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-lg text-destructive mb-2">
                  🔴 CREACIÓN DE OPERACIONES BLOQUEADA
                </div>
                <div className="text-sm space-y-1">
                  <div>{preTradeCheck.message}</div>
                  <div className="mt-2 font-semibold">Debes completar la Lista Pre-Operación al 100% antes de crear cualquier operación.</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1️⃣ RUTINAS CON ESTADO GLOBAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {routineTypes.map((type) => {
          const routine = routines.find(r => r.type === type) || null;
          const blockStatus = getBlockStatus(type);
          const block = todayExecution.blocks[type];
          
          return (
            <Card key={type} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getBlockStatusIcon(blockStatus)}
                    {typeLabels[type]}
                  </CardTitle>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getBlockStatusColor(blockStatus)}`}>
                    {blockStatus === 'completed' ? 'Completada' :
                     blockStatus === 'incomplete' ? 'Incompleta' :
                     blockStatus === 'skipped' ? 'Saltada' :
                     'Pendiente'}
                  </div>
                </div>
                
                {block.completedAt && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Completada: {new Date(block.completedAt).toLocaleTimeString('es-ES')}
                  </div>
                )}
                
                {block.skippedAt && (
                  <div className="text-xs text-red-600 mt-2">
                    Saltada: {new Date(block.skippedAt).toLocaleTimeString('es-ES')}
                    {block.skipReason && (
                      <div className="mt-1">Motivo: {block.skipReason}</div>
                    )}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Skip button */}
                {blockStatus !== 'completed' && blockStatus !== 'skipped' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Motivo para saltar (obligatorio)"
                      value={skipReason[type]}
                      onChange={(e) => setSkipReason({ ...skipReason, [type]: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSkipBlock(type)}
                      disabled={!skipReason[type].trim()}
                    >
                      Saltar
                    </Button>
                  </div>
                )}

                <RoutineChecklist
                  routine={routine}
                  type={type}
                  onAddItem={(text) => addRoutineItem(type, text)}
                  onToggleItem={(itemId) => {
                    const item = routine?.items.find(i => i.id === itemId);
                    if (item) {
                      const currentCompleted = block.itemCompletions[itemId]?.completed || false;
                      handleItemToggle(type, itemId, !currentCompleted);
                    }
                  }}
                  onDeleteItem={(itemId) => deleteRoutineItem(type, itemId)}
                  onEditItem={(itemId, text) => updateRoutineItem(type, itemId, { text })}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 4️⃣ POST-OPERACIÓN ESTRUCTURADA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Revisión Post-Operación Estructurada
          </CardTitle>
          <CardDescription>
            Campos obligatorios para cada operación cerrada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPostTradeForm ? (
            <Button onClick={() => setShowPostTradeForm(true)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Iniciar Revisión Post-Operación
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>¿Respetaste el plan?</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    variant={postTradeData.respectedPlan ? "default" : "outline"}
                    onClick={() => setPostTradeData({ ...postTradeData, respectedPlan: true })}
                  >
                    Sí
                  </Button>
                  <Button
                    variant={!postTradeData.respectedPlan ? "default" : "outline"}
                    onClick={() => setPostTradeData({ ...postTradeData, respectedPlan: false })}
                  >
                    No
                  </Button>
                </div>
              </div>

              {!postTradeData.respectedPlan && (
                <div>
                  <Label>Regla rota (si aplica)</Label>
                  <Input
                    value={postTradeData.brokenRule}
                    onChange={(e) => setPostTradeData({ ...postTradeData, brokenRule: e.target.value })}
                    placeholder="Describe qué regla rompiste..."
                  />
                </div>
              )}

              <div>
                <Label>Estado emocional</Label>
                <Select
                  value={postTradeData.emotionalState || ''}
                  onChange={(e) => setPostTradeData({ 
                    ...postTradeData, 
                    emotionalState: e.target.value as EmotionType | null 
                  })}
                >
                  <option value="">Seleccionar...</option>
                  {emotionOptions.map(emotion => (
                    <option key={emotion} value={emotion}>
                      {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>1 Aprendizaje Obligatorio *</Label>
                <Textarea
                  value={postTradeData.learning}
                  onChange={(e) => setPostTradeData({ ...postTradeData, learning: e.target.value })}
                  placeholder="¿Qué aprendiste de esta operación? (obligatorio)"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSavePostTrade} disabled={!postTradeData.learning.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Revisión
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowPostTradeForm(false);
                  setPostTradeData({
                    respectedPlan: true,
                    brokenRule: '',
                    emotionalState: null,
                    learning: '',
                  });
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5️⃣ FIN DE DÍA */}
      <Card className={todayExecution.endOfDay.marked ? 'border-2 border-primary' : 'border-2 border-dashed'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cierre Diario Obligatorio
          </CardTitle>
          <CardDescription>
            Marca el día como válido o inválido. Justificación obligatoria si fue inválido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayExecution.endOfDay.marked ? (
            <div className="space-y-2">
              <div className={`p-4 rounded-lg ${
                todayExecution.endOfDay.isValid 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <div className="font-semibold mb-2">
                  {todayExecution.endOfDay.isValid ? '✅ Día marcado como VÁLIDO' : '❌ Día marcado como INVÁLIDO'}
                </div>
                {todayExecution.endOfDay.markedAt && (
                  <div className="text-sm text-muted-foreground">
                    Marcado: {new Date(todayExecution.endOfDay.markedAt).toLocaleString('es-ES')}
                  </div>
                )}
                {todayExecution.endOfDay.justification && (
                  <div className="mt-2 text-sm">
                    <div className="font-semibold mb-1">Justificación:</div>
                    <div>{todayExecution.endOfDay.justification}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>¿Este día fue válido?</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    variant={endOfDayData.isValid ? "default" : "outline"}
                    onClick={() => setEndOfDayData({ ...endOfDayData, isValid: true, justification: '' })}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Válido
                  </Button>
                  <Button
                    variant={!endOfDayData.isValid ? "default" : "outline"}
                    onClick={() => setEndOfDayData({ ...endOfDayData, isValid: false })}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Inválido
                  </Button>
                </div>
              </div>

              {!endOfDayData.isValid && (
                <div>
                  <Label>Justificación Obligatoria *</Label>
                  <Textarea
                    value={endOfDayData.justification}
                    onChange={(e) => setEndOfDayData({ ...endOfDayData, justification: e.target.value })}
                    placeholder="Explica por qué este día fue inválido. ¿Qué salió mal? ¿Qué aprendiste?"
                    rows={4}
                  />
                </div>
              )}

              <Button 
                onClick={handleMarkEndOfDay}
                disabled={!endOfDayData.isValid && !endOfDayData.justification.trim()}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Marcar Cierre Diario
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
