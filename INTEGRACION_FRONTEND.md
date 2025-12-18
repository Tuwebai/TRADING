# 🔗 Integración con Frontend Existente

## Sincronización de Trades desde Backend

### Opción 1: Endpoint de Sincronización en Backend

Agregar endpoint en `backend/src/server.js`:

```javascript
/**
 * GET /api/trades/sync
 * Obtiene trades para sincronizar con frontend
 */
app.get('/trades/sync', validateAPIKey, async (req, res) => {
  try {
    const { account_mode, last_sync } = req.query;
    
    let query = 'SELECT * FROM trades WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (account_mode) {
      paramCount++;
      query += ` AND account_mode = $${paramCount}`;
      params.push(account_mode);
    }

    if (last_sync) {
      paramCount++;
      query += ` AND (created_at > $${paramCount} OR updated_at > $${paramCount})`;
      params.push(last_sync, last_sync);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    // Transformar a formato compatible con tu frontend
    const trades = result.rows.map(row => ({
      id: row.trade_uid, // Usar trade_uid como ID único
      mode: row.account_mode,
      asset: row.symbol,
      positionType: row.side === 'buy' ? 'long' : 'short',
      entryPrice: parseFloat(row.price_open),
      exitPrice: row.price_close ? parseFloat(row.price_close) : null,
      positionSize: parseFloat(row.volume),
      stopLoss: row.stop_loss ? parseFloat(row.stop_loss) : null,
      takeProfit: row.take_profit ? parseFloat(row.take_profit) : null,
      entryDate: row.opened_at.toISOString(),
      exitDate: row.closed_at ? row.closed_at.toISOString() : null,
      status: row.closed_at ? 'closed' : 'open',
      pnl: row.pnl ? parseFloat(row.pnl) : null,
      riskReward: row.r_multiple ? parseFloat(row.r_multiple) : null,
      commission: row.commission ? parseFloat(row.commission) : 0,
      swap: row.swap ? parseFloat(row.swap) : 0,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      // Metadata adicional
      broker: row.broker,
      ticket: row.ticket,
    }));

    res.json({
      success: true,
      count: trades.length,
      data: trades,
      last_sync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing trades:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync trades',
    });
  }
});
```

### Opción 2: Service en Frontend

Crear `src/services/mt5SyncService.ts`:

```typescript
/**
 * MT5 Sync Service
 * Sincroniza trades desde el backend MT5
 */

interface MT5SyncConfig {
  apiUrl: string;
  apiKey: string;
}

interface MT5Trade {
  id: string;
  mode: 'simulation' | 'demo' | 'live';
  asset: string;
  positionType: 'long' | 'short';
  entryPrice: number;
  exitPrice: number | null;
  positionSize: number;
  stopLoss: number | null;
  takeProfit: number | null;
  entryDate: string;
  exitDate: string | null;
  status: 'open' | 'closed';
  pnl: number | null;
  riskReward: number | null;
  commission: number;
  swap: number;
  createdAt: string;
  updatedAt: string;
  broker?: string;
  ticket?: string;
}

export class MT5SyncService {
  private config: MT5SyncConfig;

  constructor(config: MT5SyncConfig) {
    this.config = config;
  }

  /**
   * Obtiene trades desde backend MT5
   */
  async fetchTrades(accountMode?: 'simulation' | 'demo' | 'live'): Promise<MT5Trade[]> {
    const url = new URL(`${this.config.apiUrl}/trades/sync`);
    if (accountMode) {
      url.searchParams.append('account_mode', accountMode);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trades: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Sincroniza trades con el store local
   */
  async syncWithStore(
    accountMode: 'simulation' | 'demo' | 'live',
    tradeStore: any // Tu useTradeStore
  ): Promise<number> {
    try {
      const mt5Trades = await this.fetchTrades(accountMode);
      let syncedCount = 0;

      for (const mt5Trade of mt5Trades) {
        // Verificar si el trade ya existe
        const existingTrade = tradeStore.trades.find(
          (t: any) => t.id === mt5Trade.id || t.ticket === mt5Trade.ticket
        );

        if (!existingTrade) {
          // Convertir formato MT5 a formato de tu store
          const tradeData = this.convertMT5ToStoreFormat(mt5Trade);
          
          // Agregar trade al store
          tradeStore.addTrade(tradeData);
          syncedCount++;
        } else {
          // Actualizar trade existente si fue modificado
          if (new Date(mt5Trade.updatedAt) > new Date(existingTrade.updatedAt)) {
            tradeStore.updateTrade(existingTrade.id, this.convertMT5ToStoreFormat(mt5Trade));
            syncedCount++;
          }
        }
      }

      return syncedCount;
    } catch (error) {
      console.error('Error syncing MT5 trades:', error);
      throw error;
    }
  }

  /**
   * Convierte formato MT5 a formato del store
   */
  private convertMT5ToStoreFormat(mt5Trade: MT5Trade): any {
    return {
      id: mt5Trade.id,
      asset: mt5Trade.asset,
      positionType: mt5Trade.positionType,
      entryPrice: mt5Trade.entryPrice,
      exitPrice: mt5Trade.exitPrice,
      positionSize: mt5Trade.positionSize,
      leverage: null, // No disponible en MT5 por defecto
      stopLoss: mt5Trade.stopLoss,
      takeProfit: mt5Trade.takeProfit,
      entryDate: mt5Trade.entryDate,
      exitDate: mt5Trade.exitDate,
      notes: `Synced from MT5${mt5Trade.broker ? ` (${mt5Trade.broker})` : ''}`,
      screenshots: [],
      videos: [],
      tags: ['mt5-synced'],
      journal: {
        preTrade: {
          technicalAnalysis: '',
          marketSentiment: '',
          entryReasons: '',
          emotion: null,
        },
        duringTrade: {
          marketChanges: '',
          stopLossAdjustments: '',
          takeProfitAdjustments: '',
          emotion: null,
        },
        postTrade: {
          whatWentWell: '',
          whatWentWrong: '',
          lessonsLearned: '',
          emotion: null,
        },
      },
      status: mt5Trade.status,
      pnl: mt5Trade.pnl,
      riskReward: mt5Trade.riskReward,
      commission: mt5Trade.commission,
      swap: mt5Trade.swap,
      mode: mt5Trade.mode,
      createdAt: mt5Trade.createdAt,
      updatedAt: mt5Trade.updatedAt,
      // Metadata adicional
      broker: mt5Trade.broker,
      ticket: mt5Trade.ticket,
    };
  }
}
```

