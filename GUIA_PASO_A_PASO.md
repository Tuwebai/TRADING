# 📚 Guía Paso a Paso - Como si tuvieras 10 años

Esta guía te explica TODO lo que debes hacer, paso por paso, para poner en funcionamiento el sistema de registro automático de trades.

---

## 🎯 ¿Qué vas a hacer?

Vas a crear un sistema que **detecta automáticamente** cuando abres o cierras un trade en MetaTrader 5 y lo **guarda automáticamente** en una base de datos.

---

## PARTE 1: Crear la Base de Datos (Donde se guardan los trades)

### Paso 1.1: Crear cuenta en Supabase

1. Ve a: https://supabase.com
2. Haz clic en el botón **"Start your project"** o **"Sign up"**
3. Elige **"Sign up with GitHub"** o crea una cuenta con email
4. Confirma tu email si te lo piden

### Paso 1.2: Crear un nuevo proyecto

1. Una vez dentro de Supabase, haz clic en el botón **"New Project"** (botón verde)
2. Te pedirá información:
   - **Name**: Ponle un nombre, por ejemplo: "Trading Journal"
   - **Database Password**: Crea una contraseña MUY segura (anótala, la necesitarás después)
   - **Region**: Elige la más cercana a ti (por ejemplo: "East US" o "West Europe")
   - **Pricing Plan**: Elige "Free" (es gratis para empezar)
3. Haz clic en **"Create new project"**
4. Espera 2-3 minutos mientras se crea (verás una pantalla de "Setting up your project...")

### Paso 1.3: Encontrar tu contraseña de la base de datos

⚠️ **IMPORTANTE**: La contraseña que pusiste arriba solo se muestra UNA vez. Si la olvidaste, deberás cambiarla.

1. Cuando termine de crear el proyecto, verás tu dashboard
2. Ve a: **Settings** (icono de engranaje ⚙️) en el menú de la izquierda
3. Haz clic en **"Database"**
4. Busca la sección **"Connection string"**
5. Busca la que dice **"URI"** (es la primera)
6. Se ve así: `postgresql://postgres:[TU-CONTRASEÑA]@db.xxxxx.supabase.co:5432/postgres`
7. Copia toda esa línea completa (es tu DATABASE_URL, la necesitarás después)

### Paso 1.4: Crear la tabla en la base de datos

1. En Supabase, ve a **"SQL Editor"** en el menú de la izquierda (icono de código `</>`)
2. Haz clic en el botón **"New query"**
3. Abre el archivo `backend/src/database/schema.sql` que creamos antes
4. Copia TODO el contenido de ese archivo (todo el texto)
5. Pega ese contenido en el editor SQL de Supabase
6. Haz clic en el botón **"Run"** (botón verde abajo a la derecha)
7. Deberías ver un mensaje verde que dice "Success. No rows returned"
8. ✅ ¡Listo! Tu tabla está creada

### Paso 1.5: Verificar que la tabla se creó

1. En Supabase, ve a **"Table Editor"** en el menú de la izquierda (icono de tabla)
2. Deberías ver una tabla llamada **"trades"**
3. Haz clic en ella
4. Deberías ver muchas columnas (id, ticket, trade_uid, symbol, etc.)
5. ✅ Si ves esto, ¡todo está bien!

### Paso 1.6: Configurar Row Level Security (RLS)

1. En Supabase, con la tabla **"trades"** abierta, busca el botón **"RLS disabled"** (arriba a la derecha, botón rojo)
2. Haz clic en ese botón
3. En el popup que aparece, haz clic en **"Enable RLS for this table"**
4. El botón ahora debería cambiar a verde y decir **"RLS enabled"**
5. Ve a **"SQL Editor"** en el menú de la izquierda
6. Haz clic en **"New query"**
7. Copia y pega este código SQL:

