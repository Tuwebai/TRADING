/**
 * Core type definitions for the Trading Log System
 * All models and interfaces are defined here for type safety and consistency
 */

export type PositionType = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type RoutineType = 'morning' | 'pre-market' | 'pre-trade' | 'post-trade' | 'end-of-day';
export type EmotionType = 'confiado' | 'ansioso' | 'temeroso' | 'emocionado' | 'neutral' | 'frustrado' | 'euforico' | 'deprimido';
export type TradingSession = 'asian' | 'london' | 'new-york' | 'overlap' | 'other';

/**
 * Journal entries for a trade
 */
export interface TradeJournal {
  preTrade: {
    technicalAnalysis: string;
    marketSentiment: string;
    entryReasons: string;
    emotion: EmotionType | null;
  };
  duringTrade: {
    marketChanges: string;
    stopLossAdjustments: string;
    takeProfitAdjustments: string;
    emotion: EmotionType | null;
  };
  postTrade: {
    whatWentWell: string;
    whatWentWrong: string;
    lessonsLearned: string;
    emotion: EmotionType | null;
  };
}

/**
 * Trading Setup definition
 */
export interface TradingSetup {
  id: string;
  name: string;
  description: string;
  category: string; // e.g., "breakout", "reversal", "trend-following"
  imageUrl?: string; // Screenshot or diagram
  rules: string[]; // Setup rules/conditions
  entryCriteria: string;
  exitCriteria: string;
  riskManagement: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalTrades: number;
    winRate: number;
    avgPnl: number;
    profitFactor: number;
  };
}

/**
 * Trade model - represents a single trading position
 */
export interface Trade {
  id: string;
  asset: string;
  positionType: PositionType;
  entryPrice: number;
  exitPrice: number | null;
  positionSize: number;
  leverage: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryDate: string; // ISO date string
  exitDate: string | null; // ISO date string
  notes: string; // Legacy - mantener para compatibilidad
  screenshots: string[]; // URLs or base64 encoded images
  videos: string[]; // URLs to video recordings
  tags: string[]; // Custom tags (e.g., "breakout", "reversal", "news", "FOMO")
  journal: TradeJournal;
  status: TradeStatus;
  pnl: number | null; // Auto-calculated
  riskReward: number | null; // Auto-calculated
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  changeHistory?: TradeChange[]; // Historial de cambios
  // Trading-specific fields
  commission?: number; // Commission paid
  spread?: number; // Spread cost
  swap?: number | null; // Swap/rollover cost
  swapRate?: number; // Swap rate in pips (for calculation)
  swapType?: 'long' | 'short' | 'both'; // Which positions pay swap
  session?: TradingSession; // Trading session
  setupId?: string; // Reference to setup used
  pips?: number; // Pips gained/lost (for forex)
  riskPips?: number; // Risk in pips
  rewardPips?: number; // Reward in pips
  // Rule evaluation fields
  evaluatedRules?: EvaluatedRule[]; // All rules evaluated for this trade
  violatedRules?: ViolatedRule[]; // Rules that were violated
  tradeClassification?: 'modelo' | 'neutral' | 'error'; // Trade classification
}

/**
 * Trade change history entry
 */
export interface TradeChange {
  id: string;
  timestamp: string; // ISO date string
  field: string; // Campo modificado
  oldValue: any;
  newValue: any;
  changedBy?: string; // Usuario que hizo el cambio (futuro)
}

/**
 * Evaluated rule for a trade
 */
export interface EvaluatedRule {
  id: string;
  ruleName: string;
  ruleKey: string; // e.g., 'maxTradesPerDay', 'riskPerTrade'
  respected: boolean;
  expectedValue?: string | number;
  actualValue?: string | number;
  severity?: 'critical' | 'minor';
}

/**
 * Violated rule for a trade
 */
export interface ViolatedRule {
  id: string;
  ruleName: string;
  ruleKey: string;
  expectedValue: string | number;
  actualValue: string | number;
  severity: 'critical' | 'minor';
  message: string;
}

/**
 * Trade template for quick creation
 */
export interface TradeTemplate {
  id: string;
  name: string;
  description?: string;
  formData: TradeFormData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Routine checklist item
 */
export interface RoutineItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  note?: string; // Nota corta opcional
}