### Opción 3: Hook de React

Crear `src/hooks/useMT5Sync.ts`:

```typescript
import { useEffect, useState } from 'react';
import { useTradingMode } from '@/store/tradingModeStore';
import { useTradeStore } from '@/store/tradeStore';
import { MT5SyncService } from '@/services/mt5SyncService';

const MT5_API_URL = process.env.REACT_APP_MT5_API_URL || 'https://tu-backend.com/api';
const MT5_API_KEY = process.env.REACT_APP_MT5_API_KEY || '';

export function useMT5Sync(autoSync: boolean = true, syncInterval: number = 60000) {
  const { mode } = useTradingMode();
  const tradeStore = useTradeStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncService = new MT5SyncService({
    apiUrl: MT5_API_URL,
    apiKey: MT5_API_KEY,
  });

  const sync = async () => {
    if (!MT5_API_KEY || !MT5_API_URL) {
      console.warn('MT5 sync not configured. Set REACT_APP_MT5_API_URL and REACT_APP_MT5_API_KEY');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const count = await syncService.syncWithStore(mode, tradeStore);
      setLastSync(new Date());
      
      if (count > 0) {
        console.log(`Synced ${count} trades from MT5`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('MT5 sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!autoSync) return;

    // Sync immediately on mount
    sync();

    // Set up interval sync
    const interval = setInterval(sync, syncInterval);

    return () => clearInterval(interval);
  }, [mode, autoSync, syncInterval]);

  return {
    sync,
    isSyncing,
    lastSync,
    error,
  };
}
```

### Uso en Componente

```typescript
// En tu componente principal o TradesPage
import { useMT5Sync } from '@/hooks/useMT5Sync';

export const TradesPage = () => {
  // Sincronizar automáticamente cada 60 segundos
  const { isSyncing, lastSync, error } = useMT5Sync(true, 60000);

  return (
    <div>
      {/* Tu UI existente */}
      {isSyncing && <div>Syncing trades from MT5...</div>}
      {lastSync && <div>Last sync: {lastSync.toLocaleTimeString()}</div>}
      {error && <div>Sync error: {error}</div>}
    </div>
  );
};
```

## Variables de Entorno para Frontend

Agregar a `.env` o `.env.local`:

```env
REACT_APP_MT5_API_URL=https://tu-backend.com/api
REACT_APP_MT5_API_KEY=tu-api-key-aqui
```

## Consideraciones

1. **Deduplicación**: El sistema previene duplicados por `trade_uid`, pero asegúrate de verificar antes de agregar.

2. **Modo de cuenta**: Los trades se filtran automáticamente por `account_mode` (simulation/demo/live).

3. **Sincronización**: 
   - Puedes sincronizar manualmente llamando `sync()`
   - O automáticamente con intervalos
   - O en eventos específicos (mount, cambio de modo, etc.)

4. **Conflictos**: Si un trade fue editado manualmente en el frontend y también en MT5, el sistema puede necesitar lógica adicional para resolver conflictos.

5. **Performance**: Para muchos trades, considera paginación o sincronización incremental por fecha.

