# MT5 Trade Logger - Setup Instructions

## Overview
Este sistema detecta automáticamente trades en MetaTrader 5 y los envía a un backend para registro en base de datos.

## Part 1: Expert Advisor Setup

### Requisitos
- MetaTrader 5 instalado
- Cuenta demo o live conectada
- URLs permitidas configuradas en MT5

### Instalación del EA

1. **Copiar el archivo EA**
   - Copiar `MT5TradeLogger.mq5` a: `[MT5 Data Folder]/MQL5/Experts/`

2. **Compilar el EA**
   - Abrir MetaEditor (F4 en MT5)
   - Abrir `MT5TradeLogger.mq5`
   - Compilar (F7)
   - Verificar que no hay errores

3. **Configurar URLs permitidas**
   - En MT5: Tools → Options → Expert Advisors
   - Marcar "Allow WebRequest for listed URL"
   - Agregar: `https://tu-backend.com`
   - (Reemplazar con tu URL del backend)

4. **Adjuntar EA a gráfico**
   - Arrastrar `MT5TradeLogger` desde Navigator a cualquier gráfico
   - Configurar parámetros:
     - **Server URL**: URL de tu backend (ej: `https://api.tujournal.com`)
     - **API Key**: API key del backend
     - **Timeout**: 5000 (ms)
     - **Retry Count**: 3
     - **Enable Logging**: true (para debug)

5. **Verificar funcionamiento**
   - Abrir tab "Experts" en Terminal
   - Deberías ver: "MT5 Trade Logger initialized"
   - Abrir una posición manualmente
   - Verificar logs en terminal

### Parámetros del EA

| Parámetro | Descripción | Valor por defecto |
|-----------|-------------|-------------------|
| Server URL | URL completa del backend | `https://tu-backend.com/api` |
| API Key | Clave de autenticación | `your-api-key-here` |
| Timeout | Timeout de requests (ms) | 5000 |
| Retry Count | Intentos en caso de error | 3 |
| Enable Logging | Activar logs de debug | true |

## Part 2: Backend Setup

### Requisitos
- Node.js >= 16.0.0
- PostgreSQL o Supabase
- Cuenta en hosting (Railway, Render, Heroku, etc.)

### Instalación

1. **Clonar/descargar código backend**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus valores
   ```

3. **Crear base de datos**
   - Ejecutar `src/database/schema.sql` en tu base de datos
   - O usar Supabase SQL Editor

4. **Probar localmente**
   ```bash
   npm run dev
   # Deberías ver: "MT5 Trade Logger Backend running on port 3000"
   ```

5. **Deploy a producción**
   - Configurar variables de entorno en tu hosting
   - Deploy código
   - Verificar que endpoint `/health` responde

### Variables de Entorno

```env
PORT=3000
NODE_ENV=production
API_KEY=tu-api-key-segura-aqui
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Endpoints

#### POST /trades/open
Recibe datos de trade abierto desde MT5.

**Headers:**
```
Content-Type: application/json
X-API-Key: your-api-key
```

**Body:**
```json
{
  "ticket": "12345678",
  "trade_uid": "MT5_123456_12345678_1699123456",
  "symbol": "EURUSD",
  "side": "buy",
  "volume": 0.1,
  "price_open": 1.08500,
  "stop_loss": 1.08000,
  "take_profit": 1.09000,
  "time_open": 1699123456,
  "account_mode": "demo",
  "broker": "Your Broker Name"
}
```

#### POST /trades/close
Actualiza trade con datos de cierre.

**Body:**
```json
{
  "ticket": "12345678",
  "trade_uid": "MT5_123456_12345678_1699123456",
  "price_close": 1.08750,
  "time_close": 1699127000,
  "profit": 250.00,
  "commission": -0.70,
  "swap": 0.00
}
```

#### GET /trades
Obtiene lista de trades (con filtros opcionales).

**Query params:**
- `account_mode`: simulation | demo | live
- `symbol`: EURUSD, etc.
- `limit`: número de resultados (default: 100)
- `offset`: paginación (default: 0)

#### GET /health
Health check del servidor.

## Part 3: Base de Datos

### Supabase Setup

1. Crear proyecto en Supabase
2. Ir a SQL Editor
3. Ejecutar contenido de `backend/src/database/schema.sql`
4. Copiar connection string desde Settings → Database
5. Usar en `DATABASE_URL` del backend

### Estructura de Tabla

La tabla `trades` contiene:
- Identificadores: `ticket`, `trade_uid`
- Account info: `account_mode`, `broker`
- Trade data: `symbol`, `side`, `volume`, prices
- Financials: `pnl`, `commission`, `swap`, `r_multiple`
- Timestamps: `opened_at`, `closed_at`, `duration_seconds`

### Views Disponibles

- `open_trades`: Trades abiertos
- `closed_trades`: Trades cerrados con métricas

## Troubleshooting

### EA no envía datos
1. Verificar que URLs están permitidas en MT5
2. Verificar que API Key es correcta
3. Revisar logs en tab "Experts"
4. Probar endpoint `/health` del backend manualmente

### Errores de conexión
1. Verificar que backend está corriendo
2. Verificar firewall/security groups
3. Probar con curl/Postman

### Trades duplicados
- El sistema previene duplicados por `ticket + account_mode`
- Si persiste, revisar lógica de detección en EA

## Seguridad

- **Cambiar API_KEY** en producción
- **Usar HTTPS** siempre
- **Validar inputs** en backend (ya implementado)
- **Rate limiting** (considerar agregar)
- **IP whitelisting** (opcional, para mayor seguridad)

## Notas Importantes

- El EA **NO ejecuta trades**, solo detecta y registra
- El trader opera manualmente en MT5
- El sistema soporta múltiples modos: simulation, demo, live
- Cada trade tiene un `trade_uid` único persistente
- El sistema maneja retries automáticos en caso de fallos de red

