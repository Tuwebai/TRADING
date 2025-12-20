/**
 * Notification Settings Component
 * Allows users to configure notification preferences
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Bell, BellOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
  type NotificationPreferences,
} from '@/lib/notifications';

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    loadNotificationPreferences()
  );
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission()
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isNotificationSupported());
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    const newPreferences = { ...preferences, enabled };
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  const handleToggleType = (type: keyof NotificationPreferences['types'], value: boolean) => {
    const newPreferences = {
      ...preferences,
      types: {
        ...preferences.types,
        [type]: value,
      },
    };
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  const handleToggleSound = (sound: boolean) => {
    const newPreferences = { ...preferences, sound };
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  const handleToggleVibrate = (vibrate: boolean) => {
    const newPreferences = { ...preferences, vibrate };
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificaciones No Disponibles
          </CardTitle>
          <CardDescription>
            Tu navegador no soporta notificaciones push
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configuración de Notificaciones
        </CardTitle>
        <CardDescription>
          Configura qué notificaciones quieres recibir
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : permission === 'denied' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium">
                Permiso: {permission === 'granted' ? 'Concedido' : permission === 'denied' ? 'Denegado' : 'No solicitado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted'
                  ? 'Las notificaciones están habilitadas'
                  : permission === 'denied'
                  ? 'Debes habilitar los permisos en la configuración del navegador'
                  : 'Solicita permiso para recibir notificaciones'}
              </p>
            </div>
          </div>
          {permission !== 'granted' && (
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting || permission === 'denied'}
              variant={permission === 'denied' ? 'outline' : 'default'}
            >
              {isRequesting ? 'Solicitando...' : 'Solicitar Permiso'}
            </Button>
          )}
        </div>

        {/* Enable/Disable All */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications-enabled">Habilitar Notificaciones</Label>
            <p className="text-sm text-muted-foreground">
              Activa o desactiva todas las notificaciones
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={preferences.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={permission !== 'granted'}
          />
        </div>

        {permission === 'granted' && preferences.enabled && (
          <>
            {/* Notification Types */}
            <div className="space-y-4">
              <Label className="text-base">Tipos de Notificaciones</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="risk-warnings">Advertencias de Riesgo</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertas cuando te acercas a límites de riesgo
                    </p>
                  </div>
                  <Switch
                    id="risk-warnings"
                    checked={preferences.types.riskWarnings}
                    onCheckedChange={(checked) => handleToggleType('riskWarnings', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="risk-blocked">Trading Bloqueado</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones cuando el trading está bloqueado
                    </p>
                  </div>
                  <Switch
                    id="risk-blocked"
                    checked={preferences.types.riskBlocked}
                    onCheckedChange={(checked) => handleToggleType('riskBlocked', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="drawdown-warnings">Advertencias de Drawdown</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertas de drawdown alto
                    </p>
                  </div>
                  <Switch
                    id="drawdown-warnings"
                    checked={preferences.types.drawdownWarnings}
                    onCheckedChange={(checked) => handleToggleType('drawdownWarnings', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="drawdown-critical">Drawdown Crítico</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertas cuando el drawdown es crítico
                    </p>
                  </div>
                  <Switch
                    id="drawdown-critical"
                    checked={preferences.types.drawdownCritical}
                    onCheckedChange={(checked) => handleToggleType('drawdownCritical', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-limit">Límite Diario Alcanzado</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones cuando alcanzas límites diarios
                    </p>
                  </div>
                  <Switch
                    id="daily-limit"
                    checked={preferences.types.dailyLimitReached}
                    onCheckedChange={(checked) => handleToggleType('dailyLimitReached', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="trade-opened">Operaciones Abiertas</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones cuando abres una operación
                    </p>
                  </div>
                  <Switch
                    id="trade-opened"
                    checked={preferences.types.tradeOpened}
                    onCheckedChange={(checked) => handleToggleType('tradeOpened', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="trade-closed">Operaciones Cerradas</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones cuando cierras una operación
                    </p>
                  </div>
                  <Switch
                    id="trade-closed"
                    checked={preferences.types.tradeClosed}
                    onCheckedChange={(checked) => handleToggleType('tradeClosed', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="goal-failed">Metas Fallidas</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones cuando una meta no se cumple
                    </p>
                  </div>
                  <Switch
                    id="goal-failed"
                    checked={preferences.types.goalFailed}
                    onCheckedChange={(checked) => handleToggleType('goalFailed', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="routine-reminders">Recordatorios de Rutina</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones para completar rutinas
                    </p>
                  </div>
                  <Switch
                    id="routine-reminders"
                    checked={preferences.types.routineReminders}
                    onCheckedChange={(checked) => handleToggleType('routineReminders', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Sound and Vibration */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base">Opciones Adicionales</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound">Sonido</Label>
                    <p className="text-sm text-muted-foreground">
                      Reproducir sonido con las notificaciones
                    </p>
                  </div>
                  <Switch
                    id="sound"
                    checked={preferences.sound}
                    onCheckedChange={handleToggleSound}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="vibrate">Vibración</Label>
                    <p className="text-sm text-muted-foreground">
                      Vibrar con las notificaciones (solo móviles)
                    </p>
                  </div>
                  <Switch
                    id="vibrate"
                    checked={preferences.vibrate}
                    onCheckedChange={handleToggleVibrate}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

