import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ThemeEditor } from '@/components/settings/ThemeEditor';
import { AdvancedSettingsComponent } from '@/components/settings/AdvancedSettings';
import { BrokerAccountsManager } from '@/components/settings/BrokerAccountsManager';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { useSettingsStore } from '@/store/settingsStore';
import type { ThemeName, ThemeConfig } from '@/types/Trading';

const currencies = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'BTC', 'ETH',
];

export const SettingsPage = () => {
  const { settings, loadSettings, updateSettings } = useSettingsStore();
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setFormData(settings);
    setHasChanges(false);
  }, [settings]);

  const handleChange = (field: keyof typeof settings, value: any) => {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(formData);
    setHasChanges(false);
  };

  const handleThemeChange = (theme: ThemeName, customTheme: ThemeConfig | null) => {
    setFormData({ ...formData, theme, customTheme });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Configura las preferencias de tu registro de trading
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Cuenta</CardTitle>
          <CardDescription>
            Configura el tamaño de tu cuenta, moneda y parámetros de riesgo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountSize">Tamaño de Cuenta</Label>
            <Input
              id="accountSize"
              type="number"
              step="0.01"
              value={formData.accountSize}
              onChange={(e) => handleChange('accountSize', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="baseCurrency">Moneda Base</Label>
            <Select
              id="baseCurrency"
              value={formData.baseCurrency}
              onChange={(e) => handleChange('baseCurrency', e.target.value)}
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="riskPerTrade">Riesgo por Operación (%)</Label>
            <Input
              id="riskPerTrade"
              type="number"
              step="0.1"
              value={formData.riskPerTrade}
              onChange={(e) => handleChange('riskPerTrade', parseFloat(e.target.value) || 0)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Porcentaje de la cuenta a arriesgar por operación (ej: 1 = 1%)
            </p>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={handleSave}>Guardar Cambios</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia y Temas</CardTitle>
          <CardDescription>
            Personaliza completamente la apariencia de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeEditor
            currentTheme={formData.theme}
            customTheme={formData.customTheme}
            onThemeChange={handleThemeChange}
          />
          {hasChanges && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button onClick={handleSave}>Guardar Cambios de Tema</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestión de Cuentas de Broker */}
      <BrokerAccountsManager />

      {/* Configuración de Notificaciones */}
      <NotificationSettings />

      {/* Configuración Avanzada */}
      <AdvancedSettingsComponent
        advanced={settings.advanced || {
          tradingRules: {
            maxTradesPerDay: null,
            maxTradesPerWeek: null,
            allowedTradingHours: {
              enabled: false,
              startHour: 9,
              endHour: 17,
            },
            maxLotSize: null,
            dailyProfitTarget: null,
            dailyLossLimit: null,
            psychologicalRules: [],
          },
          ultraDisciplinedMode: {
            enabled: false,
            blockOnRuleBreak: false,
            blockedUntil: null,
          },
          studyMode: {
            enabled: false,
            hideMoney: false,
            showOnlyRMultiples: false,
          },
          riskManagement: {
            maxRiskPerTrade: null,
            maxRiskDaily: null,
            maxRiskWeekly: null,
            maxDrawdown: null,
            drawdownMode: 'warning',
          },
          discipline: {
            cooldownAfterLoss: null,
            maxTradesConsecutiveLoss: null,
            forceSessionCloseOnCriticalRule: false,
            persistentWarnings: true,
          },
          ui: {
            strictRiskMode: false,
            attenuateMetricsOnDrawdown: true,
            showOnlySurvivalMetrics: false,
            enableAnimations: true,
            showGlobalRiskPanel: true,
          },
          insights: {
            autoInsightsEnabled: true,
            severityLevel: 'all',
            maxVisibleInsights: 5,
            updateFrequency: 'realtime',
            allowBlockInsights: true,
            blockedInsightIds: [],
          },
          ruleEngine: {
            enabled: true,
            rules: [],
          },
          sessions: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            allowedSessions: {
              asian: true,
              london: true,
              'new-york': true,
              overlap: true,
              other: true,
            },
            allowedDays: {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false,
            },
            blockTradingOutsideSession: false,
          },
        }}
        onChange={(advanced) => {
          // Guardar automáticamente cada cambio - usar el objeto completo
          updateSettings({ advanced });
        }}
      />

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            Guardar Todas las Configuraciones
          </Button>
        </div>
      )}
    </div>
  );
};

