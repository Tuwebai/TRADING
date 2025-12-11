/**
 * Trading rules validation and enforcement
 * Functions to check if trading rules are being followed
 */

import type { Trade, Settings } from '@/types/Trading';
import { getTradesByDay } from './calendarStats';

export interface RuleViolation {
  id: string;
  rule: string;
  severity: 'warning' | 'error';
  message: string;
}

/**
 * Check if a new trade would violate trading rules
 */
export function checkTradingRules(
  trades: Trade[],
  settings: Settings,
  newTrade?: Partial<Trade>
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const advanced = settings.advanced;
  
  if (!advanced) return violations;
  
  const rules = advanced.tradingRules;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check max trades per day
  if (rules.maxTradesPerDay !== null) {
    const todayTrades = trades.filter(t => {
      if (t.status !== 'closed' && !t.exitDate) return false;
      const tradeDate = new Date(t.exitDate || t.entryDate);
      return tradeDate >= today;
    });
    
    if (todayTrades.length >= rules.maxTradesPerDay) {
      violations.push({
        id: 'max-trades-per-day',
        rule: 'maxTradesPerDay',
        severity: 'error',
        message: `Has alcanzado el límite de ${rules.maxTradesPerDay} operaciones por día.`,
      });
    }
  }
  
  // Check max trades per week
  if (rules.maxTradesPerWeek !== null) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    
    const weekTrades = trades.filter(t => {
      if (t.status !== 'closed' && !t.exitDate) return false;
      const tradeDate = new Date(t.exitDate || t.entryDate);
      return tradeDate >= weekStart;
    });
    
    if (weekTrades.length >= rules.maxTradesPerWeek) {
      violations.push({
        id: 'max-trades-per-week',
        rule: 'maxTradesPerWeek',
        severity: 'error',
        message: `Has alcanzado el límite de ${rules.maxTradesPerWeek} operaciones por semana.`,
      });
    }
  }
  
  // Check trading hours
  if (rules.allowedTradingHours.enabled) {
    const currentHour = now.getHours();
    const { startHour, endHour } = rules.allowedTradingHours;
    
    if (currentHour < startHour || currentHour >= endHour) {
      violations.push({
        id: 'trading-hours',
        rule: 'allowedTradingHours',
        severity: 'error',
        message: `Solo puedes operar entre las ${startHour}:00 y ${endHour}:00.`,
      });
    }
  }
  
  // Check max lot size
  if (rules.maxLotSize !== null && newTrade) {
    if (newTrade.positionSize && newTrade.positionSize > rules.maxLotSize) {
      violations.push({
        id: 'max-lot-size',
        rule: 'maxLotSize',
        severity: 'error',
        message: `El tamaño de lote máximo permitido es ${rules.maxLotSize}.`,
      });
    }
  }
  
  // Check daily loss limit
  if (rules.dailyLossLimit !== null) {
    const todayTrades = trades.filter(t => {
      if (t.status !== 'closed' || !t.exitDate) return false;
      const tradeDate = new Date(t.exitDate);
      return tradeDate >= today;
    });
    
    const dailyPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    if (dailyPnL < 0 && Math.abs(dailyPnL) >= rules.dailyLossLimit) {
      violations.push({
        id: 'daily-loss-limit',
        rule: 'dailyLossLimit',
        severity: 'error',
        message: `Has alcanzado el límite de pérdida diaria de ${rules.dailyLossLimit}.`,
      });
    }
  }
  
  return violations;
}

/**
 * Check if user is currently blocked due to rule violation
 */
export function isBlocked(settings: Settings): boolean {
  const advanced = settings.advanced;
  if (!advanced || !advanced.ultraDisciplinedMode.enabled) return false;
  if (!advanced.ultraDisciplinedMode.blockOnRuleBreak) return false;
  
  const blockedUntil = advanced.ultraDisciplinedMode.blockedUntil;
  if (!blockedUntil) return false;
  
  const now = new Date();
  const blockedDate = new Date(blockedUntil);
  
  return now < blockedDate;
}

/**
 * Block user for a specified duration (in hours)
 */
export function blockUser(settings: Settings, hours: number = 24): Partial<Settings> {
  const advanced = settings.advanced;
  if (!advanced) return {};
  
  const blockedUntil = new Date();
  blockedUntil.setHours(blockedUntil.getHours() + hours);
  
  return {
    advanced: {
      ...advanced,
      ultraDisciplinedMode: {
        ...advanced.ultraDisciplinedMode,
        blockedUntil: blockedUntil.toISOString(),
      },
    },
  };
}

/**
 * Check if study mode is enabled
 */
export function isStudyModeEnabled(settings: Settings): boolean {
  return settings.advanced?.studyMode?.enabled || false;
}

/**
 * Check if money should be hidden
 */
export function shouldHideMoney(settings: Settings): boolean {
  return settings.advanced?.studyMode?.hideMoney || false;
}

/**
 * Check if only R multiples should be shown
 */
export function shouldShowOnlyRMultiples(settings: Settings): boolean {
  return settings.advanced?.studyMode?.showOnlyRMultiples || false;
}

