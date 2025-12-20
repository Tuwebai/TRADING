-- ============================================
-- SCHEMA COMPLETO PARA TRADING JOURNAL
-- Migración completa a Supabase
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: trades (ya existe, pero expandida)
-- ============================================

-- Agregar columnas adicionales para trades del frontend
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS frontend_id VARCHAR(255) UNIQUE, -- ID del frontend (para trades manuales)
ADD COLUMN IF NOT EXISTS asset VARCHAR(50), -- Mapeo de symbol
ADD COLUMN IF NOT EXISTS position_type VARCHAR(10) CHECK (position_type IN ('long', 'short')),
ADD COLUMN IF NOT EXISTS leverage DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS spread DECIMAL(18, 8),
ADD COLUMN IF NOT EXISTS swap_rate DECIMAL(18, 8),
ADD COLUMN IF NOT EXISTS swap_type VARCHAR(10) CHECK (swap_type IN ('long', 'short', 'both')),
ADD COLUMN IF NOT EXISTS session VARCHAR(20) CHECK (session IN ('asian', 'london', 'new-york', 'overlap', 'other')),
ADD COLUMN IF NOT EXISTS setup_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS pips DECIMAL(18, 4),
ADD COLUMN IF NOT EXISTS risk_pips DECIMAL(18, 4),
ADD COLUMN IF NOT EXISTS reward_pips DECIMAL(18, 4),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array de tags
ADD COLUMN IF NOT EXISTS screenshots TEXT[], -- URLs de screenshots
ADD COLUMN IF NOT EXISTS videos TEXT[], -- URLs de videos
ADD COLUMN IF NOT EXISTS journal JSONB, -- Journal completo como JSON
ADD COLUMN IF NOT EXISTS evaluated_rules JSONB, -- Reglas evaluadas
ADD COLUMN IF NOT EXISTS violated_rules JSONB, -- Reglas violadas
ADD COLUMN IF NOT EXISTS trade_classification VARCHAR(20) CHECK (trade_classification IN ('modelo', 'neutral', 'error')),
ADD COLUMN IF NOT EXISTS change_history JSONB; -- Historial de cambios

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_frontend_id ON trades(frontend_id);
CREATE INDEX IF NOT EXISTS idx_trades_setup_id ON trades(setup_id);
-- Nota: account_mode ya tiene índice en el schema original (idx_trades_account_mode)

-- ============================================
-- TABLA: users (perfil de usuario en schema público)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(id),
    UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Trigger para crear automáticamente un registro en users cuando se crea en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
CREATE TRIGGER update_users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- RLS Policies para users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Service role puede acceder a users (para el trigger)
DROP POLICY IF EXISTS "Service role full access" ON users;
CREATE POLICY "Service role full access" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TABLA: mt5_accounts (asociación de cuentas MT5 con usuarios)
-- ============================================
CREATE TABLE IF NOT EXISTS mt5_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificadores de la cuenta MT5
    broker VARCHAR(255) NOT NULL,
    account_mode VARCHAR(20) NOT NULL CHECK (account_mode IN ('simulation', 'demo', 'live')),
    account_number VARCHAR(100), -- Número de cuenta MT5 (opcional)
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Una cuenta MT5 (broker + account_mode) solo puede estar asociada a un usuario
    UNIQUE(broker, account_mode, account_number)
);

CREATE INDEX IF NOT EXISTS idx_mt5_accounts_user_id ON mt5_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_broker_mode ON mt5_accounts(broker, account_mode);
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_active ON mt5_accounts(is_active) WHERE is_active = true;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_mt5_accounts_updated_at ON mt5_accounts;
CREATE TRIGGER update_mt5_accounts_updated_at
    BEFORE UPDATE ON mt5_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies para mt5_accounts
ALTER TABLE mt5_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own MT5 accounts" ON mt5_accounts;
CREATE POLICY "Users can view own MT5 accounts" ON mt5_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own MT5 accounts" ON mt5_accounts;
CREATE POLICY "Users can insert own MT5 accounts" ON mt5_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own MT5 accounts" ON mt5_accounts;
CREATE POLICY "Users can update own MT5 accounts" ON mt5_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own MT5 accounts" ON mt5_accounts;
CREATE POLICY "Users can delete own MT5 accounts" ON mt5_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role puede acceder a mt5_accounts (para el backend)
DROP POLICY IF EXISTS "Service role full access" ON mt5_accounts;
CREATE POLICY "Service role full access" ON mt5_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON broker_accounts;
CREATE POLICY "Service role full access" ON broker_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TABLA: broker_accounts (cuentas de broker con diferentes tipos de integración)
-- ============================================
CREATE TABLE IF NOT EXISTS broker_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificación del broker
    broker VARCHAR(255) NOT NULL, -- Nombre del broker (ej: "MetaTrader 5", "Binance", "Interactive Brokers")
    platform VARCHAR(50), -- Plataforma específica (ej: "MT4", "MT5", "cTrader", "TWS")
    account_number VARCHAR(100), -- Número de cuenta del broker
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('demo', 'live', 'simulation')),
    
    -- Tipo de integración
    integration_type VARCHAR(20) NOT NULL CHECK (integration_type IN ('ea', 'api', 'manual')),
    
    -- Estado de la conexión
    status VARCHAR(30) NOT NULL DEFAULT 'pending_verification' 
        CHECK (status IN ('connected', 'pending_verification', 'manual_only', 'error', 'disconnected')),
    
    -- Credenciales (encriptadas en backend, nunca se muestran en frontend)
    api_key_encrypted TEXT, -- API Key encriptada (solo para integration_type = 'api')
    api_secret_encrypted TEXT, -- API Secret encriptada (solo para integration_type = 'api')
    
    -- Metadata adicional
    alias VARCHAR(255), -- Nombre personalizado para la cuenta
    error_message TEXT, -- Mensaje de error si status = 'error'
    last_sync_at TIMESTAMP WITH TIME ZONE, -- Última sincronización exitosa
    verification_token TEXT, -- Token para verificación (EA-based)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un usuario no puede tener la misma cuenta duplicada
    UNIQUE(user_id, broker, platform, account_number, account_type)
);

