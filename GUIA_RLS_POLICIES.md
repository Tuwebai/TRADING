# 🔒 Configurar Row Level Security (RLS) en Supabase

## ¿Qué es RLS?

Row Level Security (RLS) es una función de seguridad de Supabase que controla quién puede ver, insertar, actualizar o eliminar datos en tu tabla.

## 🎯 Para tu caso específico

Como tu backend se conecta usando `service_role`, necesitas permitir que ese rol pueda hacer todas las operaciones.

---

## 📝 Pasos para Configurar RLS

### Paso 1: Habilitar RLS en la Tabla

1. Ve a Supabase: https://supabase.com
2. Entra a tu proyecto
3. Ve a **"Table Editor"** (en el menú izquierdo)
4. Haz clic en la tabla **"trades"**
5. Verás un botón rojo que dice **"RLS disabled"** (arriba, a la derecha)
6. Haz clic en ese botón
7. En el popup que aparece, haz clic en **"Enable RLS for this table"**
8. ✅ El botón ahora debería cambiar a verde y decir **"RLS enabled"**

### Paso 2: Crear las Políticas

1. En Supabase, ve a **"SQL Editor"** (en el menú izquierdo)
2. Haz clic en **"New query"**
3. Copia y pega este código SQL:

```sql
-- Política 1: Permitir todo al service_role (backend/API)
CREATE POLICY "Allow all operations for service_role"
ON trades
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

4. Haz clic en **"Run"** (botón verde)
5. Deberías ver: "Success. No rows returned"

### Paso 3: Verificar que Funciona

1. Prueba hacer una operación desde tu backend (abrir un trade desde MT5)
2. El trade debería guardarse correctamente
3. Ve a **"Table Editor"** → **"trades"**
4. Deberías ver el trade guardado
5. ✅ Si funciona, las políticas están configuradas correctamente

---

## 🔍 ¿Qué Hace Esta Política?

La política que creamos dice:
- **"Allow all operations for service_role"**: Permite todas las operaciones (INSERT, SELECT, UPDATE, DELETE)
- **TO service_role**: Solo para el rol service_role (que es el que usa tu backend)
- **USING (true)**: Permite leer cualquier fila
- **WITH CHECK (true)**: Permite escribir cualquier fila

---

## ⚠️ Opciones Adicionales (Opcional)

Si en el futuro quieres que tu frontend también lea datos directamente desde Supabase (sin pasar por el backend), puedes agregar esta política adicional:

```sql
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Allow read for authenticated users"
ON trades
FOR SELECT
TO authenticated
USING (true);
```

**Pero por ahora NO necesitas esto**, porque tu frontend lee datos a través del backend.

---

## ❓ ¿Qué Pasa Si No Configuro RLS?

Si habilitas RLS pero NO creas políticas:
- ❌ Tu backend NO podrá insertar trades (error 403)
- ❌ No podrás ver los trades en Table Editor
- ❌ Nada funcionará

**Por eso es importante crear al menos la política del service_role.**

---

## ✅ Checklist

- [ ] RLS habilitado en la tabla trades (botón verde)
- [ ] Política del service_role creada
- [ ] Probado que el backend puede insertar trades
- [ ] Verificado que los trades aparecen en Table Editor

---

## 🆘 Si Algo No Funciona

**Error: "permission denied for table trades"**
- Verifica que RLS esté habilitado
- Verifica que la política del service_role esté creada
- Verifica que tu backend use service_role (en DATABASE_URL)

**No puedo ver trades en Table Editor**
- Esto es normal si solo tienes la política del service_role
- Los trades están ahí, pero RLS los oculta de usuarios sin permisos
- Puedes verlos desde tu backend o usando service_role

**El backend no puede insertar**
- Verifica que la política esté creada correctamente
- Verifica que tu DATABASE_URL use service_role (debe tener la contraseña del service_role)

---

¡Listo! Con esto tu tabla está protegida correctamente. 🔐

