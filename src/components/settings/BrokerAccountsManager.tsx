/**
 * Broker Accounts Manager
 * Componente para gestionar todas las cuentas de broker conectadas
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/use-toast';
import {
  getBrokerAccounts,
  deleteBrokerAccount,
  updateBrokerAccount,
  testApiConnection,
  getAccountStatusDisplay,
  type BrokerAccount,
} from '@/lib/supabaseBrokerAccounts';
import { BrokerConnectionWizard } from './BrokerConnectionWizard';
import { Loader2, Trash2, TestTube, RefreshCw, Plus, AlertCircle, CheckCircle2, Clock, FileText, XCircle, Info } from 'lucide-react';

export const BrokerAccountsManager: React.FC = () => {
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const fetchedAccounts = await getBrokerAccounts();
      setAccounts(fetchedAccounts);
    } catch (error) {
      console.error('Error fetching broker accounts:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar las cuentas de broker',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cuenta de broker?')) {
      return;
    }

    const result = await deleteBrokerAccount(id);
    if (result.success) {
      toast({
        title: 'Éxito',
        description: 'Cuenta de broker eliminada correctamente',
      });
      fetchAccounts();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Error al eliminar la cuenta',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingConnection(id);
    try {
      const result = await testApiConnection(id);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message || 'Conexión probada correctamente',
        });
        fetchAccounts();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al probar la conexión',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error inesperado al probar la conexión',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const handleToggleActive = async (account: BrokerAccount) => {
    const newStatus = account.status === 'connected' ? 'disconnected' : 'connected';
    const result = await updateBrokerAccount(account.id, { status: newStatus });
    if (result.success) {
      toast({
        title: 'Éxito',
        description: `Cuenta ${newStatus === 'connected' ? 'activada' : 'desactivada'}`,
      });
      fetchAccounts();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Error al actualizar la cuenta',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: BrokerAccount['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending_verification':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'manual_only':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (showWizard) {
    return (
      <BrokerConnectionWizard
        onComplete={() => {
          setShowWizard(false);
          fetchAccounts();
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas de Broker Conectadas</CardTitle>
        <CardDescription>
          Gestiona tus cuentas de broker y sus conexiones. Los trades de cuentas conectadas aparecerán automáticamente en tu registro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando cuentas...</span>
          </div>
        ) : (
          <>
            {accounts.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">
                  No tienes cuentas de broker conectadas.
                </p>
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Conectar Primera Cuenta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => {
                  const statusDisplay = getAccountStatusDisplay(account.status);
                  return (
                    <div
                      key={account.id}
                      className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(account.status)}
                            <div>
                              <div className="font-semibold">
                                {account.alias || account.broker}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {account.broker}
                                {account.platform && ` • ${account.platform}`}
                                {account.account_number && ` • #${account.account_number}`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Tipo:</span>
                              <span className="capitalize font-medium">{account.account_type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Integración:</span>
                              <span className="font-medium">
                                {account.integration_type === 'ea'
                                  ? 'Expert Advisor'
                                  : account.integration_type === 'api'
                                  ? 'API Oficial'
                                  : 'Manual'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${statusDisplay.color}`}>
                                {statusDisplay.icon} {statusDisplay.label}
                              </span>
                            </div>
                          </div>

                          {account.error_message && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              {account.error_message}
                            </div>
                          )}

                          {account.integration_type === 'ea' && account.status === 'pending_verification' && (
                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200">
                              <Info className="h-4 w-4 inline mr-1" />
                              Instala el Expert Advisor en MetaTrader para completar la conexión.
                            </div>
                          )}

                          {account.last_sync_at && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Última sincronización: {new Date(account.last_sync_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {account.integration_type === 'api' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(account.id)}
                              disabled={testingConnection === account.id}
                            >
                              {testingConnection === account.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <TestTube className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(account)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Conectar Nueva Cuenta
              </Button>
            </div>
          </>
        )}

        {/* Información sobre cómo funciona */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Cómo funciona:
              </div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>
                  <strong>Expert Advisor (EA):</strong> Descarga e instala el EA en MetaTrader. El estado cambiará a "Conectado" cuando recibamos datos.
                </li>
                <li>
                  <strong>API Oficial:</strong> Ingresa tus credenciales API. Puedes probar la conexión con el botón de prueba.
                </li>
                <li>
                  <strong>Manual:</strong> Registra tus trades manualmente. No hay sincronización automática.
                </li>
                <li>
                  <strong>Importante:</strong> No todos los brokers permiten integración automática. El sistema refleja esto claramente.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

