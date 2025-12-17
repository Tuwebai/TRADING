import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { TradingViewWidget } from '@/components/trading/TradingViewWidget';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/store/settingsStore';
import { useTradeStore } from '@/store/tradeStore';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Calculator,
  Send,
  Plus,
  Target,
  Activity,
  Shield
} from 'lucide-react';
import { calculateAssetStatistics, getAssetInsights, getCurrentSession } from '@/lib/assetStats';
import { calculateGlobalRiskStatus } from '@/lib/riskControl';
import { checkTradingRules, isBlocked } from '@/lib/tradingRules';
import { calculateTradingStatus } from '@/lib/tradingStatus';
import { useNavigate } from 'react-router-dom';
import type { Trade } from '@/types/Trading';

export const GraficoPage = () => {
  const { settings, loadSettings } = useSettingsStore();
  const { trades, loadTrades } = useTradeStore();
  const navigate = useNavigate();
  
  const [symbol, setSymbol] = useState('EURUSD');
  const [interval, setInterval] = useState('D');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    loadSettings();
    loadTrades();
  }, [loadSettings, loadTrades]);

  // Extract asset name from symbol (handle formats like "NASDAQ:AAPL" -> "AAPL")
  const currentAsset = useMemo(() => {
    if (symbol.includes(':')) {
      return symbol.split(':')[1];
    }
    return symbol;
  }, [symbol]);

  // Get trades for current asset
  const assetTrades = useMemo(() => 
    trades.filter(t => t.asset === currentAsset),
    [trades, currentAsset]
  );

  // Calculate asset statistics
  const assetStats = useMemo(() => 
    calculateAssetStatistics(
      trades, 
      currentAsset, 
      settings.initialCapital || settings.accountSize
    ),
    [trades, currentAsset, settings]
  );

  // Get asset insights
  const assetInsights = useMemo(() => 
    getAssetInsights(trades, currentAsset, settings),
    [trades, currentAsset, settings]
  );

  // Get current session
  const currentSession = getCurrentSession();
  const sessionNames: Record<string, string> = {
    'asian': 'Asiática',
    'london': 'Londres',
    'new-york': 'Nueva York',
    'overlap': 'Overlap',
    'other': 'Otra',
  };

  // Calculate global risk status
  const globalRiskStatus = useMemo(() => 
    calculateGlobalRiskStatus(trades, settings),
    [trades, settings]
  );

  // Calculate trading status
  const tradingStatus = useMemo(() => 
    calculateTradingStatus(trades, settings),
    [trades, settings]
  );

  // Check if blocked
  const blocked = isBlocked(settings);

  // Check if can trade (no critical violations)
  const canTrade = !blocked && globalRiskStatus.status !== 'blocked' && tradingStatus.status === 'operable';

  // Símbolos comunes de trading
  const commonSymbols = [
    { value: 'EURUSD', label: 'EUR/USD' },
    { value: 'GBPUSD', label: 'GBP/USD' },
    { value: 'USDJPY', label: 'USD/JPY' },
    { value: 'AUDUSD', label: 'AUD/USD' },
    { value: 'USDCAD', label: 'USD/CAD' },
    { value: 'USDCHF', label: 'USD/CHF' },
    { value: 'NZDUSD', label: 'NZD/USD' },
    { value: 'EURGBP', label: 'EUR/GBP' },
    { value: 'EURJPY', label: 'EUR/JPY' },
    { value: 'GBPJPY', label: 'GBP/JPY' },
    { value: 'BTCUSD', label: 'BTC/USD' },
    { value: 'ETHUSD', label: 'ETH/USD' },
    { value: 'NASDAQ:AAPL', label: 'AAPL (Apple)' },
    { value: 'NASDAQ:MSFT', label: 'MSFT (Microsoft)' },
    { value: 'NASDAQ:GOOGL', label: 'GOOGL (Google)' },
    { value: 'NYSE:TSLA', label: 'TSLA (Tesla)' },
  ];

  const intervals = [
    { value: '1', label: '1 minuto' },
    { value: '5', label: '5 minutos' },
    { value: '15', label: '15 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '240', label: '4 horas' },
    { value: 'D', label: 'Diario' },
    { value: 'W', label: 'Semanal' },
    { value: 'M', label: 'Mensual' },
  ];

  const handleSimulateTrade = () => {
    navigate('/capital');
  };

  const handleSendToCapital = () => {
    navigate('/capital');
  };

  const handleAddTrade = () => {
    // Check rules before allowing
    const violations = checkTradingRules(trades, settings);
    if (violations.some(v => v.severity === 'error')) {
      alert(`⚠️ No se puede agregar operación:\n\n${violations.filter(v => v.severity === 'error').map(v => v.message).join('\n')}`);
      return;
    }
    navigate('/trades', { state: { action: 'add', asset: currentAsset } });
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h1 className="text-3xl font-bold">Sala de Decisión</h1>
        <p className="text-muted-foreground mt-1">
          Análisis técnico y contexto histórico antes de operar
        </p>
      </div>

      {/* 5️⃣ BANNER DE REGLAS Y RIESGO - Si hay problemas críticos */}
      {(globalRiskStatus.status === 'blocked' || globalRiskStatus.status === 'warning' || blocked) && (
        <Card className={`border-2 ${
          globalRiskStatus.status === 'blocked' || blocked ? 'border-destructive bg-destructive/5' :
          'border-yellow-500 bg-yellow-500/5'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-6 w-6 mt-0.5 ${
                globalRiskStatus.status === 'blocked' || blocked ? 'text-destructive' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <div className={`font-bold text-lg mb-2 ${
                  globalRiskStatus.status === 'blocked' || blocked ? 'text-destructive' : 'text-yellow-600'
                }`}>
                  {blocked ? '🔴 TRADING BLOQUEADO' :
                   globalRiskStatus.status === 'blocked' ? '🔴 RIESGO CRÍTICO DETECTADO' :
                   '🟡 ADVERTENCIA DE RIESGO'}
                </div>
                <div className="space-y-1 text-sm">
                  {blocked && (
                    <div className="text-destructive">
                      Trading bloqueado por violación de reglas críticas. Revisa tu configuración.
                    </div>
                  )}
                  {globalRiskStatus.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1️⃣ PANEL DE CONTEXTO (Superior) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Contexto Principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Contexto del Activo
            </CardTitle>
            <CardDescription>
              Información histórica y estadísticas para {currentAsset}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Activo y Sesión */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Activo Seleccionado</div>
                <div className="text-xl font-bold">{currentAsset}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Sesión Actual</div>
                <div className="text-xl font-bold">{sessionNames[currentSession] || currentSession}</div>
              </div>
            </div>

            {/* Estadísticas Históricas */}
            {assetStats && assetStats.closedTrades > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
                  <div className={`text-2xl font-bold ${
                    assetStats.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {assetStats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {assetStats.closedTrades} operaciones
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Expectancy</div>
                  <div className={`text-2xl font-bold ${
                    assetStats.expectancy >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {assetStats.expectancy.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {settings.baseCurrency}
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Drawdown Histórico</div>
                  <div className={`text-2xl font-bold ${
                    assetStats.maxDrawdownPercent > 20 ? 'text-red-600' :
                    assetStats.maxDrawdownPercent > 10 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {assetStats.maxDrawdownPercent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Máximo registrado
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">P/L Total</div>
                  <div className={`text-2xl font-bold ${
                    assetStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {assetStats.totalPnl >= 0 ? '+' : ''}{assetStats.totalPnl.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {settings.baseCurrency}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50 text-center">
                <div className="text-sm text-muted-foreground">
                  No hay datos históricos para {currentAsset}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Realiza algunas operaciones para ver estadísticas
                </div>
              </div>
            )}

            {/* Insights Contextuales */}
            {assetInsights.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">Insights Contextuales</div>
                <div className="space-y-2">
                  {assetInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`p-3 rounded-lg border ${
                        insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                        insight.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      <div className="text-sm">{insight.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selector de Símbolo e Intervalo */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Gráfico</CardTitle>
        </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="symbol">Símbolo</Label>
              <Select
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              >
                {commonSymbols.map((sym) => (
                  <option key={sym.value} value={sym.value}>
                    {sym.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="interval">Intervalo</Label>
              <Select
                id="interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                {intervals.map((int) => (
                  <option key={int.value} value={int.value}>
                    {int.label}
                  </option>
                ))}
              </Select>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* 2️⃣ TRADINGVIEW WIDGET (Centro) */}
      <Card>
        <CardContent className="p-0 relative">
          {/* Banner sobre el gráfico si hay problemas */}
          {(globalRiskStatus.status === 'blocked' || blocked) && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-destructive/90 text-white p-3 text-center font-bold">
              🔴 TRADING BLOQUEADO - Revisa las reglas antes de continuar
            </div>
          )}
          <div style={{ height: '600px', width: '100%' }}>
            <TradingViewWidget symbol={symbol} interval={interval} />
          </div>
        </CardContent>
      </Card>

      {/* 3️⃣ PANEL DE DECISIÓN Y ACCIÓN (Inferior) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Decisión */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Panel de Decisión
            </CardTitle>
            <CardDescription>
              Acciones disponibles - Todas pasan por validación de reglas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="w-full h-auto py-6 flex flex-col items-center gap-2"
                onClick={handleSimulateTrade}
                disabled={blocked}
              >
                <Calculator className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Simular Trade</div>
                  <div className="text-xs text-muted-foreground">Ir a Gestión de Capital</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-6 flex flex-col items-center gap-2"
                onClick={handleSendToCapital}
                disabled={blocked}
              >
                <Send className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Enviar a Capital</div>
                  <div className="text-xs text-muted-foreground">Calcular posición</div>
                </div>
              </Button>

              <Button
                variant={canTrade ? "default" : "destructive"}
                className="w-full h-auto py-6 flex flex-col items-center gap-2"
                onClick={handleAddTrade}
                disabled={!canTrade}
              >
                <Plus className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Agregar Operación</div>
                  <div className="text-xs">
                    {canTrade ? 'Crear nueva operación' : 'Bloqueado por reglas'}
                  </div>
                </div>
              </Button>
            </div>

            {/* Feedback Visual */}
            {!canTrade && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="font-semibold text-destructive mb-2">⚠️ Acciones Bloqueadas</div>
                <div className="text-sm space-y-1">
                  {blocked && (
                    <div>• Trading bloqueado por violación de reglas críticas</div>
                  )}
                  {globalRiskStatus.status === 'blocked' && (
                    <div>• Riesgo crítico detectado: {globalRiskStatus.reasons.join(', ')}</div>
                  )}
                  {tradingStatus.status !== 'operable' && (
                    <div>• Estado de trading: {tradingStatus.mainReason}</div>
                  )}
                </div>
              </div>
            )}

            {canTrade && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="font-semibold text-green-600 mb-1 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Condiciones para operar: OK
                </div>
                <div className="text-sm text-muted-foreground">
                  Todas las reglas están siendo respetadas. Puedes proceder con precaución.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de Operaciones Históricas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Mis Operaciones en {currentAsset}
            </CardTitle>
            <CardDescription>
              {assetTrades.length} operación(es) registrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetTrades.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assetTrades
                  .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
                  .map((trade) => (
                    <div
                      key={trade.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTrade?.id === trade.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{trade.asset}</div>
                        <div className={`text-sm font-bold ${
                          trade.pnl && trade.pnl > 0 ? 'text-green-600' :
                          trade.pnl && trade.pnl < 0 ? 'text-red-600' :
                          'text-muted-foreground'
                        }`}>
                          {trade.pnl !== null 
                            ? `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} ${settings.baseCurrency}`
                            : trade.status === 'open' ? 'Abierta' : 'Sin P/L'
                          }
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>{new Date(trade.entryDate).toLocaleDateString('es-ES')}</div>
                        {trade.riskReward && (
                          <div>R/R: {trade.riskReward.toFixed(2)}</div>
                        )}
                        {trade.violatedRules && trade.violatedRules.length > 0 && (
                          <div className="text-yellow-600">
                            ⚠️ {trade.violatedRules.length} regla(s) violada(s)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay operaciones en {currentAsset}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel de Detalle de Operación Seleccionada */}
      {selectedTrade && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Detalle de Operación
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTrade(null)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Entrada</div>
                <div className="text-lg font-bold">{selectedTrade.entryPrice}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(selectedTrade.entryDate).toLocaleString('es-ES')}
                </div>
              </div>

              {selectedTrade.stopLoss && (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Stop Loss</div>
                  <div className="text-lg font-bold text-red-600">{selectedTrade.stopLoss}</div>
                </div>
              )}

              {selectedTrade.takeProfit && (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Take Profit</div>
                  <div className="text-lg font-bold text-green-600">{selectedTrade.takeProfit}</div>
                </div>
              )}

              {selectedTrade.riskReward && (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">R/R Ratio</div>
                  <div className={`text-lg font-bold ${
                    selectedTrade.riskReward >= 2 ? 'text-green-600' :
                    selectedTrade.riskReward >= 1 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedTrade.riskReward.toFixed(2)}:1
                  </div>
                </div>
              )}

              {selectedTrade.pnl !== null && (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Resultado</div>
                  <div className={`text-lg font-bold ${
                    selectedTrade.pnl > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedTrade.pnl >= 0 ? '+' : ''}{selectedTrade.pnl.toFixed(2)} {settings.baseCurrency}
                  </div>
                </div>
              )}
            </div>

            {selectedTrade.notes && (
              <div className="mt-4 p-3 border rounded-lg">
                <div className="text-sm font-semibold mb-2">Notas</div>
                <div className="text-sm text-muted-foreground">{selectedTrade.notes}</div>
              </div>
            )}

            {selectedTrade.violatedRules && selectedTrade.violatedRules.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-sm font-semibold text-yellow-600 mb-2">Reglas Violadas</div>
                <ul className="space-y-1">
                  {selectedTrade.violatedRules.map((rule, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
                      <span>{rule.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};
