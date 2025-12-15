import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useSettingsStore } from '@/store/settingsStore';
import { useTradeStore } from '@/store/tradeStore';
import { 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Wallet, 
  TrendingDown, 
  BarChart3,
  Shield,
  Activity,
  PlayCircle,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { 
  calculateGlobalRiskStatus, 
  calculateRealTimeRiskMetrics, 
  simulateTradeImpact,
  checkTradeCalculation 
} from '@/lib/riskControl';
import { evaluateTradeRules } from '@/lib/tradeRuleEvaluation';
import { Link } from 'react-router-dom';

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
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

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

  // Calculate global risk status
  const globalRiskStatus = useMemo(() => 
    calculateGlobalRiskStatus(trades, settings), 
    [trades, settings]
  );

  // Calculate real-time risk metrics
  const realTimeRisk = useMemo(() => 
    calculateRealTimeRiskMetrics(trades, settings), 
    [trades, settings]
  );

  // Get active rules
  const activeRules = useMemo(() => {
    const rules = settings.advanced?.tradingRules;
    const riskManagement = settings.advanced?.riskManagement;
    const active: Array<{ name: string; value: string | number | null; severity: 'info' | 'warning' | 'block' }> = [];

    if (rules?.maxTradesPerDay !== null) {
      active.push({ name: 'Máximo de Trades Diarios', value: rules.maxTradesPerDay, severity: 'info' });
    }
    if (rules?.maxTradesPerWeek !== null) {
      active.push({ name: 'Máximo de Trades Semanales', value: rules.maxTradesPerWeek, severity: 'info' });
    }
    if (riskManagement?.maxRiskPerTrade !== null) {
      active.push({ name: 'Riesgo Máximo por Trade', value: `${riskManagement.maxRiskPerTrade}%`, severity: 'warning' });
    }
    if (riskManagement?.maxRiskDaily !== null) {
      active.push({ name: 'Riesgo Máximo Diario', value: `${riskManagement.maxRiskDaily}%`, severity: 'warning' });
    }
    if (riskManagement?.maxDrawdown !== null) {
      active.push({ name: 'Drawdown Máximo', value: `${riskManagement.maxDrawdown}%`, severity: 'block' });
    }

    return active;
  }, [settings]);

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

    const calcResult = {
      positionSize: Math.round(positionSize * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100,
      riskPercentage: Math.round(riskPercentage * 100) / 100,
      maxLoss: Math.round(maxLoss * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    };

    setCalculation(calcResult);

    // Check if calculation violates rules
    const validation = checkTradeCalculation(
      {
        positionSize: calcResult.positionSize,
        riskAmount: calcResult.riskAmount,
        riskPercentage: calcResult.riskPercentage,
        entryPrice,
        stopLoss,
      },
      trades,
      settings
    );

    // If simulation mode, calculate impact
    if (simulationMode && entryPrice && stopLoss) {
      const impact = simulateTradeImpact(
        {
          entryPrice,
          stopLoss,
          takeProfit: takeProfit || undefined,
          positionSize: calcResult.positionSize,
          entryDate: new Date().toISOString(),
        },
        trades,
        settings
      );
      setSimulationResult(impact);
    } else {
      setSimulationResult(null);
    }
  };

  const handleSaveToSettings = () => {
    // Esto actualizaría los settings, pero por ahora solo mostramos
    alert('Los valores se usarán en el formulario de operaciones');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Centro de Control de Riesgo</h1>
        <p className="text-muted-foreground mt-1">
          Monitoreo en tiempo real, cálculo condicionado y simulación de impacto
        </p>
      </div>

      {/* 1️⃣ RIESGO GLOBAL - Bloque Superior Fijo */}
      <Card className={`border-2 ${
        globalRiskStatus.status === 'blocked' ? 'border-destructive' :
        globalRiskStatus.status === 'warning' ? 'border-yellow-500' :
        'border-green-500'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado de Riesgo Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Riesgo por Trade Permitido</div>
              <div className="text-2xl font-bold">
                {globalRiskStatus.riskPerTradeAllowed !== null 
                  ? `${globalRiskStatus.riskPerTradeAllowed}%`
                  : 'Sin límite'}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Riesgo Diario Permitido</div>
              <div className="text-2xl font-bold">
                {globalRiskStatus.riskDailyAllowed !== null 
                  ? `${globalRiskStatus.riskDailyAllowed}%`
                  : 'Sin límite'}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Drawdown Máximo</div>
              <div className="text-2xl font-bold">
                {globalRiskStatus.drawdownMaxAllowed !== null 
                  ? `${globalRiskStatus.drawdownMaxAllowed}%`
                  : 'Sin límite'}
              </div>
            </div>
            <div className={`p-4 border rounded-lg flex flex-col items-center justify-center ${
              globalRiskStatus.status === 'blocked' ? 'bg-destructive/10 border-destructive' :
              globalRiskStatus.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
              'bg-green-500/10 border-green-500'
            }`}>
              <div className="text-sm text-muted-foreground mb-2">Estado Actual</div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                globalRiskStatus.status === 'blocked' ? 'text-destructive' :
                globalRiskStatus.status === 'warning' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {globalRiskStatus.status === 'blocked' ? <XCircle className="h-6 w-6" /> :
                 globalRiskStatus.status === 'warning' ? <AlertTriangle className="h-6 w-6" /> :
                 <CheckCircle2 className="h-6 w-6" />}
                {globalRiskStatus.status === 'blocked' ? 'BLOQUEADO' :
                 globalRiskStatus.status === 'warning' ? 'ADVERTENCIA' :
                 'OK'}
              </div>
            </div>
          </div>
          {globalRiskStatus.reasons.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-semibold mb-2">Razones:</div>
              <ul className="space-y-1">
                {globalRiskStatus.reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2️⃣ RIESGO EN TIEMPO REAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado de Riesgo Actual
          </CardTitle>
          <CardDescription>
            Métricas actualizadas en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Riesgo Usado Hoy</div>
              <div className="text-2xl font-bold">
                {realTimeRisk.riskUsedToday.percent.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {realTimeRisk.riskUsedToday.amount.toLocaleString()} {settings.baseCurrency}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Riesgo Restante</div>
              <div className="text-2xl font-bold text-green-600">
                {realTimeRisk.riskRemaining.percent.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {realTimeRisk.riskRemaining.amount.toLocaleString()} {settings.baseCurrency}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Trades Restantes Hoy</div>
              <div className="text-2xl font-bold">
                {realTimeRisk.tradesRemainingToday !== null 
                  ? realTimeRisk.tradesRemainingToday
                  : 'Sin límite'}
              </div>
            </div>
          </div>
          
          {/* Barra visual de margen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Margen de Riesgo Diario</span>
              <span className="text-sm font-bold">
                {realTimeRisk.marginBar.used.toFixed(2)}% / {realTimeRisk.marginBar.limit}%
              </span>
            </div>
            <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  realTimeRisk.marginBar.used > realTimeRisk.marginBar.limit 
                    ? 'bg-destructive' 
                    : realTimeRisk.marginBar.used > realTimeRisk.marginBar.limit * 0.8
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((realTimeRisk.marginBar.used / realTimeRisk.marginBar.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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

            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="simulationMode"
                checked={simulationMode}
                onChange={(e) => setSimulationMode(e.target.checked)}
              />
              <Label htmlFor="simulationMode" className="text-sm">
                Modo Simulación (ver impacto antes de calcular)
              </Label>
            </div>

            <Button 
              onClick={calculatePosition} 
              className="w-full"
              disabled={globalRiskStatus.status === 'blocked'}
            >
              <Calculator className="h-4 w-4 mr-2" />
              {globalRiskStatus.status === 'blocked' 
                ? 'Trading Bloqueado - Revisa las Reglas'
                : 'Calcular Tamaño de Posición'}
            </Button>
            
            {globalRiskStatus.status === 'blocked' && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <div className="font-semibold mb-1">⚠️ Trading Bloqueado</div>
                <div className="text-xs">
                  {globalRiskStatus.reasons.join('. ')}
                </div>
              </div>
            )}
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

                {/* Validación de reglas */}
                {calculation && (() => {
                  const validation = checkTradeCalculation(
                    {
                      positionSize: calculation.positionSize,
                      riskAmount: calculation.riskAmount,
                      riskPercentage: calculation.riskPercentage,
                      entryPrice,
                      stopLoss,
                    },
                    trades,
                    settings
                  );

                  if (!validation.allowed) {
                    return (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="font-semibold text-destructive mb-2">⚠️ Violaciones de Reglas Detectadas</div>
                        <ul className="space-y-1 mb-3">
                          {validation.violations.map((v, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <XCircle className="h-4 w-4 mt-0.5 text-destructive" />
                              <span>{v.message}</span>
                            </li>
                          ))}
                        </ul>
                        {validation.suggestedSize && (
                          <div className="mt-3 p-2 bg-muted rounded text-sm">
                            <div className="font-semibold mb-1">💡 Tamaño Sugerido:</div>
                            <div className="text-lg font-bold">{validation.suggestedSize.toFixed(2)} unidades</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Este tamaño respeta tus límites de riesgo
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Modo Simulación */}
                {simulationMode && simulationResult && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="font-semibold mb-3 flex items-center gap-2">
                      <PlayCircle className="h-5 w-5" />
                      Impacto Simulado del Trade
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Impacto en Riesgo Diario</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{simulationResult.impactOnDailyRisk.before.toFixed(2)}%</span>
                          <span>→</span>
                          <span className={`text-sm font-bold ${
                            simulationResult.impactOnDailyRisk.after > (settings.advanced?.riskManagement?.maxRiskDaily ?? 100)
                              ? 'text-destructive'
                              : 'text-green-600'
                          }`}>
                            {simulationResult.impactOnDailyRisk.after.toFixed(2)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (+{simulationResult.impactOnDailyRisk.change.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      {simulationResult.rulesThatWouldActivate.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">Reglas que se Activarían</div>
                          <ul className="space-y-1">
                            {simulationResult.rulesThatWouldActivate.map((rule: any, idx: number) => (
                              <li key={idx} className="text-xs flex items-start gap-2">
                                <AlertTriangle className={`h-3 w-3 mt-0.5 ${
                                  rule.severity === 'critical' ? 'text-destructive' : 'text-yellow-600'
                                }`} />
                                <span>{rule.message}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className={`p-2 rounded ${
                        simulationResult.finalStatus === 'blocked' ? 'bg-destructive/10 border border-destructive/20' :
                        simulationResult.finalStatus === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                        'bg-green-500/10 border border-green-500/20'
                      }`}>
                        <div className="text-sm font-semibold">
                          Estado Final: {
                            simulationResult.finalStatus === 'blocked' ? '🔴 BLOQUEADO' :
                            simulationResult.finalStatus === 'warning' ? '🟡 ADVERTENCIA' :
                            '🟢 PERMITIDO'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

      {/* 6️⃣ REGLAS ACTIVAS VISIBLES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Reglas de Riesgo en Curso
          </CardTitle>
          <CardDescription>
            Configuraciones activas que gobiernan tu trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRules.map((rule, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{rule.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      rule.severity === 'block' ? 'bg-destructive/10 text-destructive' :
                      rule.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-blue-500/10 text-blue-600'
                    }`}>
                      {rule.severity === 'block' ? 'Bloqueo' :
                       rule.severity === 'warning' ? 'Advertencia' :
                       'Info'}
                    </span>
                  </div>
                  <div className="text-lg font-bold">{rule.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay reglas de riesgo configuradas</p>
              <Link to="/settings" className="text-sm text-primary hover:underline mt-2 inline-block">
                Configurar reglas →
              </Link>
            </div>
          )}
          <div className="mt-4 pt-4 border-t">
            <Link to="/settings">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Ir a Configuración Avanzada
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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
              Límites configurados, exposición actual y simulada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <Label>Límite por Activo (%)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{maxExposurePerAsset}%</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={maxExposurePerAsset}
                    onChange={(e) => setMaxExposurePerAsset(parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Límite Total (%)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{maxTotalExposure}%</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={maxTotalExposure}
                    onChange={(e) => setMaxTotalExposure(parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            {capitalData.exposureByAsset.length > 0 ? (
              <div className="space-y-3">
                {capitalData.exposureByAsset.map((assetData) => {
                  // Calculate simulated exposure if calculation exists and matches asset
                  const simulatedExposure = calculation && entryPrice && stopLoss
                    ? (() => {
                        const priceDiff = Math.abs(entryPrice - stopLoss);
                        const riskAmount = priceDiff * calculation.positionSize;
                        const simulatedPercent = capitalData.baseCapital > 0 
                          ? ((assetData.totalRisk + riskAmount) / capitalData.baseCapital) * 100
                          : assetData.exposure;
                        return simulatedPercent;
                      })()
                    : null;

                  return (
                    <div key={assetData.asset} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{assetData.asset}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            assetData.exposure > maxExposurePerAsset 
                              ? 'text-destructive' 
                              : assetData.exposure > maxExposurePerAsset * 0.8
                              ? 'text-yellow-600'
                              : 'text-profit'
                          }`}>
                            {assetData.exposure.toFixed(2)}%
                          </span>
                          {simulatedExposure !== null && (
                            <span className="text-xs text-muted-foreground">
                              → {simulatedExposure.toFixed(2)}% (simulado)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-1 relative">
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
                        {simulatedExposure !== null && simulatedExposure > assetData.exposure && (
                          <div
                            className="h-full bg-blue-500/50 absolute top-0 transition-all"
                            style={{ 
                              left: `${(assetData.exposure / maxExposurePerAsset) * 100}%`,
                              width: `${Math.min(((simulatedExposure - assetData.exposure) / maxExposurePerAsset) * 100, 100)}%`
                            }}
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{assetData.trades.length} operación(es) abierta(s)</span>
                        <span>{assetData.totalRisk.toLocaleString()} {settings.baseCurrency}</span>
                      </div>
                      {assetData.exposure > maxExposurePerAsset && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                          ⚠️ Concentración excesiva: {assetData.exposure.toFixed(2)}% excede {maxExposurePerAsset}%
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* 7️⃣ HISTORIAL DE CONTROL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Control
          </CardTitle>
          <CardDescription>
            Registro de trades bloqueados, pausas forzadas y reglas activadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Trades bloqueados hoy */}
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayTrades = trades.filter(t => {
                const tradeDate = new Date(t.entryDate);
                tradeDate.setHours(0, 0, 0, 0);
                return tradeDate.getTime() === today.getTime();
              });
              
              const blockedTrades = todayTrades.filter(t => 
                t.violatedRules && t.violatedRules.length > 0 && 
                t.violatedRules.some(r => r.severity === 'critical')
              );

              if (blockedTrades.length > 0) {
                return (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="font-semibold text-destructive mb-2">
                      Trades Bloqueados Hoy: {blockedTrades.length}
                    </div>
                    <ul className="space-y-1 text-sm">
                      {blockedTrades.map(trade => (
                        <li key={trade.id} className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 mt-0.5 text-destructive" />
                          <div>
                            <div className="font-medium">{trade.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {trade.violatedRules?.map(r => r.message).join(', ')}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}

            {/* Estado de bloqueo */}
            {globalRiskStatus.status === 'blocked' && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="font-semibold text-destructive mb-1">Pausa Forzada Activa</div>
                <div className="text-sm text-muted-foreground">
                  {settings.advanced?.ultraDisciplinedMode?.blockedUntil 
                    ? `Bloqueado hasta: ${new Date(settings.advanced.ultraDisciplinedMode.blockedUntil).toLocaleString('es-ES')}`
                    : 'Trading bloqueado por violación de reglas críticas'}
                </div>
              </div>
            )}

            {/* Reglas activadas hoy */}
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayTrades = trades.filter(t => {
                const tradeDate = new Date(t.entryDate);
                tradeDate.setHours(0, 0, 0, 0);
                return tradeDate.getTime() === today.getTime();
              });
              
              const allViolations = todayTrades
                .flatMap(t => t.violatedRules || [])
                .filter((v, idx, arr) => arr.findIndex(a => a.id === v.id) === idx);

              if (allViolations.length > 0) {
                return (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="font-semibold text-yellow-600 mb-2">
                      Reglas Activadas Hoy: {allViolations.length}
                    </div>
                    <ul className="space-y-1 text-sm">
                      {allViolations.map(violation => (
                        <li key={violation.id} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
                          <div>
                            <div className="font-medium">{violation.ruleName}</div>
                            <div className="text-xs text-muted-foreground">{violation.message}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}

            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayTrades = trades.filter(t => {
                const tradeDate = new Date(t.entryDate);
                tradeDate.setHours(0, 0, 0, 0);
                return tradeDate.getTime() === today.getTime();
              });
              
              const hasBlocked = todayTrades.some(t => 
                t.violatedRules && t.violatedRules.length > 0 && 
                t.violatedRules.some(r => r.severity === 'critical')
              );
              const isBlocked = globalRiskStatus.status === 'blocked';
              const hasViolations = todayTrades.some(t => t.violatedRules && t.violatedRules.length > 0);

              if (!hasBlocked && !isBlocked && !hasViolations) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-600" />
                    <p className="text-sm">Sin eventos de control registrados hoy</p>
                    <p className="text-xs mt-1">Todas las operaciones cumplen con las reglas</p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </CardContent>
      </Card>

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

