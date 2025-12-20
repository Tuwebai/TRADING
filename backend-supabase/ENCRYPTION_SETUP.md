# 🔐 Configuración de Encriptación de Credenciales

Esta guía explica cómo configurar el sistema de encriptación para las credenciales de brokers.

## 📋 Requisitos Previos

- Proyecto Supabase configurado
- Acceso al dashboard de Supabase
- Node.js instalado (para generar keys)

## 🚀 Pasos de Configuración

### 1. Generar Encryption Key

Ejecuta el script para generar una key de encriptación segura:

```bash
cd backend
node scripts/generate-encryption-key.js
```

Esto generará una key de 64 caracteres hexadecimales (32 bytes para AES-256).

**Ejemplo de output:**
```
✅ Generated Encryption Key (32 bytes / 256 bits):
────────────────────────────────────────────────────────────
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
────────────────────────────────────────────────────────────
```

### 2. Configurar en Supabase

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto
   - Navega a **Settings** → **Edge Functions** → **Secrets**

2. **Agrega el Secret**
   - Click en **"Add new secret"**
   - **Name**: `ENCRYPTION_KEY`
   - **Value**: Pega la key generada (64 caracteres hex)
   - Click **"Save"**

3. **Verifica**
   - El secret debe aparecer en la lista
   - **Nunca** compartas o expongas este secret

### 3. (Opcional) Service Role Secret

Si necesitas desencriptar credenciales desde el backend:

1. **Genera un Service Role Secret:**
   ```bash
   node scripts/generate-api-key.js
   ```

2. **Agrega como Secret en Supabase:**
   - **Name**: `SERVICE_ROLE_SECRET`
   - **Value**: (la key generada)
   - Click **"Save"**

## 🔄 Desplegar Edge Function

### Opción 1: Usando Supabase CLI

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Link tu proyecto
supabase link --project-ref tu-project-ref

# Desplegar la función
supabase functions deploy encrypt-credentials
```

### Opción 2: Desde Dashboard

1. Ve a **Edge Functions** en el dashboard
2. Click **"Create a new function"**
3. Nombre: `encrypt-credentials`
4. Copia el contenido de `backend-supabase/functions/encrypt-credentials/index.ts`
5. Click **"Deploy"**

## ✅ Verificar Configuración

### Test de Encriptación

Puedes probar la función usando curl o desde el frontend:

```typescript
// Desde el frontend (después de autenticarte)
const { data, error } = await supabase.functions.invoke('encrypt-credentials', {
  body: { 
    apiKey: 'test-key',
    apiSecret: 'test-secret' 
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

console.log(data); // Debe mostrar credenciales encriptadas
```

## 🔒 Seguridad

### ✅ Buenas Prácticas

- ✅ **Nunca** commitees la encryption key
- ✅ **Usa** diferentes keys para desarrollo y producción
- ✅ **Rota** la key periódicamente (cada 6-12 meses)
- ✅ **Mantén** la key en Supabase Secrets, nunca en código
- ✅ **Nunca** loguees credenciales (ni encriptadas ni desencriptadas)
- ✅ **Nunca** expongas credenciales desencriptadas en el frontend

### ⚠️ Advertencias

- ⚠️ Si la encryption key se pierde, **no podrás** desencriptar credenciales existentes
- ⚠️ Si la encryption key se compromete, **debes** rotarla inmediatamente
- ⚠️ **No** uses la misma key para múltiples proyectos
- ⚠️ **No** compartas la key con nadie

## 🔄 Rotación de Keys

Si necesitas rotar la encryption key:

1. **Genera nueva key:**
   ```bash
   node scripts/generate-encryption-key.js
   ```

2. **Desencripta todas las credenciales** con la key antigua (usando endpoint `/decrypt`)

3. **Re-encripta** con la nueva key (usando endpoint `/encrypt`)

4. **Actualiza** el secret en Supabase con la nueva key

5. **Elimina** la key antigua del secret

**Nota**: Este proceso requiere acceso al backend y debe hacerse durante mantenimiento programado.

## 📚 Documentación Adicional

- Ver `backend-supabase/functions/encrypt-credentials/README.md` para detalles técnicos
- Ver `backend/scripts/generate-encryption-key.js` para el script de generación

---

**Última actualización**: 2025-01-27

