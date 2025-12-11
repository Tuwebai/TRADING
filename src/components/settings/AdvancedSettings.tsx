import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { ChevronDown, ChevronUp, Shield, BookOpen, Lock } from 'lucide-react';
import type { AdvancedSettings, TradingRules } from '@/types/Trading';
import { cn } from '@/lib/utils';

interface AdvancedSettingsProps {
  advanced: AdvancedSettings;
  onChange: (advanced: AdvancedSettings) => void;
}

export const AdvancedSettingsComponent: React.FC<AdvancedSettingsProps> = ({
  advanced,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const updateTradingRules = (updates: Partial<TradingRules>) => {
    onChange({
      ...advanced,
      tradingRules: {
        ...advanced.tradingRules,
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
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Configuración Avanzada</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
            <CardDescription>
              Reglas personalizadas, modos de disciplina y configuración de estudio
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="border-t">
          <CardContent className="space-y-6 pt-6">
            {/* Reglas Personalizadas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Reglas Personalizadas
              </h3>
              
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
                    onCheckedChange={(checked) => updateTradingRules({
                      allowedTradingHours: {
                        ...advanced.tradingRules.allowedTradingHours,
                        enabled: checked as boolean,
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
            </div>
            
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
                    onCheckedChange={(checked) => updateUltraDisciplined({
                      enabled: checked as boolean,
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
                        onCheckedChange={(checked) => updateUltraDisciplined({
                          blockOnRuleBreak: checked as boolean,
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
                    onCheckedChange={(checked) => updateStudyMode({
                      enabled: checked as boolean,
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
                        onCheckedChange={(checked) => updateStudyMode({
                          hideMoney: checked as boolean,
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
                        onCheckedChange={(checked) => updateStudyMode({
                          showOnlyRMultiples: checked as boolean,
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