/**
 * Daily routine execution state
 */
export type RoutineBlockStatus = 'pending' | 'completed' | 'incomplete' | 'skipped';

/**
 * Daily routine execution record
 */
export interface DailyRoutineExecution {
  date: string; // ISO date string (YYYY-MM-DD)
  blocks: {
    [key in RoutineType]: {
      status: RoutineBlockStatus;
      completedAt: string | null; // ISO timestamp
      skippedAt: string | null; // ISO timestamp
      skipReason: string | null; // Motivo obligatorio si se salta
      itemCompletions: Record<string, {
        completed: boolean;
        completedAt: string | null;
        note?: string;
      }>;
    };
  };
  endOfDay: {
    marked: boolean;
    markedAt: string | null;
    isValid: boolean | null; // null = no marcado, true = válido, false = inválido
    justification: string | null; // Obligatorio si inválido
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Post-trade structured data
 */
export interface PostTradeData {
  respectedPlan: boolean; // ¿Respetaste el plan?
  brokenRule: string | null; // Regla rota (si aplica)
  emotionalState: EmotionType | null;
  learning: string; // 1 aprendizaje obligatorio
  completedAt: string; // ISO timestamp
}

/**
 * Routine checklist group
 */
export interface Routine {
  id: string;
  type: RoutineType;
  items: RoutineItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  destructive: string;
  border: string;
  profitColor: string; // Color para ganancias
  lossColor: string; // Color para pérdidas
}

/**
 * Predefined theme names
 */
export type ThemeName = 'light' | 'dark' | 'high-contrast' | 'trading-terminal' | 'custom';

/**
 * Trading rules configuration
 */
export interface TradingRules {
  maxTradesPerDay: number | null; // null = sin límite
  maxTradesPerWeek: number | null;
  allowedTradingHours: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number; // 0-23
  };
  maxLotSize: number | null; // null = sin límite
  dailyProfitTarget: number | null; // null = sin objetivo
  dailyLossLimit: number | null; // null = sin límite
  psychologicalRules: string[]; // Array de reglas personalizadas
}

/**
 * Risk management configuration
 */
export interface RiskManagementConfig {
  maxRiskPerTrade: number | null; // % máximo por trade
  maxRiskDaily: number | null; // % máximo diario
  maxRiskWeekly: number | null; // % máximo semanal
  maxDrawdown: number | null; // % máximo de drawdown permitido
  drawdownMode: 'warning' | 'partial-block' | 'hard-stop'; // Modo de acción ante drawdown
}

/**
 * Discipline and behavior configuration
 */
export interface DisciplineConfig {
  cooldownAfterLoss: number | null; // Minutos de cooldown después de pérdida
  maxTradesConsecutiveLoss: number | null; // Máx trades consecutivos en pérdida
  forceSessionCloseOnCriticalRule: boolean; // Forzar cierre de sesión si se rompe regla crítica
  persistentWarnings: boolean; // Activar/desactivar warnings persistentes
}

/**
 * UI and visualization configuration
 */
export interface UIConfig {
  strictRiskMode: boolean; // Modo estricto de riesgo (UI más sobria)
  attenuateMetricsOnDrawdown: boolean; // Atenuar métricas positivas si hay drawdown crítico
  showOnlySurvivalMetrics: boolean; // Mostrar solo métricas de supervivencia si riesgo > límite
  enableAnimations: boolean; // Activar/desactivar animaciones
  showGlobalRiskPanel: boolean; // Mostrar u ocultar panel de riesgo global
}

/**
 * Insights and alerts configuration
 */
export interface InsightsConfig {
  autoInsightsEnabled: boolean; // Activar/desactivar insights automáticos
  severityLevel: 'critical' | 'important' | 'positive' | 'all'; // Nivel de severidad mostrado
  maxVisibleInsights: number; // Máx insights visibles simultáneamente
  updateFrequency: 'realtime' | 'daily' | 'weekly'; // Frecuencia de actualización
  allowBlockInsights: boolean; // Permitir bloquear insights irrelevantes
  blockedInsightIds: string[]; // IDs de insights bloqueados
}

/**
 * Rule engine configuration
 */
export interface RuleEngineConfig {
  enabled: boolean; // Activar/desactivar motor de reglas
  rules: {
    id: string;
    name: string;
    enabled: boolean;
    severity: 'info' | 'warning' | 'block'; // Severidad de la regla
    condition?: string; // Condición personalizada (ej: "if drawdown > X → reducir riesgo")
  }[];
}

/**
 * Trading sessions configuration
 */
export interface SessionsConfig {
  timezone: string; // Zona horaria del trader (ej: "America/New_York")
  allowedSessions: {
    asian: boolean;
    london: boolean;
    'new-york': boolean;
    overlap: boolean;
    other: boolean;
  };
  allowedDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  blockTradingOutsideSession: boolean; // Bloquear trading fuera de sesión
}

/**
 * Advanced settings
 */
export interface AdvancedSettings {
  // Reglas personalizadas
  tradingRules: TradingRules;
  