```sql
-- Política: Permitir todo al service_role (backend/API)
CREATE POLICY "Allow all operations for service_role"
ON trades
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

8. Haz clic en **"Run"** (botón verde)
9. Deberías ver: "Success. No rows returned"
10. ✅ ¡Listo! Ahora tu tabla está protegida correctamente

**¿Por qué hacer esto?** Sin estas políticas, tu backend no podrá guardar trades (daría error de permisos).

---

## PARTE 2: Crear el Backend (El servidor que recibe los datos)

### Paso 2.1: Crear cuenta en Railway (para alojar el backend)

1. Ve a: https://railway.app
2. Haz clic en **"Start a New Project"**
3. Elige **"Login with GitHub"** (necesitas cuenta de GitHub, si no la tienes créala primero)
4. Autoriza a Railway para acceder a tu GitHub

### Paso 2.2: Crear un nuevo proyecto en Railway

1. Haz clic en **"New Project"**
2. Elige **"Empty Project"** (proyecto vacío)
3. Te dará un nombre aleatorio al proyecto, puedes cambiarlo si quieres

### Paso 2.3: Subir el código del backend

**Opción A: Si tienes Git/GitHub (recomendado)**

1. En tu computadora, abre una terminal o PowerShell
2. Ve a la carpeta del proyecto: `cd "C:\Users\Usuario\Documents\Proyectos Web\trading\backend"`
3. Inicializa Git si no lo has hecho:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
4. Crea un repositorio en GitHub:
   - Ve a https://github.com/new
   - Ponle un nombre, por ejemplo: "mt5-trade-logger-backend"
   - Haz clic en "Create repository"
5. Conecta tu código con GitHub:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/mt5-trade-logger-backend.git
   git push -u origin main
   ```
6. En Railway, haz clic en **"New"** → **"GitHub Repo"**
7. Conecta tu cuenta de GitHub si te lo pide
8. Elige tu repositorio "mt5-trade-logger-backend"
9. Railway automáticamente detectará que es Node.js y empezará a construir

**Opción B: Sin Git (más simple pero menos recomendado)**

1. En Railway, haz clic en **"New"** → **"GitHub Repo"**
2. Haz clic en **"Deploy from GitHub repo"**
3. Haz clic en **"Configure GitHub App"** y autoriza
4. Pero antes necesitas subir tu código a GitHub (ve a Opción A primero)

### Paso 2.4: Configurar las variables de entorno

1. En Railway, cuando tu proyecto se esté construyendo, haz clic en él
2. Ve a la pestaña **"Variables"**
3. Necesitas agregar estas 3 variables:

   **Variable 1: PORT**
   - Key: `PORT`
   - Value: `3000`
   - Haz clic en **"Add"**

   **Variable 2: API_KEY**
   - Key: `API_KEY`
   - Value: Necesitas crear una clave secreta
   - Para crearla, abre una terminal y escribe:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Copia el texto largo que aparece (algo como: `a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1`)
   - Pega ese texto en Value
   - ⚠️ **ANÓTALA BIEN**, la necesitarás después
   - Haz clic en **"Add"**

   **Variable 3: DATABASE_URL**
   - Key: `DATABASE_URL`
   - Value: La línea que copiaste en el Paso 1.3 (la que empieza con `postgresql://...`)
   - Haz clic en **"Add"**

   **Variable 4: NODE_ENV**
   - Key: `NODE_ENV`
   - Value: `production`
   - Haz clic en **"Add"**

4. ✅ Deberías tener 4 variables configuradas

### Paso 2.5: Esperar a que se construya

1. Ve a la pestaña **"Deployments"** en Railway
2. Verás que está construyendo tu proyecto
3. Espera 2-3 minutos hasta que veas un check verde ✅
4. Si ves un error ❌, revisa los logs haciendo clic en el deployment

### Paso 2.6: Obtener la URL de tu backend

1. En Railway, ve a la pestaña **"Settings"**
2. Busca la sección **"Domains"**
3. Haz clic en **"Generate Domain"**
4. Te dará una URL como: `tu-proyecto-production.up.railway.app`
5. Copia esa URL completa
6. Tu URL completa del backend será: `https://tu-proyecto-production.up.railway.app`
7. ⚠️ **ANÓTALA BIEN**, la necesitarás después

### Paso 2.7: Probar que el backend funciona

1. Abre tu navegador
2. Ve a: `https://tu-proyecto-production.up.railway.app/health`
3. Deberías ver algo como: `{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}`
4. ✅ Si ves eso, ¡tu backend está funcionando!

---

## PARTE 3: Instalar el Expert Advisor en MetaTrader 5

### Paso 3.1: Encontrar la carpeta de MetaTrader 5

1. Abre MetaTrader 5
2. Ve a: **File** → **Open Data Folder**
3. Se abrirá una ventana del explorador de archivos
4. Anota la ruta que aparece arriba (algo como: `C:\Users\TuNombre\AppData\Roaming\MetaQuotes\Terminal\...`)

### Paso 3.2: Copiar el archivo del Expert Advisor

1. Ve a la carpeta `MT5_TradeLogger` en tu proyecto
2. Encuentra el archivo `MT5TradeLogger.mq5`
3. Cópialo (Ctrl+C)
4. Ve a la carpeta de MT5 que abriste antes
5. Entra a la carpeta `MQL5`
6. Entra a la carpeta `Experts`
7. Pega el archivo aquí (Ctrl+V)
8. ✅ Ahora deberías ver `MT5TradeLogger.mq5` en esa carpeta

