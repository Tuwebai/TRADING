import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { isBlocked } from '@/lib/tradingRules';
import { Button } from '@/components/ui/Button';

export const BlockedOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettingsStore();
  const blocked = isBlocked(settings);
  
  if (!blocked) {
    return <>{children}</>;
  }
  
  const blockedUntil = settings.advanced?.ultraDisciplinedMode.blockedUntil;
  const blockedDate = blockedUntil ? new Date(blockedUntil) : null;
  
  return (
    <div className="relative">
      {children}
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-500/50 bg-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/20">
                <Lock className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-red-600 dark:text-red-400">
                  Trading Bloqueado
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Has roto una regla de trading
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-md">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Modo Ultra-Disciplinado Activado
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  El trading está bloqueado hasta que se cumpla el tiempo de bloqueo.
                </p>
              </div>
            </div>
            
            {blockedDate && (
              <div className="text-center p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-1">Bloqueado hasta:</p>
                <p className="text-lg font-bold">
                  {blockedDate.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres desbloquear manualmente? Esto va en contra del modo ultra-disciplinado.')) {
                    updateSettings({
                      advanced: {
                        ...settings.advanced!,
                        ultraDisciplinedMode: {
                          ...settings.advanced!.ultraDisciplinedMode,
                          blockedUntil: null,
                        },
                      },
                    });
                  }
                }}
              >
                Desbloquear Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

