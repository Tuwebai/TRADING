import React, { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ 
  symbol = 'NASDAQ:AAPL',
  interval = 'D'
}) => {
  const container = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();
  
  // Determinar tema basado en settings
  const isDark = settings.theme === 'dark' || settings.theme === 'trading-terminal';
  const theme = isDark ? 'dark' : 'light';
  const backgroundColor = isDark ? '#0F0F0F' : '#FFFFFF';
  const gridColor = isDark ? 'rgba(242, 242, 242, 0.06)' : 'rgba(242, 242, 242, 0.5)';

  useEffect(() => {
    if (!container.current) return;

    // Limpiar completamente el contenedor antes de agregar nuevo widget
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: interval,
      locale: 'es',
      save_image: true,
      style: '1',
      symbol: symbol,
      theme: theme,
      timezone: 'Etc/UTC',
      backgroundColor: backgroundColor,
      gridColor: gridColor,
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize: true,
    });

    container.current.appendChild(script);

    // Cleanup
    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, interval, theme, backgroundColor, gridColor]);

  return (
    <div className="tradingview-widget-container" style={{ height: '100%', width: '100%' }}>
      <div 
        className="tradingview-widget-container__widget" 
        ref={container}
        style={{ height: 'calc(100% - 32px)', width: '100%' }}
      />
      <div className="tradingview-widget-copyright text-xs text-muted-foreground text-center mt-2">
        <a 
          href={`https://www.tradingview.com/symbols/${symbol.replace(':', '/')}/`} 
          rel="noopener nofollow" 
          target="_blank"
          className="text-primary hover:underline"
        >
          <span>{symbol} chart</span>
        </a>
        <span className="ml-1"> by TradingView</span>
      </div>
    </div>
  );
};