### Paso 3.3: Compilar el Expert Advisor

1. En MetaTrader 5, presiona **F4** (esto abre MetaEditor)
2. Si no se abre automáticamente, ve a: **Tools** → **MetaQuotes Language Editor**
3. En el panel izquierdo, ve a: **Experts** → deberías ver `MT5TradeLogger`
4. Haz doble clic en `MT5TradeLogger.mq5`
5. Presiona **F7** (o ve a **Compile** en el menú)
6. Abajo verás una ventana con resultados
7. Debe decir: **"0 error(s), 0 warning(s)"** en verde
8. ✅ Si ves eso, ¡está compilado correctamente!
9. Si hay errores, revísalos y corrige el código

### Paso 3.4: Configurar URLs permitidas en MT5

1. En MetaTrader 5, ve a: **Tools** → **Options**
2. En la ventana que se abre, ve a la pestaña **"Expert Advisors"**
3. Busca la sección **"Allow WebRequest for listed URL"**
4. Marca el cuadro ✅ (haz clic para activarlo)
5. Haz clic en el botón **"Add"** que está al lado
6. Pega la URL de tu backend (la que anotaste en Paso 2.6): `https://tu-proyecto-production.up.railway.app`
7. Haz clic en **"OK"**
8. Haz clic en **"OK"** en la ventana de Options
9. ✅ Listo, ahora MT5 puede enviar datos a tu backend

### Paso 3.5: Agregar el EA a un gráfico

1. En MetaTrader 5, abre cualquier gráfico (por ejemplo, EURUSD)
2. En el panel izquierdo (Navigator), busca la carpeta **"Expert Advisors"**
3. Expande la carpeta haciendo clic en la flecha
4. Encuentra **"MT5TradeLogger"**
5. Arrastra **"MT5TradeLogger"** al gráfico
6. Se abrirá una ventana de configuración

### Paso 3.6: Configurar los parámetros del EA

En la ventana que se abrió, configura estos valores:

**Server URL:**
- Pega la URL de tu backend (Paso 2.6): `https://tu-proyecto-production.up.railway.app/api`
- ⚠️ Importante: Agrega `/api` al final

**API Key:**
- Pega la API_KEY que creaste en el Paso 2.4
- Es ese texto largo que generaste (algo como: `a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4...`)

**Timeout:**
- Deja: `5000`

**Retry Count:**
- Deja: `3`

**Enable Logging:**
- Marca el cuadro ✅ (para ver mensajes de debug)

7. Haz clic en **"OK"**
8. Verás una sonrisa 😊 en la esquina superior derecha del gráfico (significa que el EA está activo)

### Paso 3.7: Verificar que el EA está funcionando

1. En MetaTrader 5, ve a la pestaña **"Toolbox"** (abajo)
2. Ve a la pestaña **"Experts"**
3. Deberías ver mensajes como:
   - "MT5 Trade Logger initialized"
   - "Server URL: https://..."
   - "Account Mode: demo" (o "live")
   - "Broker: [nombre de tu broker]"
4. ✅ Si ves estos mensajes, ¡el EA está funcionando!

---

## PARTE 4: Probar que Todo Funciona

### Paso 4.1: Abrir un trade de prueba

1. En MetaTrader 5, abre un gráfico (por ejemplo, EURUSD)
2. Haz clic derecho en el gráfico
3. Elige **"Trading"** → **"New Order"**
4. En la ventana que se abre:
   - **Symbol**: Elige un par (ej: EURUSD)
   - **Volume**: 0.01 (muy pequeño para probar)
   - **Type**: Market Execution
   - **Operation**: Buy (o Sell, no importa)
5. Haz clic en **"Sell"** o **"Buy"** (según elegiste)
6. Se abrirá una posición

### Paso 4.2: Verificar que se envió el trade

1. Ve a la pestaña **"Experts"** en Toolbox
2. Deberías ver mensajes como:
   - "Sending trade open: {...}"
   - "Trade open sent successfully. Ticket: 12345678"
3. Si ves errores, revísalos (puede ser que la API_KEY esté mal, o la URL)

### Paso 4.3: Verificar en la base de datos

1. Ve a Supabase: https://supabase.com
2. Entra a tu proyecto
3. Ve a **"Table Editor"** → **"trades"**
4. Deberías ver una fila nueva con tu trade
5. Verifica que tenga datos:
   - `symbol`: EURUSD (o el que elegiste)
   - `side`: buy o sell
   - `price_open`: un número
   - `account_mode`: demo o live