  // Modo ultra-disciplinado
  ultraDisciplinedMode: {
    enabled: boolean;
    blockOnRuleBreak: boolean; // Bloquea todo si se rompe una regla
    blockedUntil: string | null; // ISO date string - fecha hasta la cual está bloqueado
  };
  
  // Modo estudio
  studyMode: {
    enabled: boolean;
    hideMoney: boolean; // Oculta montos de dinero
    showOnlyRMultiples: boolean; // Muestra solo R múltiples
  };

  // Gestión de riesgo global
  riskManagement: RiskManagementConfig;

  // Disciplina y comportamiento
  discipline: DisciplineConfig;

  // Visualización y UI
  ui: UIConfig;

  // Insights y alertas
  insights: InsightsConfig;

  // Motor de reglas
  ruleEngine: RuleEngineConfig;

  // Sesiones y datos
  sessions: SessionsConfig;
}

/**
 * Application settings
 */
export interface Settings {
  accountSize: number;
  baseCurrency: string;
  riskPerTrade: number; // Percentage (e.g., 1 = 1%)
  theme: ThemeName;
  customTheme: ThemeConfig | null; // Tema personalizado si theme === 'custom'
  // Capital management
  currentCapital: number; // Capital actual (puede diferir del inicial)
  initialCapital: number; // Capital inicial para referencia
  manualCapitalAdjustment: boolean; // Si usa capital manual o calculado
  // Advanced settings
  advanced?: AdvancedSettings;
}

/**
 * Trade filter options
 */
export interface TradeFilters {
  dateFrom: string | null;
  dateTo: string | null;
  asset: string | null;
  winLoss: 'win' | 'loss' | 'all' | null;
  status: TradeStatus | 'all' | null;
  groupBy?: 'day' | 'week' | 'month' | null; // Vista agrupada
  session?: TradingSession | 'all' | null; // Filtro por sesión
  setupId?: string | null; // Filtro por setup
  minRiskReward?: number | null; // Minimum R/R ratio
  riskPercentMin?: number | null; // Minimum risk %
  riskPercentMax?: number | null; // Maximum risk %
  ruleStatus?: 'all' | 'compliant' | 'violations' | null; // Rule compliance filter
  classification?: 'modelo' | 'neutral' | 'error' | 'all' | null; // Trade classification
}

/**
 * Analytics data structure
 */
export interface Analytics {
  winRate: number;
  averageR: number;
  averagePnl: number;
  maxWinStreak: number;
  maxLossStreak: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
}

/**
 * Equity curve data point
 */
export interface EquityPoint {
  date: string;
  equity: number;
  cumulativePnl: number;
}

/**
 * Form data for creating/editing trades
 */
export interface TradeFormData {
  asset: string;
  positionType: PositionType;
  entryPrice: number;
  exitPrice: number | null;
  positionSize: number;
  leverage: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryDate: string;
  exitDate: string | null;
  notes: string; // Legacy
  screenshots: string[];
  videos: string[];
  tags: string[];
  journal: TradeJournal;
  commission?: number;
  spread?: number;
  swap?: number;
  swapRate?: number;
  swapType?: 'long' | 'short' | 'both';
  session?: TradingSession;
  setupId?: string;
}

/**
 * Goal period types
 */
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Goal types
 */
export type GoalType = 'pnl' | 'winRate' | 'numTrades';

/**
 * Trading goal
 */
export interface TradingGoal {
  id: string;
  period: GoalPeriod;
  type: GoalType;
  target: number;
  current: number;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
