import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useSettingsStore } from '@/store/settingsStore';
import { useTradeStore } from '@/store/tradeStore';
import { Calculator, TrendingUp, AlertTriangle, DollarSign, Wallet, TrendingDown, BarChart3 } from 'lucide-react';

type CalculationMethod = 'fixed' | 'percentage' | 'kelly' | 'risk-reward';

interface PositionCalculation {
  positionSize: number;
  riskAmount: number;
  riskPercentage: number;
  maxLoss: number;
  potentialProfit: number;
  riskRewardRatio: number;
}

export const CapitalManagementPage = () => {
  const { settings, loadSettings, updateSettings } = useSettingsStore();
  const { trades, loadTrades } = useTradeStore();
  const [method, setMethod] = useState<CalculationMethod>('risk-reward');
  
  // Capital editable
  const [currentCapital, setCurrentCapital] = useState(settings.currentCapital || settings.accountSize);
  const [initialCapital, setInitialCapital] = useState(settings.initialCapital || settings.accountSize);
  const [useManualCapital, setUseManualCapital] = useState(settings.manualCapitalAdjustment || false);
  
  // Configuración de límites
  const [maxExposurePerAsset, setMaxExposurePerAsset] = useState<number>(20); // % máximo por activo
  const [maxTotalExposure, setMaxTotalExposure] = useState<number>(50); // % máximo total
  const [accountSize, setAccountSize] = useState(settings.accountSize);
  const [riskPerTrade, setRiskPerTrade] = useState(settings.riskPerTrade);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [positionType, setPositionType] = useState<'long' | 'short'>('long');
  const [fixedRiskAmount, setFixedRiskAmount] = useState<number>(0);
  const [kellyPercentage, setKellyPercentage] = useState<number>(50); // Win rate para Kelly
  const [kellyAvgWin, setKellyAvgWin] = useState<number>(0);
  const [kellyAvgLoss, setKellyAvgLoss] = useState<number>(0);

  const [calculation, setCalculation] = useState<PositionCalculation | null>(null);

  useEffect(() => {
    loadSettings();
    loadTrades();
  }, [loadSettings, loadTrades]);

  useEffect(() => {
    setAccountSize(settings.accountSize);
    setRiskPerTrade(settings.riskPerTrade);
    setCurrentCapital(settings.currentCapital || settings.accountSize);
    setInitialCapital(settings.initialCapital || settings.accountSize);
    setUseManualCapital(settings.manualCapitalAdjustment || false);
  }, [settings]);

  const handleSaveCapital = () => {
    updateSettings({
      currentCapital,
      initialCapital,
      manualCapitalAdjustment: useManualCapital,
      accountSize: useManualCapital ? currentCapital : settings.accountSize,
    });
  };

  // Calcular exposición de capital
  const calculateCapitalExposure = () => {
    const openTrades = trades.filter(t => t.status === 'open');
    const baseCapital = useManualCapital ? currentCapital : accountSize;
    
    // Calcular capital en riesgo por operación
    const capitalAtRisk = openTrades.map(trade => {
      const priceDifference = Math.abs(trade.entryPrice - (trade.stopLoss || trade.entryPrice));
      const riskAmount = priceDifference * trade.positionSize * (trade.leverage || 1);
      return {
        trade,
        riskAmount,
        exposure: (riskAmount / baseCapital) * 100,
      };
    });

    // Capital total en riesgo
    const totalCapitalAtRisk = capitalAtRisk.reduce((sum, item) => sum + item.riskAmount, 0);
    const totalExposurePercentage = (totalCapitalAtRisk / baseCapital) * 100;
    const availableCapital = baseCapital - totalCapitalAtRisk;

    // Exposición por activo
    const exposureByAsset = capitalAtRisk.reduce((acc, item) => {
      const asset = item.trade.asset;
      if (!acc[asset]) {
        acc[asset] = { asset, totalRisk: 0, trades: [], exposure: 0 };
      }
      acc[asset].totalRisk += item.riskAmount;
      acc[asset].trades.push(item.trade);
      acc[asset].exposure = (acc[asset].totalRisk / accountSize) * 100;
      return acc;
    }, {} as Record<string, { asset: string; totalRisk: number; trades: any[]; exposure: number }>);

    // Alertas
    const alerts: string[] = [];
    
    // Alerta de exposición total
    if (totalExposurePercentage > maxTotalExposure) {
      alerts.push(`⚠️ Exposición total (${totalExposurePercentage.toFixed(2)}%) excede el límite (${maxTotalExposure}%)`);
    }

    // Alerta de exposición por activo
    Object.values(exposureByAsset).forEach((assetData) => {
      if (assetData.exposure > maxExposurePerAsset) {
        alerts.push(`⚠️ ${assetData.asset}: Exposición (${assetData.exposure.toFixed(2)}%) excede el límite (${maxExposurePerAsset}%)`);
      }
    });

    return {
      totalCapitalAtRisk,
      totalExposurePercentage,
      availableCapital,
      exposureByAsset: Object.values(exposureByAsset),
      alerts,
      baseCapital,
    };
  };

  const capitalData = calculateCapitalExposure();

  const calculatePosition = () => {
    if (!entryPrice || !stopLoss || accountSize <= 0) {
      return;
    }

    let positionSize = 0;
    let riskAmount = 0;
    let riskPercentage = 0;

    const priceDifference = Math.abs(entryPrice - stopLoss);

    if (priceDifference === 0) {
      return;
    }

    switch (method) {
      case 'fixed':
        if (fixedRiskAmount <= 0) return;
        riskAmount = fixedRiskAmount;
        positionSize = riskAmount / priceDifference;
        riskPercentage = (riskAmount / accountSize) * 100;
        break;

      case 'percentage':
        riskAmount = (accountSize * riskPerTrade) / 100;
        positionSize = riskAmount / priceDifference;
        riskPercentage = riskPerTrade;
        break;

      case 'kelly':
        if (kellyPercentage <= 0 || kellyAvgWin <= 0 || kellyAvgLoss <= 0) return;
        const winRate = kellyPercentage / 100;
        const avgWin = kellyAvgWin;
        const avgLoss = kellyAvgLoss;
        const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        const kellyPercent = Math.max(0, Math.min(kellyFraction, 0.25)) * 100; // Limitar a 25%
        riskAmount = (accountSize * kellyPercent) / 100;
        positionSize = riskAmount / priceDifference;
        riskPercentage = kellyPercent;
        break;

      case 'risk-reward':
      default:
        riskAmount = (accountSize * riskPerTrade) / 100;
        positionSize = riskAmount / priceDifference;
        riskPercentage = riskPerTrade;
        break;
    }

    const maxLoss = riskAmount;
    let potentialProfit = 0;
    let riskRewardRatio = 0;

    if (takeProfit && takeProfit > 0) {
      const profitDifference = Math.abs(takeProfit - entryPrice);
      potentialProfit = positionSize * profitDifference;
      const lossDifference = Math.abs(entryPrice - stopLoss);
      riskRewardRatio = profitDifference / lossDifference;
    }

    setCalculation({
      positionSize: Math.round(positionSize * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100,
      riskPercentage: Math.round(riskPercentage * 100) / 100,
      maxLoss: Math.round(maxLoss * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    });
  };

  const handleSaveToSettings = () => {
    // Esto actualizaría los settings, pero por ahora solo mostramos
    alert('Los valores se usarán en el formulario de operaciones');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Capital y Riesgo</h1>
        <p className="text-muted-foreground mt-1">
          Calcula el tamaño óptimo de posición basado en tu gestión de riesgo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Entrada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora de Posición
            </CardTitle>
            <CardDescription>
              Ingresa los datos de tu operación para calcular el tamaño óptimo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accountSize">Tamaño de Cuenta</Label>
              <Input
                id="accountSize"
                type="number"
                step="0.01"
                value={accountSize}
                onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Desde Configuración: {settings.baseCurrency}
              </p>
            </div>

            <div>
              <Label htmlFor="method">Método de Cálculo</Label>
              <Select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as CalculationMethod)}
              >
                <option value="risk-reward">Riesgo/Beneficio (Recomendado)</option>
                <option value="percentage">Porcentaje de Cuenta</option>
                <option value="fixed">Riesgo Fijo</option>
                <option value="kelly">Kelly Criterion</option>
              </Select>
            </div>

            {method === 'percentage' && (
              <div>
                <Label htmlFor="riskPerTrade">Riesgo por Operación (%)</Label>
                <Input
                  id="riskPerTrade"
                  type="number"
                  step="0.1"
                  value={riskPerTrade}
                  onChange={(e) => setRiskPerTrade(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Desde Configuración: {settings.riskPerTrade}%
                </p>
              </div>
            )}

            {method === 'fixed' && (
              <div>
                <Label htmlFor="fixedRiskAmount">Riesgo Fijo</Label>
                <Input
                  id="fixedRiskAmount"
                  type="number"
                  step="0.01"
                  value={fixedRiskAmount}
                  onChange={(e) => setFixedRiskAmount(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cantidad fija a arriesgar por operación
                </p>
              </div>
            )}

            {method === 'kelly' && (
              <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                <p className="text-sm font-medium">Parámetros Kelly Criterion</p>
                <div>
                  <Label htmlFor="kellyPercentage">Tasa de Éxito (%)</Label>
                  <Input
                    id="kellyPercentage"
                    type="number"
                    step="0.1"
                    value={kellyPercentage}
                    onChange={(e) => setKellyPercentage(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="kellyAvgWin">Ganancia Promedio</Label>
                  <Input
                    id="kellyAvgWin"
                    type="number"
                    step="0.01"
                    value={kellyAvgWin}
                    onChange={(e) => setKellyAvgWin(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="kellyAvgLoss">Pérdida Promedio</Label>
                  <Input
                    id="kellyAvgLoss"
                    type="number"
                    step="0.01"
                    value={kellyAvgLoss}
                    onChange={(e) => setKellyAvgLoss(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Kelly Criterion calcula el tamaño óptimo basado en tu win rate y expectativa
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="positionType">Tipo de Posición</Label>
              <Select
                id="positionType"
                value={positionType}
                onChange={(e) => setPositionType(e.target.value as 'long' | 'short')}
              >
                <option value="long">Largo</option>
                <option value="short">Corto</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="entryPrice">Precio de Entrada *</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.0001"
                value={entryPrice || ''}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <Label htmlFor="stopLoss">Stop Loss *</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.0001"
                value={stopLoss || ''}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <Label htmlFor="takeProfit">Take Profit (Opcional)</Label>
              <Input
                id="takeProfit"
                type="number"
                step="0.0001"
                value={takeProfit || ''}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si ingresas take profit, se calculará el ratio R/R
              </p>
            </div>

            <Button onClick={calculatePosition} className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular Tamaño de Posición
            </Button>
          </CardContent>
        </Card>

        {/* Panel de Resultados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resultados del Cálculo
            </CardTitle>
            <CardDescription>
              Tamaño de posición y análisis de riesgo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calculation ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tamaño de Posición</span>
                    <span className="text-2xl font-bold text-primary">
                      {calculation.positionSize.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unidades a operar
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Riesgo</span>
                    </div>
                    <p className="text-xl font-bold">
                      {calculation.riskAmount.toLocaleString()} {settings.baseCurrency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculation.riskPercentage.toFixed(2)}% de cuenta
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Pérdida Máxima</span>
                    </div>
                    <p className="text-xl font-bold text-destructive">
                      {calculation.maxLoss.toLocaleString()} {settings.baseCurrency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Si se activa el stop loss
                    </p>
                  </div>
                </div>

                {calculation.potentialProfit > 0 && (
                  <div className="p-3 border rounded-lg bg-profit border-profit">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-profit">
                        Ganancia Potencial
                      </span>
                      <span className="text-xl font-bold text-profit">
                        {calculation.potentialProfit.toLocaleString()} {settings.baseCurrency}
                      </span>
                    </div>
                    {calculation.riskRewardRatio > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Ratio R/R: {calculation.riskRewardRatio.toFixed(2)}:1
                      </p>
                    )}
                  </div>
                )}

                {calculation.riskRewardRatio > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ratio Riesgo/Beneficio</span>
                      <span className={`text-lg font-bold ${
                        calculation.riskRewardRatio >= 2 ? 'text-profit' :
                        calculation.riskRewardRatio >= 1 ? 'text-yellow-600' :
                        'text-loss'
                      }`}>
                        {calculation.riskRewardRatio.toFixed(2)}:1
                      </span>
                    </div>
                    {calculation.riskRewardRatio < 1 && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ El riesgo es mayor que el beneficio potencial
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Resumen</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Cuenta: {capitalData.baseCapital.toLocaleString()} {settings.baseCurrency}</li>
                    <li>• Método: {
                      method === 'risk-reward' ? 'Riesgo/Beneficio' :
                      method === 'percentage' ? 'Porcentaje' :
                      method === 'fixed' ? 'Riesgo Fijo' :
                      'Kelly Criterion'
                    }</li>
                    <li>• Riesgo: {calculation.riskPercentage.toFixed(2)}% ({calculation.riskAmount.toLocaleString()} {settings.baseCurrency})</li>
                    <li>• Precio Entrada: {entryPrice}</li>
                    <li>• Stop Loss: {stopLoss}</li>
                    {takeProfit > 0 && <li>• Take Profit: {takeProfit}</li>}
                  </ul>
                </div>

                <Button variant="outline" className="w-full" onClick={handleSaveToSettings}>
                  Usar en Nueva Operación
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ingresa los datos y haz clic en "Calcular"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gestión de Capital */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Estado del Capital
            </CardTitle>
            <CardDescription>
              Seguimiento de capital total, disponible y en uso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Modo de capital */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="useManualCapital" className="font-medium">
                  Usar Capital Manual
                </Label>
                <p className="text-xs text-muted-foreground">
                  Activa para editar manualmente tu capital actual
                </p>
              </div>
              <input
                id="useManualCapital"
                type="checkbox"
                checked={useManualCapital}
                onChange={(e) => setUseManualCapital(e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {/* Capital Inicial */}
            <div>
              <Label htmlFor="initialCapital">Capital Inicial</Label>
              <Input
                id="initialCapital"
                type="number"
                step="0.01"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                disabled={!useManualCapital}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Capital con el que comenzaste (solo referencia)
              </p>
            </div>

            {/* Capital Actual */}
            <div>
              <Label htmlFor="currentCapital">Capital Actual *</Label>
              <Input
                id="currentCapital"
                type="number"
                step="0.01"
                value={currentCapital}
                onChange={(e) => setCurrentCapital(parseFloat(e.target.value) || 0)}
                disabled={!useManualCapital}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {useManualCapital 
                  ? 'Tu capital actual real (editable)' 
                  : 'Desde Configuración: ' + settings.accountSize.toLocaleString() + ' ' + settings.baseCurrency}
              </p>
            </div>

            {useManualCapital && (
              <Button onClick={handleSaveCapital} className="w-full" variant="outline">
                Guardar Cambios de Capital
              </Button>
            )}

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Capital Total</span>
                <span className="text-2xl font-bold text-primary">
                  {capitalData.baseCapital.toLocaleString()} {settings.baseCurrency}
                </span>
              </div>
              {useManualCapital && initialCapital !== currentCapital && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Capital Inicial:</span>
                    <span className={currentCapital >= initialCapital ? 'text-profit' : 'text-loss'}>
                      {initialCapital.toLocaleString()} {settings.baseCurrency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Cambio:</span>
                    <span className={currentCapital >= initialCapital ? 'text-profit' : 'text-loss'}>
                      {currentCapital >= initialCapital ? '+' : ''}
                      {(currentCapital - initialCapital).toLocaleString()} {settings.baseCurrency}
                      ({((currentCapital - initialCapital) / initialCapital * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg bg-profit border-profit">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-profit" />
                  <span className="text-sm font-medium text-profit">
                    Capital Disponible
                  </span>
                </div>
                <p className="text-xl font-bold text-profit">
                  {capitalData.availableCapital.toLocaleString()} {settings.baseCurrency}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((capitalData.availableCapital / capitalData.baseCapital) * 100).toFixed(2)}% disponible
                </p>
              </div>

              <div className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                    Capital en Riesgo
                  </span>
                </div>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                  {capitalData.totalCapitalAtRisk.toLocaleString()} {settings.baseCurrency}
                </p>
                <p className="text-xs text-muted-foreground">
                  {capitalData.totalExposurePercentage.toFixed(2)}% en uso
                </p>
              </div>
            </div>

            {/* Barra de progreso de exposición */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Exposición Total</span>
                <span className={`text-sm font-bold ${
                  capitalData.totalExposurePercentage > maxTotalExposure 
                    ? 'text-destructive' 
                    : capitalData.totalExposurePercentage > maxTotalExposure * 0.8
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  {capitalData.totalExposurePercentage.toFixed(2)}% / {maxTotalExposure}%
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    capitalData.totalExposurePercentage > maxTotalExposure 
                      ? 'bg-destructive' 
                      : capitalData.totalExposurePercentage > maxTotalExposure * 0.8
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min((capitalData.totalExposurePercentage / maxTotalExposure) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Exposición por Activo
            </CardTitle>
            <CardDescription>
              Límites de exposición y distribución por instrumento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Límite por Activo (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={maxExposurePerAsset}
                  onChange={(e) => setMaxExposurePerAsset(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Límite Total (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={maxTotalExposure}
                  onChange={(e) => setMaxTotalExposure(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>

            {capitalData.exposureByAsset.length > 0 ? (
              <div className="space-y-3">
                {capitalData.exposureByAsset.map((assetData) => (
                  <div key={assetData.asset} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{assetData.asset}</span>
                      <span className={`text-sm font-bold ${
                        assetData.exposure > maxExposurePerAsset 
                          ? 'text-destructive' 
                          : assetData.exposure > maxExposurePerAsset * 0.8
                          ? 'text-yellow-600'
                          : 'text-profit'
                      }`}>
                        {assetData.exposure.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full transition-all ${
                          assetData.exposure > maxExposurePerAsset 
                            ? 'bg-destructive' 
                            : assetData.exposure > maxExposurePerAsset * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min((assetData.exposure / maxExposurePerAsset) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{assetData.trades.length} operación(es) abierta(s)</span>
                      <span>{assetData.totalRisk.toLocaleString()} {settings.baseCurrency}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay operaciones abiertas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Sobre-Exposición */}
      {capitalData.alerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Sobre-Exposición
            </CardTitle>
            <CardDescription>
              Revisa estos límites antes de abrir nuevas operaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {capitalData.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm"
                >
                  {alert}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información Educativa */}
      <Card>
        <CardHeader>
          <CardTitle>Guía de Métodos de Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Riesgo/Beneficio (Recomendado)</h4>
            <p className="text-sm text-muted-foreground">
              Calcula el tamaño basado en un porcentaje fijo de tu cuenta. Es el método más simple y efectivo para la mayoría de traders.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Porcentaje de Cuenta</h4>
            <p className="text-sm text-muted-foreground">
              Similar al método anterior, pero puedes ajustar el porcentaje manualmente para esta operación específica.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Riesgo Fijo</h4>
            <p className="text-sm text-muted-foreground">
              Arriesgas una cantidad fija en cada operación, independientemente del tamaño de tu cuenta. Útil para mantener consistencia.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">4. Kelly Criterion</h4>
            <p className="text-sm text-muted-foreground">
              Calcula el tamaño óptimo basado en tu win rate histórico y expectativa. Más agresivo, requiere datos históricos precisos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

