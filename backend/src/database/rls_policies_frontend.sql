-- Row Level Security (RLS) Policies for frontend access
-- Permite que el frontend lea trades usando la anon key

-- Política para permitir lectura pública (anon key)
-- Esto permite que el frontend lea trades sin autenticación
CREATE POLICY "Allow read for anon users"
ON trades
FOR SELECT
TO anon
USING (true);

-- Si quieres que solo usuarios autenticados puedan leer, usa esta en su lugar:
-- CREATE POLICY "Allow read for authenticated users"
-- ON trades
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- NOTA: Esta política permite que CUALQUIERA con la anon key lea los trades.
-- Si tus trades contienen información sensible, considera usar autenticación
-- en su lugar y usar la política de "authenticated users".