CREATE INDEX IF NOT EXISTS idx_broker_accounts_user_id ON broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_broker ON broker_accounts(broker);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_status ON broker_accounts(status);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_integration_type ON broker_accounts(integration_type);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_active ON broker_accounts(user_id, status) WHERE status IN ('connected', 'pending_verification');

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_broker_accounts_updated_at ON broker_accounts;
CREATE TRIGGER update_broker_accounts_updated_at
    BEFORE UPDATE ON broker_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies para broker_accounts
ALTER TABLE broker_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own broker accounts" ON broker_accounts;
CREATE POLICY "Users can view own broker accounts" ON broker_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own broker accounts" ON broker_accounts;
CREATE POLICY "Users can insert own broker accounts" ON broker_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own broker accounts" ON broker_accounts;
CREATE POLICY "Users can update own broker accounts" ON broker_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own broker accounts" ON broker_accounts;
CREATE POLICY "Users can delete own broker accounts" ON broker_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role puede acceder a broker_accounts (para el backend)
DROP POLICY IF EXISTS "Service role full access" ON broker_accounts;
CREATE POLICY "Service role full access" ON broker_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TABLA: settings
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic settings
    account_size DECIMAL(18, 2) DEFAULT 10000,
    base_currency VARCHAR(10) DEFAULT 'USD',
    risk_per_trade DECIMAL(5, 2) DEFAULT 1.0,
    current_capital DECIMAL(18, 2),
    initial_capital DECIMAL(18, 2),
    manual_capital_adjustment BOOLEAN DEFAULT false,
    
    -- Theme
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'high-contrast', 'trading-terminal', 'custom')),
    custom_theme JSONB, -- ThemeConfig como JSON
    
    -- Advanced settings (JSONB para flexibilidad)
    advanced_settings JSONB,
    
    -- Trading rules (JSONB)
    trading_rules JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON user_settings(user_id);

