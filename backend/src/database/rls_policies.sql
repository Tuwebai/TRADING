-- Row Level Security (RLS) Policies for trades table
-- Ejecutar este script después de crear la tabla trades

-- Habilitar RLS en la tabla trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir todo al service_role (backend/API)
-- El backend usa service_role para todas las operaciones
CREATE POLICY "Allow all operations for service_role"
ON trades
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política 2: Permitir lectura a usuarios autenticados
-- Útil si el frontend se conecta directamente a Supabase con autenticación
CREATE POLICY "Allow read for authenticated users"
ON trades
FOR SELECT
TO authenticated
USING (true);

-- Política 3: Permitir inserción para usuarios autenticados (opcional)
-- Solo si quieres que usuarios autenticados puedan insertar trades
-- CREATE POLICY "Allow insert for authenticated users"
-- ON trades
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (true);

-- Política 4: Permitir actualización para usuarios autenticados (opcional)
-- Solo si quieres que usuarios autenticados puedan actualizar trades
-- CREATE POLICY "Allow update for authenticated users"
-- ON trades
-- FOR UPDATE
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- NOTA: Las políticas 3 y 4 están comentadas porque normalmente
-- solo el backend (service_role) debería insertar/actualizar trades.
-- Si tu frontend necesita insertar/actualizar directamente, descomenta estas políticas.

-- Verificar políticas creadas
-- Puedes ejecutar esta query después para ver las políticas:
-- SELECT * FROM pg_policies WHERE tablename = 'trades';

