import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Palette, Eye, RotateCcw } from 'lucide-react';
import type { ThemeName, ThemeConfig } from '@/types/Trading';
import { predefinedThemes, applyTheme } from '@/lib/themes';

interface ThemeEditorProps {
  currentTheme: ThemeName;
  customTheme: ThemeConfig | null;
  onThemeChange: (theme: ThemeName, customTheme: ThemeConfig | null) => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  currentTheme,
  customTheme,
  onThemeChange,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(currentTheme);
  const [editingCustom, setEditingCustom] = useState<ThemeConfig>(
    customTheme || predefinedThemes.custom
  );

  useEffect(() => {
    if (selectedTheme !== 'custom') {
      // Aplicar tema predefinido inmediatamente
      applyTheme(selectedTheme, null);
      onThemeChange(selectedTheme, null);
    }
  }, [selectedTheme]);

  useEffect(() => {
    if (selectedTheme === 'custom') {
      // Aplicar tema personalizado
      applyTheme('custom', editingCustom);
      onThemeChange('custom', editingCustom);
    }
  }, [editingCustom, selectedTheme]);

  const handleThemeSelect = (theme: ThemeName) => {
    setSelectedTheme(theme);
    if (theme !== 'custom') {
      applyTheme(theme, null);
      onThemeChange(theme, null);
    }
  };

  const handleCustomColorChange = (field: keyof ThemeConfig, value: string) => {
    const updated = { ...editingCustom, [field]: value };
    setEditingCustom(updated);
    if (selectedTheme === 'custom') {
      applyTheme('custom', updated);
      onThemeChange('custom', updated);
    }
  };

  const resetToDefault = () => {
    const defaultCustom = predefinedThemes.custom;
    setEditingCustom(defaultCustom);
    if (selectedTheme === 'custom') {
      applyTheme('custom', defaultCustom);
      onThemeChange('custom', defaultCustom);
    }
  };

  const themeOptions: { value: ThemeName; label: string; description: string }[] = [
    { value: 'light', label: 'Claro', description: 'Tema claro estándar' },
    { value: 'dark', label: 'Oscuro', description: 'Tema oscuro estándar' },
    { value: 'high-contrast', label: 'Alto Contraste', description: 'Máxima legibilidad' },
    { value: 'trading-terminal', label: 'Terminal de Trading', description: 'Estilo terminal clásico' },
    { value: 'custom', label: 'Personalizado', description: 'Crea tu propio tema' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="themeSelect">Tema Predefinido</Label>
        <Select
          id="themeSelect"
          value={selectedTheme}
          onChange={(e) => handleThemeSelect(e.target.value as ThemeName)}
        >
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </Select>
      </div>

      {selectedTheme === 'custom' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Editor de Tema Personalizado
                </CardTitle>
                <CardDescription>
                  Personaliza todos los colores de la aplicación
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customPrimary">Color Primario (HSL)</Label>
                <Input
                  id="customPrimary"
                  value={editingCustom.primary}
                  onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                  placeholder="221.2 83.2% 53.3%"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: H S% L% (ej: 221.2 83.2% 53.3%)
                </p>
              </div>

              <div>
                <Label htmlFor="customSecondary">Color Secundario (HSL)</Label>
                <Input
                  id="customSecondary"
                  value={editingCustom.secondary}
                  onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                  placeholder="210 40% 96.1%"
                />
              </div>

              <div>
                <Label htmlFor="customBackground">Fondo (HSL)</Label>
                <Input
                  id="customBackground"
                  value={editingCustom.background}
                  onChange={(e) => handleCustomColorChange('background', e.target.value)}
                  placeholder="0 0% 100%"
                />
              </div>

              <div>
                <Label htmlFor="customForeground">Texto Principal (HSL)</Label>
                <Input
                  id="customForeground"
                  value={editingCustom.foreground}
                  onChange={(e) => handleCustomColorChange('foreground', e.target.value)}
                  placeholder="222.2 84% 4.9%"
                />
              </div>

              <div>
                <Label htmlFor="customMuted">Muted (HSL)</Label>
                <Input
                  id="customMuted"
                  value={editingCustom.muted}
                  onChange={(e) => handleCustomColorChange('muted', e.target.value)}
                  placeholder="210 40% 96.1%"
                />
              </div>

              <div>
                <Label htmlFor="customAccent">Acento (HSL)</Label>
                <Input
                  id="customAccent"
                  value={editingCustom.accent}
                  onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                  placeholder="210 40% 96.1%"
                />
              </div>

              <div>
                <Label htmlFor="customDestructive">Destructivo (HSL)</Label>
                <Input
                  id="customDestructive"
                  value={editingCustom.destructive}
                  onChange={(e) => handleCustomColorChange('destructive', e.target.value)}
                  placeholder="0 84.2% 60.2%"
                />
              </div>

              <div>
                <Label htmlFor="customBorder">Borde (HSL)</Label>
                <Input
                  id="customBorder"
                  value={editingCustom.border}
                  onChange={(e) => handleCustomColorChange('border', e.target.value)}
                  placeholder="214.3 31.8% 91.4%"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Colores de Trading</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customProfit">Color de Ganancia (HSL)</Label>
                  <Input
                    id="customProfit"
                    value={editingCustom.profitColor}
                    onChange={(e) => handleCustomColorChange('profitColor', e.target.value)}
                    placeholder="142 76% 36%"
                  />
                  <div
                    className="mt-2 h-8 rounded border"
                    style={{ backgroundColor: `hsl(${editingCustom.profitColor})` }}
                  />
                </div>

                <div>
                  <Label htmlFor="customLoss">Color de Pérdida (HSL)</Label>
                  <Input
                    id="customLoss"
                    value={editingCustom.lossColor}
                    onChange={(e) => handleCustomColorChange('lossColor', e.target.value)}
                    placeholder="0 84.2% 60.2%"
                  />
                  <div
                    className="mt-2 h-8 rounded border"
                    style={{ backgroundColor: `hsl(${editingCustom.lossColor})` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista Previa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista Previa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg bg-card">
              <h4 className="font-semibold mb-2">Ejemplo de Card</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Este es un ejemplo de cómo se verá el tema aplicado
              </p>
              <div className="flex gap-2">
                <Button size="sm">Botón Primario</Button>
                <Button variant="outline" size="sm">Botón Secundario</Button>
                <Button variant="destructive" size="sm">Destructivo</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 border rounded-lg bg-profit border-profit">
                <p className="text-sm font-medium text-profit">
                  Ganancia: +$1,234.56
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-loss border-loss">
                <p className="text-sm font-medium text-loss">
                  Pérdida: -$567.89
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