6. ✅ Si ves esto, ¡el trade se guardó correctamente!

### Paso 4.4: Cerrar el trade y verificar

1. En MetaTrader 5, ve a la pestaña **"Trade"** (abajo)
2. Encuentra tu posición abierta
3. Haz clic derecho sobre ella
4. Elige **"Close Position"**
5. Confirma que quieres cerrar
6. Espera unos segundos
7. Ve a la pestaña **"Experts"** de nuevo
8. Deberías ver:
   - "Sending trade close: {...}"
   - "Trade close sent successfully. Ticket: 12345678"

### Paso 4.5: Verificar el cierre en la base de datos

1. Ve a Supabase → **Table Editor** → **trades**
2. Haz clic en tu trade
3. Deberías ver que ahora tiene:
   - `price_close`: un número
   - `closed_at`: una fecha
   - `pnl`: ganancia o pérdida
   - `result`: win, loss, o breakeven
   - `duration_seconds`: cuánto duró el trade
4. ✅ Si ves todo esto, ¡todo funciona perfectamente!

---

## 🎉 ¡FELICIDADES!

Si llegaste hasta aquí y todo funciona, ¡has instalado correctamente el sistema!

---

## ❓ Qué Hacer Si Algo No Funciona

### Problema: El EA no envía datos

**Solución:**
1. Verifica que las URLs estén permitidas en MT5 (Paso 3.4)
2. Verifica que la API_KEY sea la misma en Railway y en MT5
3. Verifica que la URL del backend esté correcta (debe tener `/api` al final)
4. Revisa los mensajes de error en la pestaña "Experts"

### Problema: Error 401 (Unauthorized)

**Solución:**
- La API_KEY no coincide
- Verifica que sea exactamente la misma en Railway (Variables) y en MT5 (parámetros del EA)

### Problema: Error 500 (Error del servidor)

**Solución:**
1. Ve a Railway → Deployments → haz clic en el último deployment → Logs
2. Lee los mensajes de error
3. Puede ser que DATABASE_URL esté mal
4. Puede ser que falte algún campo en la base de datos

### Problema: No se crea la tabla en Supabase

**Solución:**
1. Ve a SQL Editor en Supabase
2. Prueba ejecutar el SQL de nuevo
3. Si hay un error, cópialo y busca en Google qué significa
4. Puede ser que la tabla ya exista (intenta borrarla primero si quieres)

### Problema: Railway no construye el proyecto

**Solución:**
1. Verifica que el archivo `package.json` esté en la carpeta correcta
2. Verifica que todas las variables de entorno estén configuradas
3. Revisa los logs en Railway para ver el error específico

---

## 📝 Checklist Final

Antes de considerar que todo está listo, verifica:

- [ ] ✅ Tabla `trades` creada en Supabase
- [ ] ✅ RLS habilitado y política del service_role creada (Paso 1.6)
- [ ] ✅ Backend funcionando (probado con `/health`)
- [ ] ✅ Variables de entorno configuradas en Railway (PORT, API_KEY, DATABASE_URL, NODE_ENV)
- [ ] ✅ Expert Advisor compilado sin errores
- [ ] ✅ URLs permitidas configuradas en MT5
- [ ] ✅ EA agregado a un gráfico con parámetros correctos
- [ ] ✅ EA muestra "initialized" en los logs
- [ ] ✅ Trade de prueba se envía correctamente
- [ ] ✅ Trade aparece en la base de datos
- [ ] ✅ Al cerrar el trade, se actualiza en la base de datos

Si todos estos puntos tienen ✅, ¡todo está funcionando perfectamente!

---

## 🔐 Recordatorios Importantes

1. **API_KEY**: Guárdala bien, la necesitas en MT5 y en Railway
2. **DATABASE_URL**: Guárdala bien, es la conexión a tu base de datos
3. **URL del Backend**: Guárdala bien, la necesitas en MT5
4. **Contraseña de Supabase**: Guárdala bien, si la pierdes tendrás que cambiarla

---

## 📞 Próximos Pasos

Ahora que todo funciona:

1. Puedes abrir y cerrar trades normalmente en MT5
2. Se guardarán automáticamente en tu base de datos
3. Puedes verlos en Supabase → Table Editor → trades
4. Puedes integrar esto con tu frontend (lee `INTEGRACION_FRONTEND.md`)

---

**¡Éxito con tu sistema de registro automático! 🚀**