-- ============================================
-- TABLA: trading_goals
-- ============================================
CREATE TABLE IF NOT EXISTS trading_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
    type VARCHAR(50) NOT NULL, -- GoalType
    target DECIMAL(18, 2) NOT NULL,
    current DECIMAL(18, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    
    -- Advanced features
    is_primary BOOLEAN DEFAULT false,
    is_binding BOOLEAN DEFAULT false,
    constraint_type VARCHAR(50),
    constraint_config JSONB,
    consequences JSONB,
    
    -- Tracking
    failed_at TIMESTAMP WITH TIME ZONE,
    last_failed_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    generated_insight_ids TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON trading_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_period ON trading_goals(period);
CREATE INDEX IF NOT EXISTS idx_goals_dates ON trading_goals(start_date, end_date);

-- ============================================
-- TABLA: routines
-- ============================================
CREATE TABLE IF NOT EXISTS routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    type VARCHAR(20) NOT NULL CHECK (type IN ('morning', 'pre-market', 'pre-trade', 'post-trade', 'end-of-day')),
    items JSONB NOT NULL, -- Array de RoutineItem
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_type ON routines(type);

-- ============================================
-- TABLA: routine_executions
-- ============================================
CREATE TABLE IF NOT EXISTS routine_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    date DATE NOT NULL, -- YYYY-MM-DD
    blocks JSONB NOT NULL, -- DailyRoutineExecution.blocks
    end_of_day JSONB NOT NULL, -- DailyRoutineExecution.endOfDay
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_routine_executions_user_id ON routine_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_executions_date ON routine_executions(date);

-- ============================================
-- TABLA: trade_templates
-- ============================================
CREATE TABLE IF NOT EXISTS trade_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    form_data JSONB NOT NULL, -- TradeFormData como JSON
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON trade_templates(user_id);

-- ============================================
-- TABLA: trading_setups
-- ============================================
CREATE TABLE IF NOT EXISTS trading_setups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    image_url TEXT,
    rules TEXT[],
    entry_criteria TEXT,
    exit_criteria TEXT,
    risk_management TEXT,
    tags TEXT[],
    stats JSONB, -- Stats como JSON
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setups_user_id ON trading_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_setups_category ON trading_setups(category);

-- ============================================
-- TABLA: goal_insights
-- ============================================
CREATE TABLE IF NOT EXISTS goal_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES trading_goals(id) ON DELETE CASCADE,
    
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_insights_user_id ON goal_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_insights_goal_id ON goal_insights(goal_id);

-- ============================================
-- TABLA: goal_postmortems
-- ============================================
CREATE TABLE IF NOT EXISTS goal_postmortems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES trading_goals(id) ON DELETE CASCADE,
    
    failure_date DATE NOT NULL,
    analysis TEXT NOT NULL,
    root_causes TEXT[],
    action_items TEXT[],
    data JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postmortems_user_id ON goal_postmortems(user_id);
CREATE INDEX IF NOT EXISTS idx_postmortems_goal_id ON goal_postmortems(goal_id);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
-- Eliminar triggers existentes antes de crearlos (idempotente)
DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
CREATE TRIGGER update_trades_updated_at 
    BEFORE UPDATE ON trades 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON user_settings;
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON trading_goals;
CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON trading_goals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routines_updated_at ON routines;
CREATE TRIGGER update_routines_updated_at 
    BEFORE UPDATE ON routines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routine_executions_updated_at ON routine_executions;
CREATE TRIGGER update_routine_executions_updated_at 
    BEFORE UPDATE ON routine_executions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON trade_templates;
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON trade_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_setups_updated_at ON trading_setups;
CREATE TRIGGER update_setups_updated_at 
    BEFORE UPDATE ON trading_setups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_postmortems_updated_at ON goal_postmortems;
CREATE TRIGGER update_postmortems_updated_at 
    BEFORE UPDATE ON goal_postmortems 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt5_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_postmortems ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (backend)
-- Eliminar políticas existentes antes de crearlas (idempotente)
DROP POLICY IF EXISTS "Service role full access" ON trades;
CREATE POLICY "Service role full access" ON trades FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON user_settings;
CREATE POLICY "Service role full access" ON user_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON trading_goals;
CREATE POLICY "Service role full access" ON trading_goals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON routines;
CREATE POLICY "Service role full access" ON routines FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON routine_executions;
CREATE POLICY "Service role full access" ON routine_executions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON trade_templates;
CREATE POLICY "Service role full access" ON trade_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON trading_setups;
CREATE POLICY "Service role full access" ON trading_setups FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON goal_insights;
CREATE POLICY "Service role full access" ON goal_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON goal_postmortems;
CREATE POLICY "Service role full access" ON goal_postmortems FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Políticas para usuarios autenticados (cada usuario solo ve sus datos)
-- Eliminar políticas existentes antes de crearlas (idempotente)
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
-- Permitir ver trades propios O trades sin user_id (trades de MT5 que aún no están asociados)
-- La verificación de cuentas MT5 asociadas se hace en la aplicación, no en RLS
CREATE POLICY "Users can view own trades" ON trades FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
CREATE POLICY "Users can insert own trades" ON trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trades" ON trades;
CREATE POLICY "Users can update own trades" ON trades FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
CREATE POLICY "Users can delete own trades" ON trades FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own goals" ON trading_goals;
CREATE POLICY "Users can manage own goals" ON trading_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own routines" ON routines;
CREATE POLICY "Users can manage own routines" ON routines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own routine executions" ON routine_executions;
CREATE POLICY "Users can manage own routine executions" ON routine_executions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own templates" ON trade_templates;
CREATE POLICY "Users can manage own templates" ON trade_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own setups" ON trading_setups;
CREATE POLICY "Users can manage own setups" ON trading_setups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own goal insights" ON goal_insights;
CREATE POLICY "Users can manage own goal insights" ON goal_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own goal postmortems" ON goal_postmortems;
CREATE POLICY "Users can manage own goal postmortems" ON goal_postmortems FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE users IS 'Perfiles de usuario en schema público (sincronizado con auth.users)';
COMMENT ON FUNCTION handle_new_user() IS 'Trigger function que crea automáticamente un perfil en public.users cuando se crea un usuario en auth.users';

-- Política para anon (lectura pública de trades de MT5 - solo lectura)
DROP POLICY IF EXISTS "Anon can read MT5 trades" ON trades;
CREATE POLICY "Anon can read MT5 trades" ON trades FOR SELECT TO anon USING (user_id IS NULL);

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE trades IS 'Stores all trades - from MT5 and manual entries';
COMMENT ON TABLE user_settings IS 'User-specific settings and preferences';
COMMENT ON TABLE trading_goals IS 'Trading goals and objectives';
COMMENT ON TABLE routines IS 'Trading routine checklists';
COMMENT ON TABLE routine_executions IS 'Daily routine execution records';
COMMENT ON TABLE trade_templates IS 'Templates for quick trade creation';
COMMENT ON TABLE trading_setups IS 'Trading setup definitions';
COMMENT ON TABLE goal_insights IS 'Insights generated from goals';
COMMENT ON TABLE goal_postmortems IS 'Post-mortem analysis of failed goals';

