/**
 * MT5 Accounts Manager Component
 * Allows users to associate/disassociate MT5 accounts with their user account
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  getMT5Accounts,
  createMT5Account,
  updateMT5Account,
  deleteMT5Account,
  type MT5Account,
  type CreateMT5AccountData,
} from '@/lib/supabaseMT5Accounts';
import { Trash2, Plus, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const MT5AccountsManager = () => {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateMT5AccountData>({
    broker: '',
    account_mode: 'demo',
    account_number: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await getMT5Accounts();
      setAccounts(data);
    } catch (err) {
      console.error('Error loading MT5 accounts:', err);
      setError('Error al cargar las cuentas MT5');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.broker.trim()) {
      setError('El nombre del broker es requerido');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createMT5Account(formData);
      if (result.success) {
        setSuccess('Cuenta MT5 asociada correctamente');
        setFormData({ broker: '', account_mode: 'demo', account_number: '' });
        setShowForm(false);
        await loadAccounts();
      } else {
        setError(result.error || 'Error al asociar la cuenta');
      }
    } catch (err) {
      setError('Error al asociar la cuenta MT5');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (accountId: string, currentStatus: boolean) => {
    try {
      const result = await updateMT5Account(accountId, { is_active: !currentStatus });
      if (result.success) {
        await loadAccounts();
        setSuccess(`Cuenta ${!currentStatus ? 'activada' : 'desactivada'} correctamente`);
      } else {
        setError(result.error || 'Error al actualizar la cuenta');
      }
    } catch (err) {
      setError('Error al actualizar la cuenta');
      console.error(err);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta asociación? Los trades de MT5 seguirán existiendo pero no se asociarán automáticamente a tu cuenta.')) {
      return;
    }

    try {
      const result = await deleteMT5Account(accountId);
      if (result.success) {
        setSuccess('Asociación eliminada correctamente');
        await loadAccounts();
      } else {
        setError(result.error || 'Error al eliminar la asociación');
      }
    } catch (err) {
      setError('Error al eliminar la asociación');
      console.error(err);
    }
  };

  const getAccountModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      simulation: 'Simulación',
      demo: 'Demo',
      live: 'Live',
    };
    return labels[mode] || mode;
  };

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas MT5 Asociadas</CardTitle>
        <CardDescription>
          Asocia tus cuentas MT5 para que los trades se asignen automáticamente a tu usuario.
          Los trades de cuentas asociadas aparecerán automáticamente en tu registro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Accounts List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando cuentas...
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tienes cuentas MT5 asociadas</p>
            <p className="text-sm mt-2">
              Asocia una cuenta para que los trades de MT5 se asignen automáticamente a tu usuario
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{account.broker}</h4>
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {getAccountModeLabel(account.account_mode)}
                    </span>
                    {account.account_number && (
                      <span className="text-sm text-muted-foreground">
                        (#{account.account_number})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {account.is_active ? (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Activa
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactiva
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Creada: {new Date(account.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(account.id, account.is_active)}
                  >
                    {account.is_active ? 'Desactivar' : 'Activar'}
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
            ))}
          </div>
        )}

        {/* Create Form */}
        {showForm ? (
          <div className="p-4 border rounded-lg bg-card space-y-4">
            <h4 className="font-semibold">Asociar Nueva Cuenta MT5</h4>
            <div>
              <Label htmlFor="broker">Nombre del Broker *</Label>
              <Input
                id="broker"
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                placeholder="Ej: IC Markets, FXTM, etc."
              />
            </div>
            <div>
              <Label htmlFor="account_mode">Modo de Cuenta *</Label>
              <Select
                id="account_mode"
                value={formData.account_mode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    account_mode: e.target.value as 'simulation' | 'demo' | 'live',
                  })
                }
              >
                <option value="simulation">Simulación</option>
                <option value="demo">Demo</option>
                <option value="live">Live</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="account_number">Número de Cuenta (Opcional)</Label>
              <Input
                id="account_number"
                value={formData.account_number || ''}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Ej: 12345678"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Útil si tienes múltiples cuentas con el mismo broker y modo
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Asociando...' : 'Asociar Cuenta'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Asociar Nueva Cuenta MT5
          </Button>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm text-blue-600 dark:text-blue-400">
          <p className="font-medium mb-1">ℹ️ Cómo funciona:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Asocia tu cuenta MT5 usando el nombre del broker y el modo (demo/live/simulación)</li>
            <li>Los trades que lleguen desde MT5 con ese broker y modo se asignarán automáticamente a tu usuario</li>
            <li>Puedes tener múltiples cuentas asociadas</li>
            <li>Puedes desactivar una cuenta sin eliminarla para pausar la asociación automática</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

