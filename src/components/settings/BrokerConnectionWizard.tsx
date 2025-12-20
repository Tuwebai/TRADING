/**
 * Broker Connection Wizard
 * Wizard step-by-step para conectar cuentas de broker
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/use-toast';
import {
  createBrokerAccount,
  type BrokerInfo,
  type IntegrationType,
  type AccountType,
} from '@/lib/supabaseBrokerAccounts';
import { BrokerSelector } from './BrokerSelector';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Info as InfoIcon, Loader2, Eye, EyeOff } from 'lucide-react';

interface BrokerConnectionWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 'broker' | 'integration' | 'details' | 'credentials' | 'review';

export const BrokerConnectionWizard: React.FC<BrokerConnectionWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>('broker');
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedBroker, setSelectedBroker] = useState<BrokerInfo | null>(null);
  const [integrationType, setIntegrationType] = useState<IntegrationType | null>(null);
  const [platform, setPlatform] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('demo');
  const [alias, setAlias] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps: WizardStep[] = ['broker', 'integration', 'details', 'credentials', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  const validateStep = (step: WizardStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'broker':
        if (!selectedBroker) {
          newErrors.broker = 'Debes seleccionar un broker';
        }
        break;

      case 'integration':
        if (!integrationType) {
          newErrors.integrationType = 'Debes seleccionar un tipo de integración';
        }
        break;

      case 'details':
        if (selectedBroker?.requiresPlatform && !platform) {
          newErrors.platform = 'Plataforma es requerida';
        }
        if (selectedBroker?.requiresAccountNumber && !accountNumber) {
          newErrors.accountNumber = 'Número de cuenta es requerido';
        }
        break;

      case 'credentials':
        if (integrationType === 'api') {
          if (!apiKey) {
            newErrors.apiKey = 'API Key es requerida';
          }
          if (!apiSecret) {
            newErrors.apiSecret = 'API Secret es requerido';
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (!selectedBroker || !integrationType) {
      toast({
        title: 'Error',
        description: 'Faltan datos requeridos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await createBrokerAccount(
        selectedBroker.name,
        selectedBroker.requiresPlatform ? platform : null,
        selectedBroker.requiresAccountNumber ? accountNumber : null,
        accountType,
        integrationType,
        alias || null,
        integrationType === 'api' ? apiKey : undefined,
        integrationType === 'api' ? apiSecret : undefined
      );

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Cuenta de broker creada correctamente',
        });
        onComplete?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al crear la cuenta',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error inesperado al crear la cuenta',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'broker':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Selecciona tu Broker</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Busca y selecciona el broker que utilizas para trading.
              </p>
              <BrokerSelector
                value={selectedBroker?.name || null}
                onSelect={setSelectedBroker}
                error={errors.broker}
              />
            </div>
          </div>
        );

      case 'integration':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Tipo de Integración</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona cómo deseas conectar tu cuenta.
              </p>
              <div className="space-y-3">
                {selectedBroker?.integrationTypes.map((type) => {
                  const typeInfo = {
                    ea: {
                      label: 'Expert Advisor (EA)',
                      description: 'Conexión automática vía EA instalado en MetaTrader',
                      icon: '🤖',
                    },
                    api: {
                      label: 'API Oficial',
                      description: 'Conexión vía API oficial del broker (requiere credenciales)',
                      icon: '🔌',
                    },
                    manual: {
                      label: 'Registro Manual',
                      description: 'Registra trades manualmente sin conexión automática',
                      icon: '📝',
                    },
                  }[type];

                  return (
                    <div
                      key={type}
                      onClick={() => setIntegrationType(type)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        integrationType === type
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{typeInfo.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium">{typeInfo.label}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {typeInfo.description}
                          </div>
                        </div>
                        {integrationType === type && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {errors.integrationType && (
                <p className="text-sm text-red-500 mt-2">{errors.integrationType}</p>
              )}
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Detalles de la Cuenta</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Proporciona la información de tu cuenta.
              </p>
              <div className="space-y-4">
                {selectedBroker?.requiresPlatform && (
                  <div>
                    <Label htmlFor="platform">Plataforma *</Label>
                    <Select
                      id="platform"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                    >
                      <option value="">Selecciona una plataforma</option>
                      {selectedBroker.platforms.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                    {errors.platform && (
                      <p className="text-sm text-red-500 mt-1">{errors.platform}</p>
                    )}
                  </div>
                )}

                {selectedBroker?.requiresAccountNumber && (
                  <div>
                    <Label htmlFor="accountNumber">Número de Cuenta *</Label>
                    <Input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Ej: 12345678"
                    />
                    {errors.accountNumber && (
                      <p className="text-sm text-red-500 mt-1">{errors.accountNumber}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="accountType">Tipo de Cuenta *</Label>
                  <Select
                    id="accountType"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                  >
                    <option value="demo">Demo</option>
                    <option value="live">Live</option>
                    <option value="simulation">Simulación</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="alias">Alias (Opcional)</Label>
                  <Input
                    id="alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Ej: Mi Cuenta Principal"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Un nombre personalizado para identificar esta cuenta fácilmente
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'credentials':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Credenciales API</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ingresa tus credenciales API. Estas se almacenarán de forma segura y encriptada.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Ingresa tu API Key"
                  />
                  {errors.apiKey && (
                    <p className="text-sm text-red-500 mt-1">{errors.apiKey}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="apiSecret">API Secret *</Label>
                  <div className="relative">
                    <Input
                      id="apiSecret"
                      type={showApiSecret ? 'text' : 'password'}
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Ingresa tu API Secret"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.apiSecret && (
                    <p className="text-sm text-red-500 mt-1">{errors.apiSecret}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ Asegúrate de que tu API Key tenga solo permisos de lectura
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Revisar y Confirmar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Revisa la información antes de crear la cuenta.
              </p>
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Broker:</span>
                  <span className="font-medium">{selectedBroker?.name}</span>
                </div>
                {selectedBroker?.requiresPlatform && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plataforma:</span>
                    <span className="font-medium">{platform}</span>
                  </div>
                )}
                {selectedBroker?.requiresAccountNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número de Cuenta:</span>
                    <span className="font-medium">{accountNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de Cuenta:</span>
                  <span className="font-medium capitalize">{accountType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de Integración:</span>
                  <span className="font-medium">
                    {integrationType === 'ea'
                      ? 'Expert Advisor'
                      : integrationType === 'api'
                      ? 'API Oficial'
                      : 'Manual'}
                  </span>
                </div>
                {alias && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alias:</span>
                    <span className="font-medium">{alias}</span>
                  </div>
                )}
              </div>

              {integrationType === 'ea' && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Próximos Pasos
                      </div>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                        <li>Descarga el Expert Advisor desde la sección de descargas</li>
                        <li>Instala el EA en tu plataforma MetaTrader</li>
                        <li>Ingresa la API Key proporcionada en la configuración del EA</li>
                        <li>El estado cambiará a "Conectado" cuando recibamos datos del EA</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {integrationType === 'manual' && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                        Modo Manual
                      </div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Esta cuenta no tendrá sincronización automática. Deberás registrar tus trades manualmente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Determinar si se debe mostrar el paso de credenciales
  const shouldShowCredentialsStep = integrationType === 'api';
  const actualSteps = shouldShowCredentialsStep
    ? steps
    : steps.filter((s) => s !== 'credentials');

  const actualStepIndex = actualSteps.indexOf(currentStep);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar Cuenta de Broker</CardTitle>
        <CardDescription>
          Paso {actualStepIndex + 1} de {actualSteps.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            {actualSteps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index <= actualStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index < actualStepIndex ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>
                {index < actualSteps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < actualStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {currentStepIndex > 0 && (
                <Button variant="outline" onClick={handleBack} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>
              )}
              {currentStepIndex === 0 && onCancel && (
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  Cancelar
                </Button>
              )}
            </div>
            <div>
              {currentStep === 'review' ? (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Crear Cuenta
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={loading}>
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

