import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { TradingViewWidget } from '@/components/trading/TradingViewWidget';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/store/settingsStore';

export const GraficoPage = () => {
  const { loadSettings } = useSettingsStore();
  const [symbol, setSymbol] = useState('EURUSD');
  const [interval, setInterval] = useState('D');

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h1 className="text-3xl font-bold">Gráfico</h1>
        <p className="text-muted-foreground mt-1">
          Análisis técnico en tiempo real con TradingView
        </p>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Gráfico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Gráfico */}
      <Card>
        <CardContent className="p-0">
          <div style={{ height: '600px', width: '100%' }}>
            <TradingViewWidget symbol={symbol} interval={interval} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

