# 🚀 Setup Completo del Sistema MT5 Trade Logger

## Arquitectura del Sistema

```
MT5 Platform → Expert Advisor → HTTP POST → Backend API → PostgreSQL/Supabase
```

## Checklist de Implementación

### ✅ Paso 1: Base de Datos (5 minutos)

1. **Crear proyecto Supabase** o usar PostgreSQL existente
2. **Ejecutar schema SQL**:
   - Abrir Supabase SQL Editor
   - Copiar contenido de `backend/src/database/schema.sql`
   - Ejecutar script
   - Verificar que tabla `trades` fue creada

### ✅ Paso 2: Backend (10 minutos)

1. **Clonar/descargar código backend**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar `.env`**:
   ```env
   PORT=3000
   NODE_ENV=production
   API_KEY=generar-clave-segura-aqui
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

3. **Generar API Key segura**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copiar output a `API_KEY` en `.env`

4. **Probar localmente**:
   ```bash
   npm run dev
   # Deberías ver: "MT5 Trade Logger Backend running on port 3000"
   ```

5. **Test endpoint**:
   ```bash
   curl http://localhost:3000/health
   # Debería responder: {"status":"ok","timestamp":"..."}
   ```

6. **Deploy a producción**:
   - Opciones: Railway, Render, Heroku, DigitalOcean
   - Configurar variables de entorno
   - Deploy código
   - Obtener URL pública (ej: `https://tu-backend.railway.app`)

### ✅ Paso 3: Expert Advisor (10 minutos)

1. **Instalar EA en MT5**:
   - Copiar `MT5_TradeLogger/MT5TradeLogger.mq5` a:
     - Windows: `C:\Users\[User]\AppData\Roaming\MetaQuotes\Terminal\[ID]\MQL5\Experts\`
   - Abrir MetaEditor (F4 en MT5)
   - Abrir archivo `MT5TradeLogger.mq5`
   - Compilar (F7)
   - Verificar: "0 error(s), 0 warning(s)"

2. **Configurar URLs permitidas**:
   - En MT5: Tools → Options → Expert Advisors
   - Marcar ✅ "Allow WebRequest for listed URL"
   - Agregar URL de tu backend (ej: `https://tu-backend.railway.app`)

3. **Configurar y adjuntar EA**:
   - Desde Navigator, arrastrar `MT5TradeLogger` a cualquier gráfico
   - Configurar parámetros:
     ```
     Server URL: https://tu-backend.railway.app/api
     API Key: [la misma que en backend .env]
     Timeout: 5000
     Retry Count: 3
     Enable Logging: true
     ```
   - Aceptar

4. **Verificar logs**:
   - Abrir tab "Experts" en Terminal
   - Deberías ver: "MT5 Trade Logger initialized"
   - Verificar: "Account Mode: demo" o "live"
   - Verificar: "Broker: [nombre del broker]"

### ✅ Paso 4: Test Completo (5 minutos)

1. **Abrir posición manual en MT5**:
   - Abrir trade manualmente desde MT5
   - Verificar en logs del EA: "Sending trade open: ..."
   - Verificar: "Trade open sent successfully"

2. **Verificar en base de datos**:
   ```sql
   SELECT * FROM trades ORDER BY created_at DESC LIMIT 1;
   ```
   Deberías ver el trade recién abierto

3. **Cerrar posición manual en MT5**:
   - Cerrar el trade
   - Verificar logs: "Sending trade close: ..."
   - Verificar: "Trade close sent successfully"

4. **Verificar cierre en BD**:
   ```sql
   SELECT * FROM trades WHERE ticket = '[tu_ticket]';
   ```
   Deberías ver `price_close`, `pnl`, `result`, `r_multiple` completados

## Endpoints del Backend

### POST /api/trades/open
Recibe trade abierto.

### POST /api/trades/close
Actualiza trade con datos de cierre.

### GET /api/trades
Lista trades (con filtros: `?account_mode=demo&symbol=EURUSD`).

### GET /api/health
Health check.

## Monitoreo

### Logs del EA (MT5)
- Tab "Experts" → Ver mensajes del EA
- Buscar: "ERROR", "WARNING", "Success"

### Logs del Backend
```bash
# Si usas Railway/Render, ver logs desde dashboard
# Si local:
npm run dev
# Ver errores en consola
```

### Verificar Trades en BD
```sql
-- Trades abiertos
SELECT * FROM open_trades;

-- Trades cerrados recientes
SELECT * FROM closed_trades LIMIT 10;

-- Estadísticas por modo
SELECT account_mode, COUNT(*) as total, 
       SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins
FROM trades 
WHERE closed_at IS NOT NULL
GROUP BY account_mode;
```

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| EA no envía datos | Verificar URLs permitidas en MT5 Options |
| Error 401 Unauthorized | Verificar API Key coincide en EA y backend |
| Error 500 en backend | Revisar logs, verificar DATABASE_URL |
| Trades duplicados | Ya previene duplicados, pero revisar si persiste |
| No detecta cierre | Verificar que EA está corriendo cuando cierras |

## Seguridad en Producción

1. ✅ Cambiar `API_KEY` por una generada aleatoriamente
2. ✅ Usar HTTPS siempre (Railway/Render lo proveen automático)
3. ✅ No commitear `.env` (ya está en `.gitignore`)
4. ⚠️ Considerar rate limiting (opcional)
5. ⚠️ Considerar IP whitelisting (opcional, restrictivo)

## Integración con Frontend Existente

El sistema está diseñado para integrarse con tu frontend de trading journal:

1. **Leer trades desde BD**:
   ```sql
   SELECT * FROM trades WHERE account_mode = 'demo' ORDER BY opened_at DESC;
   ```

2. **Sincronizar con tu store**:
   - Puedes crear un endpoint que lea desde BD
   - O sincronizar directamente desde tu frontend

3. **Modo de cuenta**:
   - El EA detecta automáticamente: demo/live
   - Tu frontend puede filtrar por `account_mode`
   - Compatible con tu sistema de modos existente

## Próximos Pasos (Opcional)

- [ ] Agregar dashboard de monitoreo
- [ ] Implementar rate limiting
- [ ] Agregar alertas por email/webhook
- [ ] Exportar trades a formato compatible con tu journal
- [ ] Sincronización bidireccional (BD ↔ Frontend)

---

**Tiempo total de setup**: ~30 minutos
**Complejidad**: Media
**Requiere**: MT5, Node.js, PostgreSQL/Supabase

