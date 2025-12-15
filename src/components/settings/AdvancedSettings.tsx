import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Shield, 
  BookOpen, 
  Lock, 
  AlertTriangle,
  Eye,
  Bell,
  Settings,
  Globe,
  Download,
  Upload,
  RotateCcw,
  Info
} from 'lucide-react';
import type { AdvancedSettings, TradingRules } from '@/types/Trading';

interface AdvancedSettingsProps {
  advanced: AdvancedSettings;
  onChange: (advanced: AdvancedSettings) => void;
}

export const AdvancedSettingsComponent: React.FC<AdvancedSettingsProps> = ({
  advanced,
  onChange,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tradingRules: true,
    riskManagement: false,
    discipline: false,
    ui: false,
    insights: false,
    ruleEngine: false,
    sessions: false,
    backup: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper functions for updates
  const updateTradingRules = (updates: Partial<TradingRules>) => {
    onChange({
      ...advanced,
      tradingRules: {
        ...advanced.tradingRules,
        ...updates,
      },
    });
  };

  const updateRiskManagement = (updates: Partial<AdvancedSettings['riskManagement']>) => {
    onChange({
      ...advanced,
      riskManagement: {
        ...advanced.riskManagement,
        ...updates,
      },
    });
  };

  const updateDiscipline = (updates: Partial<AdvancedSettings['discipline']>) => {
    onChange({
      ...advanced,
      discipline: {
        ...advanced.discipline,
        ...updates,
      },
    });
  };

  const updateUI = (updates: Partial<AdvancedSettings['ui']>) => {
    onChange({
      ...advanced,
      ui: {
        ...advanced.ui,
        ...updates,
      },
    });
  };

  const updateInsights = (updates: Partial<AdvancedSettings['insights']>) => {
    onChange({
      ...advanced,
      insights: {
        ...advanced.insights,
        ...updates,
      },
    });
  };

  const updateRuleEngine = (updates: Partial<AdvancedSettings['ruleEngine']>) => {
    onChange({
      ...advanced,
      ruleEngine: {
        ...advanced.ruleEngine,
        ...updates,
      },
    });
  };

  const updateSessions = (updates: Partial<AdvancedSettings['sessions']>) => {
    onChange({
      ...advanced,
      sessions: {
        ...advanced.sessions,
        ...updates,
      },
    });
  };
  
  const updateUltraDisciplined = (updates: Partial<AdvancedSettings['ultraDisciplinedMode']>) => {
    onChange({
      ...advanced,
      ultraDisciplinedMode: {
        ...advanced.ultraDisciplinedMode,
        ...updates,
      },
    });
  };
  
  const updateStudyMode = (updates: Partial<AdvancedSettings['studyMode']>) => {
    onChange({
      ...advanced,
      studyMode: {
        ...advanced.studyMode,
        ...updates,
      },
    });
  };

  // Backup functions
  const exportSettings = () => {
    const dataStr = JSON.stringify(advanced, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trading-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          onChange(imported);
          alert('Configuración importada correctamente');
        } catch (error) {
          alert('Error al importar configuración. Verifica que el archivo sea válido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const resetSettings = () => {
    if (confirm('¿Estás seguro de que quieres resetear toda la configuración avanzada? Esta acción no se puede deshacer.')) {
      // Reset to defaults (will be handled by parent component)
      const defaultAdvanced: AdvancedSettings = {
        tradingRules: {
          maxTradesPerDay: null,
          maxTradesPerWeek: null,
          allowedTradingHours: { enabled: false, startHour: 9, endHour: 17 },
          maxLotSize: null,
          dailyProfitTarget: null,
          dailyLossLimit: null,
          psychologicalRules: [],
        },
        ultraDisciplinedMode: { enabled: false, blockOnRuleBreak: false, blockedUntil: null },
        studyMode: { enabled: false, hideMoney: false, showOnlyRMultiples: false },
        riskManagement: { maxRiskPerTrade: null, maxRiskDaily: null, maxRiskWeekly: null, maxDrawdown: null, drawdownMode: 'warning' },
        discipline: { cooldownAfterLoss: null, maxTradesConsecutiveLoss: null, forceSessionCloseOnCriticalRule: false, persistentWarnings: true },
        ui: { strictRiskMode: false, attenuateMetricsOnDrawdown: true, showOnlySurvivalMetrics: false, enableAnimations: true, showGlobalRiskPanel: true },
        insights: { autoInsightsEnabled: true, severityLevel: 'all', maxVisibleInsights: 5, updateFrequency: 'realtime', allowBlockInsights: true, blockedInsightIds: [] },
        ruleEngine: { enabled: true, rules: [] },
        sessions: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          allowedSessions: { asian: true, london: true, 'new-york': true, overlap: true, other: true },
          allowedDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
          blockTradingOutsideSession: false,
        },
      };
      onChange(defaultAdvanced);
    }
  };
  
  const addPsychologicalRule = () => {
    const newRule = prompt('Ingresa una nueva regla psicológica:');
    if (newRule && newRule.trim()) {
      updateTradingRules({
        psychologicalRules: [...advanced.tradingRules.psychologicalRules, newRule.trim()],
      });
    }
  };
  
  const removePsychologicalRule = (index: number) => {
    updateTradingRules({
      psychologicalRules: advanced.tradingRules.psychologicalRules.filter((_, i) => i !== index),
    });
  };
  
  return (
    <div className="space-y-4">
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
                <CardTitle>Configuración Avanzada</CardTitle>
            </div>
            </div>
            <CardDescription>
            Sistema completo de configuración persistente que gobierna toda la plataforma
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          {/* A) Gestión de Riesgo Global */}
          <Collapsible open={openSections.riskManagement} onOpenChange={() => toggleSection('riskManagement')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <h3 className="font-semibold">A) Gestión de Riesgo Global</h3>
                </div>
                {openSections.riskManagement ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxRiskPerTrade">Riesgo Máximo por Trade (%)</Label>
                  <Input
                    id="maxRiskPerTrade"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={advanced.riskManagement.maxRiskPerTrade ?? ''}
                    onChange={(e) => updateRiskManagement({
                      maxRiskPerTrade: e.target.value === '' ? null : parseFloat(e.target.value),
                    })}
                    placeholder="Ej: 2.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Porcentaje máximo de capital a arriesgar por operación
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxRiskDaily">Riesgo Máximo Diario (%)</Label>
                  <Input
                    id="maxRiskDaily"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={advanced.riskManagement.maxRiskDaily ?? ''}
                    onChange={(e) => updateRiskManagement({
                      maxRiskDaily: e.target.value === '' ? null : parseFloat(e.target.value),
                    })}
                    placeholder="Ej: 5.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Límite de riesgo acumulado por día
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxRiskWeekly">Riesgo Máximo Semanal (%)</Label>
                  <Input
                    id="maxRiskWeekly"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={advanced.riskManagement.maxRiskWeekly ?? ''}
                    onChange={(e) => updateRiskManagement({
                      maxRiskWeekly: e.target.value === '' ? null : parseFloat(e.target.value),
                    })}
                    placeholder="Ej: 15.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Límite de riesgo acumulado por semana
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxDrawdown">Drawdown Máximo Permitido (%)</Label>
                  <Input
                    id="maxDrawdown"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={advanced.riskManagement.maxDrawdown ?? ''}
                    onChange={(e) => updateRiskManagement({
                      maxDrawdown: e.target.value === '' ? null : parseFloat(e.target.value),
                    })}
                    placeholder="Ej: 10.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Drawdown máximo antes de activar modo de protección
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="drawdownMode">Modo de Acción ante Drawdown</Label>
                  <Select
                    id="drawdownMode"
                    value={advanced.riskManagement.drawdownMode}
                    onChange={(e) => updateRiskManagement({
                      drawdownMode: e.target.value as 'warning' | 'partial-block' | 'hard-stop',
                    })}
                  >
                    <option value="warning">Solo Advertencia</option>
                    <option value="partial-block">Bloqueo Parcial</option>
                    <option value="hard-stop">Hard Stop Total</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Info className="inline h-3 w-3 mr-1" />
                    <strong>Solo Advertencia:</strong> Muestra alertas pero permite trading
                    <br />
                    <strong>Bloqueo Parcial:</strong> Reduce tamaño de posiciones permitidas
                    <br />
                    <strong>Hard Stop Total:</strong> Bloquea completamente el trading
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* B) Disciplina y Comportamiento */}
          <Collapsible open={openSections.discipline} onOpenChange={() => toggleSection('discipline')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <h3 className="font-semibold">B) Disciplina y Comportamiento</h3>
                </div>
                {openSections.discipline ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cooldownAfterLoss">Cooldown Automático Post-Loss (minutos)</Label>
                  <Input
                    id="cooldownAfterLoss"
                    type="number"
                    min="0"
                    value={advanced.discipline.cooldownAfterLoss ?? ''}
                    onChange={(e) => updateDiscipline({
                      cooldownAfterLoss: e.target.value === '' ? null : parseInt(e.target.value),
                    })}
                    placeholder="Ej: 30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tiempo de espera obligatorio después de una pérdida
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxTradesConsecutiveLoss">Máx Trades Consecutivos en Pérdida</Label>
                  <Input
                    id="maxTradesConsecutiveLoss"
                    type="number"
                    min="0"
                    value={advanced.discipline.maxTradesConsecutiveLoss ?? ''}
                    onChange={(e) => updateDiscipline({
                      maxTradesConsecutiveLoss: e.target.value === '' ? null : parseInt(e.target.value),
                    })}
                    placeholder="Ej: 3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Número máximo de pérdidas consecutivas antes de forzar pausa
                  </p>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="forceSessionCloseOnCriticalRule"
                      checked={advanced.discipline.forceSessionCloseOnCriticalRule}
                      onChange={(e) => updateDiscipline({
                        forceSessionCloseOnCriticalRule: e.target.checked,
                      })}
                    />
                    <Label htmlFor="forceSessionCloseOnCriticalRule" className="font-semibold">
                      Forzar Cierre de Sesión si se Rompe Regla Crítica
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Si está activado, cualquier violación de regla crítica cerrará automáticamente la sesión de trading
                  </p>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="persistentWarnings"
                      checked={advanced.discipline.persistentWarnings}
                      onChange={(e) => updateDiscipline({
                        persistentWarnings: e.target.checked,
                      })}
                    />
                    <Label htmlFor="persistentWarnings" className="font-semibold">
                      Activar Warnings Persistentes
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Las advertencias permanecerán visibles hasta que se resuelvan
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* C) Visualización y UI Reactiva */}
          <Collapsible open={openSections.ui} onOpenChange={() => toggleSection('ui')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <h3 className="font-semibold">C) Visualización y UI Reactiva</h3>
                </div>
                {openSections.ui ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="strictRiskMode"
                    checked={advanced.ui.strictRiskMode}
                    onChange={(e) => updateUI({ strictRiskMode: e.target.checked })}
                  />
                  <Label htmlFor="strictRiskMode" className="font-semibold">
                    Modo Estricto de Riesgo (UI más sobria)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  La interfaz se vuelve más minimalista y enfocada en métricas de riesgo cuando está activado
                </p>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="attenuateMetricsOnDrawdown"
                    checked={advanced.ui.attenuateMetricsOnDrawdown}
                    onChange={(e) => updateUI({ attenuateMetricsOnDrawdown: e.target.checked })}
                  />
                  <Label htmlFor="attenuateMetricsOnDrawdown" className="font-semibold">
                    Atenuar Métricas Positivas si hay Drawdown Crítico
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Reduce la prominencia visual de métricas positivas cuando hay drawdown activo
                </p>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showOnlySurvivalMetrics"
                    checked={advanced.ui.showOnlySurvivalMetrics}
                    onChange={(e) => updateUI({ showOnlySurvivalMetrics: e.target.checked })}
                  />
                  <Label htmlFor="showOnlySurvivalMetrics" className="font-semibold">
                    Mostrar Solo Métricas de Supervivencia si Riesgo &gt; Límite
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Oculta métricas no esenciales cuando el riesgo supera los límites configurados
                </p>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enableAnimations"
                    checked={advanced.ui.enableAnimations}
                    onChange={(e) => updateUI({ enableAnimations: e.target.checked })}
                  />
                  <Label htmlFor="enableAnimations" className="font-semibold">
                    Activar Animaciones
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showGlobalRiskPanel"
                    checked={advanced.ui.showGlobalRiskPanel}
                    onChange={(e) => updateUI({ showGlobalRiskPanel: e.target.checked })}
                  />
                  <Label htmlFor="showGlobalRiskPanel" className="font-semibold">
                    Mostrar Panel de Riesgo Global
                  </Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* D) Insights y Alertas */}
          <Collapsible open={openSections.insights} onOpenChange={() => toggleSection('insights')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <h3 className="font-semibold">D) Insights y Alertas</h3>
                </div>
                {openSections.insights ? <ChevronUp /> : <ChevronDown />}
              </div>
        </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="autoInsightsEnabled"
                    checked={advanced.insights.autoInsightsEnabled}
                    onChange={(e) => updateInsights({ autoInsightsEnabled: e.target.checked })}
                  />
                  <Label htmlFor="autoInsightsEnabled" className="font-semibold">
                    Activar Insights Automáticos
                  </Label>
                </div>

                <div>
                  <Label htmlFor="severityLevel">Nivel de Severidad Mostrado</Label>
                  <Select
                    id="severityLevel"
                    value={advanced.insights.severityLevel}
                    onChange={(e) => updateInsights({
                      severityLevel: e.target.value as 'critical' | 'important' | 'positive' | 'all',
                    })}
                  >
                    <option value="all">Todos</option>
                    <option value="critical">Solo Críticos</option>
                    <option value="important">Críticos e Importantes</option>
                    <option value="positive">Solo Positivos</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxVisibleInsights">Máx Insights Visibles Simultáneamente</Label>
                  <Input
                    id="maxVisibleInsights"
                    type="number"
                    min="1"
                    max="20"
                    value={advanced.insights.maxVisibleInsights}
                    onChange={(e) => updateInsights({
                      maxVisibleInsights: parseInt(e.target.value) || 5,
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="updateFrequency">Frecuencia de Actualización</Label>
                  <Select
                    id="updateFrequency"
                    value={advanced.insights.updateFrequency}
                    onChange={(e) => updateInsights({
                      updateFrequency: e.target.value as 'realtime' | 'daily' | 'weekly',
                    })}
                  >
                    <option value="realtime">Tiempo Real</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allowBlockInsights"
                      checked={advanced.insights.allowBlockInsights}
                      onChange={(e) => updateInsights({ allowBlockInsights: e.target.checked })}
                    />
                    <Label htmlFor="allowBlockInsights" className="font-semibold">
                      Permitir Bloquear Insights Irrelevantes
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Permite ocultar insights que no son relevantes para tu estrategia
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* E) Motor de Reglas */}
          <Collapsible open={openSections.ruleEngine} onOpenChange={() => toggleSection('ruleEngine')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                  <h3 className="font-semibold">E) Motor de Reglas</h3>
                </div>
                {openSections.ruleEngine ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ruleEngineEnabled"
                  checked={advanced.ruleEngine.enabled}
                  onChange={(e) => updateRuleEngine({ enabled: e.target.checked })}
                />
                <Label htmlFor="ruleEngineEnabled" className="font-semibold">
                  Activar Motor de Reglas
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                El motor de reglas evalúa automáticamente cada trade contra las reglas configuradas
              </p>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <Info className="inline h-4 w-4 mr-1" />
                  Las reglas básicas (máx trades, horarios, etc.) se configuran en la sección "Reglas Personalizadas" más abajo.
                  Esta sección permite configurar reglas condicionales avanzadas (próximamente).
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* F) Sesiones y Datos */}
          <Collapsible open={openSections.sessions} onOpenChange={() => toggleSection('sessions')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <h3 className="font-semibold">F) Sesiones y Datos</h3>
                </div>
                {openSections.sessions ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div>
                <Label htmlFor="timezone">Zona Horaria del Trader</Label>
                <Input
                  id="timezone"
                  type="text"
                  value={advanced.sessions.timezone}
                  onChange={(e) => updateSessions({ timezone: e.target.value })}
                  placeholder="Ej: America/New_York"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Zona horaria actual: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">Sesiones Operables</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(['asian', 'london', 'new-york', 'overlap', 'other'] as const).map((session) => (
                    <div key={session} className="flex items-center gap-2">
                      <Checkbox
                        id={`session-${session}`}
                        checked={advanced.sessions.allowedSessions[session]}
                        onChange={(e) => updateSessions({
                          allowedSessions: {
                            ...advanced.sessions.allowedSessions,
                            [session]: e.target.checked,
                          },
                        })}
                      />
                      <Label htmlFor={`session-${session}`} className="text-sm">
                        {session === 'new-york' ? 'Nueva York' : session === 'asian' ? 'Asiática' : session.charAt(0).toUpperCase() + session.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Días Permitidos para Operar</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={advanced.sessions.allowedDays[day]}
                        onChange={(e) => updateSessions({
                          allowedDays: {
                            ...advanced.sessions.allowedDays,
                            [day]: e.target.checked,
                          },
                        })}
                      />
                      <Label htmlFor={`day-${day}`} className="text-sm">
                        {day === 'monday' ? 'Lunes' : day === 'tuesday' ? 'Martes' : day === 'wednesday' ? 'Miércoles' : day === 'thursday' ? 'Jueves' : day === 'friday' ? 'Viernes' : day === 'saturday' ? 'Sábado' : 'Domingo'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="blockTradingOutsideSession"
                  checked={advanced.sessions.blockTradingOutsideSession}
                  onChange={(e) => updateSessions({ blockTradingOutsideSession: e.target.checked })}
                />
                <Label htmlFor="blockTradingOutsideSession" className="font-semibold">
                  Bloquear Trading Fuera de Sesión
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Si está activado, no se permitirá crear trades fuera de las sesiones y días configurados
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Reglas Personalizadas (mantener existente) */}
          <Collapsible open={openSections.tradingRules} onOpenChange={() => toggleSection('tradingRules')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <h3 className="font-semibold">Reglas Personalizadas</h3>
                </div>
                {openSections.tradingRules ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxTradesPerDay">Máximo de Operaciones por Día</Label>
                  <Input
                    id="maxTradesPerDay"
                    type="number"
                    min="0"
                    value={advanced.tradingRules.maxTradesPerDay ?? ''}
                    onChange={(e) => updateTradingRules({
                      maxTradesPerDay: e.target.value === '' ? null : parseInt(e.target.value) || 0,
                    })}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deja vacío para sin límite
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="maxTradesPerWeek">Máximo de Operaciones por Semana</Label>
                  <Input
                    id="maxTradesPerWeek"
                    type="number"
                    min="0"
                    value={advanced.tradingRules.maxTradesPerWeek ?? ''}
                    onChange={(e) => updateTradingRules({
                      maxTradesPerWeek: e.target.value === '' ? null : parseInt(e.target.value) || 0,
                    })}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deja vacío para sin límite
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="maxLotSize">Tamaño de Lote Máximo</Label>
                  <Input
                    id="maxLotSize"
                    type="number"
                    step="0.01"
                    min="0"
                    value={advanced.tradingRules.maxLotSize ?? ''}
                    onChange={(e) => updateTradingRules({
                      maxLotSize: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                    })}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deja vacío para sin límite
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="dailyProfitTarget">Objetivo Diario</Label>
                  <Input
                    id="dailyProfitTarget"
                    type="number"
                    step="0.01"
                    value={advanced.tradingRules.dailyProfitTarget ?? ''}
                    onChange={(e) => updateTradingRules({
                      dailyProfitTarget: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                    })}
                    placeholder="Sin objetivo"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Objetivo de ganancia diaria (opcional)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="dailyLossLimit">Límite de Pérdida Diaria</Label>
                  <Input
                    id="dailyLossLimit"
                    type="number"
                    step="0.01"
                    value={advanced.tradingRules.dailyLossLimit ?? ''}
                    onChange={(e) => updateTradingRules({
                      dailyLossLimit: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                    })}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Límite máximo de pérdida por día
                  </p>
                </div>
              </div>
              
              {/* Horario Permitido */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="allowedHoursEnabled"
                    checked={advanced.tradingRules.allowedTradingHours.enabled}
                    onChange={(e) => updateTradingRules({
                      allowedTradingHours: {
                        ...advanced.tradingRules.allowedTradingHours,
                        enabled: e.target.checked,
                      },
                    })}
                  />
                  <Label htmlFor="allowedHoursEnabled" className="font-semibold">
                    Restringir Horario de Trading
                  </Label>
                </div>
                
                {advanced.tradingRules.allowedTradingHours.enabled && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label htmlFor="startHour">Hora de Inicio</Label>
                      <Input
                        id="startHour"
                        type="number"
                        min="0"
                        max="23"
                        value={advanced.tradingRules.allowedTradingHours.startHour}
                        onChange={(e) => updateTradingRules({
                          allowedTradingHours: {
                            ...advanced.tradingRules.allowedTradingHours,
                            startHour: parseInt(e.target.value) || 0,
                          },
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endHour">Hora de Fin</Label>
                      <Input
                        id="endHour"
                        type="number"
                        min="0"
                        max="23"
                        value={advanced.tradingRules.allowedTradingHours.endHour}
                        onChange={(e) => updateTradingRules({
                          allowedTradingHours: {
                            ...advanced.tradingRules.allowedTradingHours,
                            endHour: parseInt(e.target.value) || 23,
                          },
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reglas Psicológicas */}
              <div className="space-y-2">
                <Label>Reglas Psicológicas</Label>
                <div className="space-y-2">
                  {advanced.tradingRules.psychologicalRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={rule}
                        onChange={(e) => {
                          const newRules = [...advanced.tradingRules.psychologicalRules];
                          newRules[index] = e.target.value;
                          updateTradingRules({ psychologicalRules: newRules });
                        }}
                        placeholder="Ej: No operar después de 2 pérdidas consecutivas"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePsychologicalRule(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPsychologicalRule}
                    className="w-full"
                  >
                    + Agregar Regla Psicológica
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
            
            {/* Modo Ultra-Disciplinado */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Modo Ultra-Disciplinado
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ultraDisciplinedEnabled"
                    checked={advanced.ultraDisciplinedMode.enabled}
                    onChange={(e) => updateUltraDisciplined({
                      enabled: e.target.checked,
                    })}
                  />
                  <Label htmlFor="ultraDisciplinedEnabled" className="font-semibold">
                    Activar Modo Ultra-Disciplinado
                  </Label>
                </div>
                
                {advanced.ultraDisciplinedMode.enabled && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="blockOnRuleBreak"
                        checked={advanced.ultraDisciplinedMode.blockOnRuleBreak}
                        onChange={(e) => updateUltraDisciplined({
                          blockOnRuleBreak: e.target.checked,
                        })}
                      />
                      <Label htmlFor="blockOnRuleBreak">
                        Bloquear todo si se rompe una regla
                      </Label>
                    </div>
                    
                    {advanced.ultraDisciplinedMode.blockedUntil && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-md">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          <strong>Bloqueado hasta:</strong>{' '}
                          {new Date(advanced.ultraDisciplinedMode.blockedUntil).toLocaleString('es-ES')}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => updateUltraDisciplined({ blockedUntil: null })}
                        >
                          Desbloquear Manualmente
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Modo Estudio */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Modo Estudio
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="studyModeEnabled"
                    checked={advanced.studyMode.enabled}
                    onChange={(e) => updateStudyMode({
                      enabled: e.target.checked,
                    })}
                  />
                  <Label htmlFor="studyModeEnabled" className="font-semibold">
                    Activar Modo Estudio
                  </Label>
                </div>
                
                {advanced.studyMode.enabled && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hideMoney"
                        checked={advanced.studyMode.hideMoney}
                        onChange={(e) => updateStudyMode({
                          hideMoney: e.target.checked,
                        })}
                      />
                      <Label htmlFor="hideMoney">
                        Ocultar montos de dinero
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="showOnlyRMultiples"
                        checked={advanced.studyMode.showOnlyRMultiples}
                        onChange={(e) => updateStudyMode({
                          showOnlyRMultiples: e.target.checked,
                        })}
                      />
                      <Label htmlFor="showOnlyRMultiples">
                        Mostrar solo R múltiples
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* G) Backup y Seguridad Local */}
          <Collapsible open={openSections.backup} onOpenChange={() => toggleSection('backup')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <h3 className="font-semibold">G) Backup y Seguridad Local</h3>
                </div>
                {openSections.backup ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={exportSettings}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Configuración
                </Button>
                
                <Button
                  variant="outline"
                  onClick={importSettings}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar Configuración
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={resetSettings}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Resetear Configuración
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <Info className="inline h-4 w-4 mr-1" />
                  <strong>Exportar:</strong> Descarga un archivo JSON con toda tu configuración avanzada
                  <br />
                  <strong>Importar:</strong> Restaura la configuración desde un archivo JSON previamente exportado
                  <br />
                  <strong>Resetear:</strong> Restaura todos los valores a los predeterminados (requiere confirmación)
                </p>
              </div>
        </CollapsibleContent>
      </Collapsible>
        </CardContent>
    </Card>
    </div>
  );
};
