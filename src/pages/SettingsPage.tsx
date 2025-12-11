import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ThemeEditor } from '@/components/settings/ThemeEditor';
import { AdvancedSettingsComponent } from '@/components/settings/AdvancedSettings';
import { useSettingsStore } from '@/store/settingsStore';
import type { ThemeName, ThemeConfig, AdvancedSettings } from '@/types/Trading';

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
    updateSettings({ theme, customTheme });
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

      {/* Configuración Avanzada */}
      <AdvancedSettingsComponent
        advanced={formData.advanced || {
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
        }}
        onChange={(advanced) => {
          handleChange('advanced', advanced);
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

