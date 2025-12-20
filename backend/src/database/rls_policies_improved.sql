-- Row Level Security (RLS) Policies - Improved Version
-- Ejecutar este script para mejorar la seguridad de las políticas RLS
-- 
-- IMPORTANTE: Estas políticas son más estrictas que las originales
-- Asegúrate de entender los cambios antes de aplicarlos

-- ============================================
-- TRADES TABLE
-- ============================================

-- Habilitar RLS en la tabla trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas si existen (opcional, comentar si no quieres eliminar)
-- DROP POLICY IF EXISTS "Allow all operations for service_role" ON trades;
-- DROP POLICY IF EXISTS "Allow read for authenticated users" ON trades;

-- Política 1: Service role tiene acceso completo (para Edge Functions y backend)
-- PERO: Las Edge Functions deben validar user_id antes de usar service role
CREATE POLICY "Service role full access with validation"
ON trades
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política 2: Usuarios autenticados solo pueden ver SUS PROPIOS trades
CREATE POLICY "Users can view own trades"
ON trades
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

-- Política 3: Usuarios autenticados solo pueden insertar trades con SU user_id
CREATE POLICY "Users can insert own trades"
ON trades
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política 4: Usuarios autenticados solo pueden actualizar SUS PROPIOS trades
CREATE POLICY "Users can update own trades"
ON trades
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política 5: Usuarios autenticados solo pueden eliminar SUS PROPIOS trades
CREATE POLICY "Users can delete own trades"
ON trades
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- BROKER_ACCOUNTS TABLE
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE broker_accounts ENABLE ROW LEVEL SECURITY;

-- Service role tiene acceso completo
CREATE POLICY IF NOT EXISTS "Service role full access" 
ON broker_accounts 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Usuarios solo pueden ver sus propias cuentas
CREATE POLICY IF NOT EXISTS "Users can view own accounts"
ON broker_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuarios solo pueden insertar cuentas con su propio user_id
CREATE POLICY IF NOT EXISTS "Users can insert own accounts"
ON broker_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuarios solo pueden actualizar sus propias cuentas
CREATE POLICY IF NOT EXISTS "Users can update own accounts"
ON broker_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Usuarios solo pueden eliminar sus propias cuentas
CREATE POLICY IF NOT EXISTS "Users can delete own accounts"
ON broker_accounts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. Las políticas de service_role permiten acceso completo, PERO:
--    - Las Edge Functions DEBEN validar user_id antes de usar service role
--    - Nunca usar service role sin validación de usuario cuando sea posible
--    - Service role solo debe usarse cuando es absolutamente necesario

-- 2. Las políticas de usuarios autenticados son estrictas:
--    - Solo pueden ver/modificar sus propios datos
--    - user_id IS NULL en SELECT permite ver trades sin usuario (para migración)

-- 3. Para aplicar estas políticas:
--    - Ejecuta este script en el SQL Editor de Supabase
--    - Verifica que las políticas se crearon: SELECT * FROM pg_policies WHERE tablename = 'trades';
--    - Prueba con diferentes usuarios para asegurar el aislamiento

-- 4. Si necesitas revertir:
--    - DROP POLICY "nombre_politica" ON tabla;
--    - O ejecuta el script original rls_policies.sql

