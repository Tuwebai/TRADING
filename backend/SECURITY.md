# 🔒 Guía de Seguridad - Backend

## API Key Configuration

### Generar una API Key Segura

Para generar una API key segura, ejecuta:

```bash
node scripts/generate-api-key.js
```

O con una longitud personalizada:

```bash
node scripts/generate-api-key.js 64
```

### Configurar la API Key

1. **Genera la API key** usando el script anterior
2. **Copia la key generada**
3. **Agrega al archivo `.env`**:
   ```
   API_KEY=tu-api-key-generada-aqui
   ```
4. **Nunca commitees el archivo `.env`** a control de versiones

### Requisitos de Seguridad

- ✅ **Mínimo 32 caracteres**: La API key debe tener al menos 32 caracteres
- ✅ **Valor único**: No uses valores por defecto o de ejemplo
- ✅ **Diferentes keys**: Usa keys diferentes para desarrollo y producción
- ✅ **Rotación regular**: Cambia las keys periódicamente
- ✅ **Secreto**: Nunca expongas las keys en logs o mensajes de error

### Validación Automática

El servidor valida automáticamente:

1. **Presencia**: La variable `API_KEY` debe estar definida
2. **Longitud**: Debe tener al menos 32 caracteres
3. **Valor seguro**: No puede ser un valor por defecto o de ejemplo

Si alguna validación falla, el servidor **no iniciará** y mostrará un error claro.

### Uso en Requests

Incluye la API key en el header `x-api-key`:

```bash
curl -X POST http://localhost:3000/trades/open \
  -H "x-api-key: tu-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{"ticket": "123", ...}'
```

### Edge Function (Supabase)

Para el Edge Function, configura la variable de entorno `MT5_API_KEY` en Supabase:

1. Ve a **Project Settings** → **Edge Functions** → **Secrets**
2. Agrega `MT5_API_KEY` con tu key generada
3. El Edge Function validará automáticamente la key

### Troubleshooting

#### Error: "API_KEY environment variable is required"
- **Causa**: No has configurado la variable `API_KEY` en tu `.env`
- **Solución**: Genera una key y agrégalo a tu `.env`

#### Error: "API_KEY must be at least 32 characters long"
- **Causa**: La key es demasiado corta
- **Solución**: Genera una nueva key con al menos 32 caracteres

#### Error: "API_KEY cannot use default/example values"
- **Causa**: Estás usando un valor de ejemplo
- **Solución**: Genera una key única usando el script

### Comparación Segura contra Timing Attacks

El código usa comparación constante en tiempo (`crypto.timingSafeEqual`) para prevenir ataques de timing que podrían revelar información sobre la API key.

---

**Última actualización**: 2025-01-27

