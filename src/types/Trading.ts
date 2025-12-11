/**
 * Core type definitions for the Trading Log System
 * All models and interfaces are defined here for type safety and consistency
 */

export type PositionType = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type RoutineType = 'morning' | 'pre-market' | 'pre-trade' | 'post-trade' | 'end-of-day';
export type EmotionType = 'confiado' | 'ansioso' | 'temeroso' | 'emocionado' | 'neutral' | 'frustrado' | 'euforico' | 'deprimido';

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

