# Supabase Edge Functions - MT5 Trade Logger

Esta es la versión del backend usando **Supabase Edge Functions** en lugar de un servidor Node.js separado.

## 🎯 Ventajas

- ✅ Todo en Supabase (base de datos + backend)
- ✅ No necesitas Railway/Render/Heroku
- ✅ Más simple de mantener
- ✅ Deploy con 1 click
- ✅ Gratis (tier generoso)

## 📁 Estructura

```
backend-supabase/
└── functions/
    └── trades/
        └── index.ts  # Edge Function principal
```

## 🚀 Setup Rápido

1. Ve a tu proyecto en Supabase Dashboard
2. Edge Functions → Create new function
3. Nombre: `trades`
4. Copia el código de `functions/trades/index.ts`
5. Configura las variables de entorno (Secrets):
   - `MT5_API_KEY`: Tu clave secreta
6. Deploy
7. Usa la URL de la función en tu EA de MT5

## 📚 Documentación Completa

Lee **GUIA_SUPABASE_BACKEND.md** para instrucciones detalladas paso a paso.

## 🔗 URL de la Función

Una vez deployada, tu función estará en:
```
https://tu-project-ref.supabase.co/functions/v1/trades
```

## 🔐 Variables de Entorno Necesarias

- `MT5_API_KEY`: Clave secreta para autenticación
- `SUPABASE_URL`: Se configura automáticamente
- `SUPABASE_SERVICE_ROLE_KEY`: Se configura automáticamente

