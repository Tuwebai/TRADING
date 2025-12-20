# 🔐 Edge Function: Encrypt Credentials

Esta Edge Function maneja la encriptación y desencriptación de credenciales de brokers (API keys y secrets).

## 🔒 Seguridad

- **Encriptación**: AES-256-GCM (Advanced Encryption Standard con Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV**: 12 bytes aleatorios por cada encriptación
- **Almacenamiento**: Las credenciales encriptadas se guardan en la base de datos
- **Acceso**: Solo usuarios autenticados pueden encriptar. Solo el backend puede desencriptar.

## 📋 Configuración

### 1. Generar Encryption Key

Ejecuta el script para generar una key de encriptación:

```bash
cd backend
node scripts/generate-encryption-key.js
```

Esto generará una key de 64 caracteres hexadecimales (32 bytes).

### 2. Configurar en Supabase

1. Ve a **Supabase Dashboard** → Tu proyecto
2. Ve a **Settings** → **Edge Functions** → **Secrets**
3. Click en **"Add new secret"**
4. **Name**: `ENCRYPTION_KEY`
5. **Value**: Pega la key generada (64 caracteres hex)
6. Click **"Save"**

### 3. (Opcional) Service Role Secret para Desencriptación

Si necesitas desencriptar desde el backend:

1. Genera otro secret para autenticación:
   ```bash
   node scripts/generate-api-key.js
   ```
2. Agrega como secret en Supabase:
   - **Name**: `SERVICE_ROLE_SECRET`
   - **Value**: (la key generada)

## 🚀 Uso

### Encriptar Credenciales (Frontend)

```typescript
const { data, error } = await supabase.functions.invoke('encrypt-credentials', {
  body: { 
    apiKey: 'tu-api-key',
    apiSecret: 'tu-api-secret' 
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

if (data?.success) {
  const encrypted = data.data;
  // encrypted.api_key_encrypted
  // encrypted.api_secret_encrypted
}
```

### Desencriptar Credenciales (Backend Only)

```typescript
const { data, error } = await supabase.functions.invoke('encrypt-credentials', {
  body: { 
    api_key_encrypted: '...',
    api_secret_encrypted: '...' 
  },
  headers: {
    'x-service-role': SERVICE_ROLE_SECRET,
  },
});

if (data?.success) {
  const decrypted = data.data;
  // decrypted.apiKey
  // decrypted.apiSecret
}
```

## 📡 Endpoints

### POST /encrypt
Encripta credenciales antes de guardarlas.

**Request:**
```json
{
  "apiKey": "tu-api-key",
  "apiSecret": "tu-api-secret"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "api_key_encrypted": "...",
    "api_secret_encrypted": "..."
  }
}
```

**Autenticación**: Requiere Bearer token de usuario autenticado

### POST /decrypt
Desencripta credenciales (solo para uso del backend).

**Request:**
```json
{
  "api_key_encrypted": "...",
  "api_secret_encrypted": "..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "...",
    "apiSecret": "..."
  }
}
```

**Autenticación**: Requiere `x-service-role` header con `SERVICE_ROLE_SECRET`

## ⚠️ Importante

- **Nunca** expongas credenciales desencriptadas en el frontend
- **Nunca** loguees credenciales (ni encriptadas ni desencriptadas)
- **Rota** la encryption key periódicamente
- **Usa** diferentes keys para desarrollo y producción
- **Mantén** la encryption key segura y nunca la commitees

## 🔄 Rotación de Keys

Si necesitas rotar la encryption key:

1. Genera nueva key
2. Desencripta todas las credenciales con la key antigua
3. Re-encripta con la nueva key
4. Actualiza el secret en Supabase
5. Elimina la key antigua

---

**Última actualización**: 2025-01-27

