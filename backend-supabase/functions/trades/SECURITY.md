# 🔒 Guía de Seguridad - Edge Function Trades

## Validación de Usuario

### Requisitos de Autenticación

Todos los endpoints (excepto `/health`) requieren autenticación:

1. **Autenticación de Usuario** (Recomendado):
   - Header: `Authorization: Bearer <user_token>`
   - El token se valida y se extrae el `user_id`
   - Los trades se asocian automáticamente con el usuario

2. **Autenticación por API Key** (Para MT5):
   - Header: `x-api-key: <MT5_API_KEY>`
   - Se intenta encontrar `user_id` desde la asociación de broker account
   - Si no se encuentra, el trade se crea sin `user_id` (se loguea warning)

### Validación de user_id

- ✅ **Siempre se intenta obtener** `user_id` de la autenticación
- ✅ **Se valida** que el usuario existe antes de asociar trades
- ✅ **Se filtra** por `user_id` en queries GET cuando está disponible
- ⚠️ **Se loguea warning** si se crea trade sin `user_id`

## Service Role Key

### Uso Seguro

El service role key se usa en Edge Functions, pero con validaciones:

1. **Validación de Usuario Primero**:
   ```typescript
   // Siempre intentar obtener user_id del token primero
   const { data: { user } } = await authClient.auth.getUser(token);
   if (user) {
     userId = user.id; // Usar este user_id
   }
   ```

2. **Service Role Solo Cuando Es Necesario**:
   - Se usa para operaciones que requieren permisos elevados
   - Siempre se valida `user_id` antes de usar service role
   - Se filtra por `user_id` en queries cuando está disponible

3. **Nunca Exponer Service Role Key**:
   - ✅ Solo se usa en Edge Functions (server-side)
   - ✅ Nunca se expone al frontend
   - ✅ Se almacena en Supabase Secrets
   - ✅ Se rota periódicamente

## RLS Policies

### Políticas Implementadas

1. **Service Role**: Acceso completo (para Edge Functions)
2. **Usuarios Autenticados**: Solo sus propios datos
3. **Validación en Código**: Siempre validar `user_id` antes de operaciones

### Mejores Prácticas

- ✅ **Siempre filtrar por `user_id`** en queries cuando sea posible
- ✅ **Validar `user_id`** antes de insertar/actualizar
- ✅ **Usar RLS como capa adicional**, no como única protección
- ⚠️ **No confiar solo en RLS** - validar en código también

## Endpoints y Validación

### POST /trades/open
- ✅ Valida autenticación (usuario o API key)
- ✅ Intenta obtener `user_id` del token o broker account
- ✅ Asocia trade con `user_id` si está disponible
- ⚠️ Loguea warning si no hay `user_id`

### POST /trades/close
- ✅ Valida autenticación
- ✅ Usa `user_id` para filtrar trades si está disponible
- ✅ Actualiza solo trades del usuario (si `user_id` presente)

### POST /trades/update-pnl
- ✅ Valida autenticación
- ✅ Filtra por `user_id` si está disponible

### GET /trades
- ✅ **Requiere autenticación** (usuario o API key)
- ✅ **Filtra por `user_id`** si el usuario está autenticado
- ⚠️ Sin `user_id`, retorna todos los trades (solo para API key auth)

## Monitoreo y Logging

### Eventos a Monitorear

1. **Trades sin user_id**:
   - Indica que broker account no está configurado
   - Se loguea como warning

2. **Fallos de autenticación**:
   - Se loguean para detectar intentos no autorizados

3. **Queries sin filtro de user_id**:
   - Se loguean cuando se usan sin `user_id` (solo API key auth)

## Rotación de Keys

### Service Role Key

1. **Generar nueva key** en Supabase Dashboard
2. **Actualizar** en Supabase Secrets
3. **Actualizar** en Edge Functions environment
4. **Verificar** que todo funciona
5. **Eliminar** key antigua

### MT5_API_KEY

1. **Generar nueva key**: `node scripts/generate-api-key.js`
2. **Actualizar** en Supabase Secrets
3. **Actualizar** en MT5 Expert Advisor
4. **Verificar** que MT5 puede conectarse
5. **Eliminar** key antigua

## Checklist de Seguridad

- [ ] Service role key solo en Edge Functions (nunca en frontend)
- [ ] Validación de usuario en todos los endpoints
- [ ] Filtrado por `user_id` cuando está disponible
- [ ] RLS policies habilitadas y configuradas
- [ ] Logging de eventos de seguridad
- [ ] Rotación periódica de keys
- [ ] Monitoreo de trades sin `user_id`
- [ ] Validación de autenticación en cada request

---

**Última actualización**: 2025-01-27

