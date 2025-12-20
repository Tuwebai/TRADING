# Variables de Entorno para Netlify

## Variables Requeridas

Para que la aplicación funcione correctamente en Netlify, necesitas configurar las siguientes variables de entorno en la configuración de Netlify:

### Variables de Supabase (Requeridas)

1. **VITE_SUPABASE_URL**
   - Descripción: URL de tu proyecto Supabase
   - Ejemplo: `https://xxxxx.supabase.co`
   - Dónde encontrarla: Dashboard de Supabase → Settings → API → Project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Descripción: Clave anónima pública de Supabase
   - Ejemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Dónde encontrarla: Dashboard de Supabase → Settings → API → Project API keys → `anon` `public`

### Variables Opcionales (Para funcionalidades avanzadas)

3. **VITE_ENCRYPTION_KEY** (Opcional)
   - Descripción: Clave de encriptación para credenciales de brokers
   - Solo necesaria si usas la función de encriptación de credenciales
   - Generar con: `node backend/scripts/generate-encryption-key.js`

4. **VITE_MT5_API_KEY** (Opcional)
   - Descripción: API key para autenticación con MT5 Expert Advisor
   - Solo necesaria si usas integración con MT5
   - Generar con: `node backend/scripts/generate-api-key.js`

## Cómo Configurar en Netlify

1. Ve a tu proyecto en Netlify Dashboard
2. Navega a **Site settings** → **Environment variables**
3. Agrega cada variable:
   - **Key**: El nombre de la variable (ej: `VITE_SUPABASE_URL`)
   - **Value**: El valor de la variable
   - **Scopes**: Selecciona "All scopes" o específicos según necesites

## Verificación

Después de configurar las variables:
1. Haz un nuevo deploy
2. Verifica que la aplicación carga correctamente
3. Revisa la consola del navegador para errores de configuración

## Notas Importantes

- Las variables que empiezan con `VITE_` son expuestas al frontend
- **NO** pongas la `SUPABASE_SERVICE_ROLE_KEY` como variable `VITE_` - es solo para backend
- Las variables se actualizan en el próximo deploy después de guardarlas

