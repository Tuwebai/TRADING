/**
 * Notification Service
 * Handles browser notifications and push notifications
 */

export type NotificationType = 
  | 'risk-warning'
  | 'risk-blocked'
  | 'drawdown-warning'
  | 'drawdown-critical'
  | 'daily-limit-reached'
  | 'trade-opened'
  | 'trade-closed'
  | 'goal-failed'
  | 'routine-reminder'
  | 'general';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  data?: Record<string, any>;
  actions?: NotificationAction[];
  url?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    riskWarnings: boolean;
    riskBlocked: boolean;
    drawdownWarnings: boolean;
    drawdownCritical: boolean;
    dailyLimitReached: boolean;
    tradeOpened: boolean;
    tradeClosed: boolean;
    goalFailed: boolean;
    routineReminders: boolean;
    general: boolean;
  };
  sound: boolean;
  vibrate: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  types: {
    riskWarnings: true,
    riskBlocked: true,
    drawdownWarnings: true,
    drawdownCritical: true,
    dailyLimitReached: true,
    tradeOpened: false,
    tradeClosed: false,
    goalFailed: true,
    routineReminders: true,
    general: true,
  },
  sound: true,
  vibrate: true,
};

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission has been denied');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Load notification preferences from localStorage
 */
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem('notificationPreferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Error loading notification preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  try {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
}

/**
 * Check if a notification type is enabled
 */
export function isNotificationTypeEnabled(
  type: NotificationType,
  preferences?: NotificationPreferences
): boolean {
  const prefs = preferences || loadNotificationPreferences();
  
  if (!prefs.enabled) {
    return false;
  }

  const typeMap: Record<NotificationType, keyof NotificationPreferences['types']> = {
    'risk-warning': 'riskWarnings',
    'risk-blocked': 'riskBlocked',
    'drawdown-warning': 'drawdownWarnings',
    'drawdown-critical': 'drawdownCritical',
    'daily-limit-reached': 'dailyLimitReached',
    'trade-opened': 'tradeOpened',
    'trade-closed': 'tradeClosed',
    'goal-failed': 'goalFailed',
    'routine-reminder': 'routineReminders',
    'general': 'general',
  };

  return prefs.types[typeMap[type]] ?? true;
}

/**
 * Show a browser notification
 */
export async function showNotification(
  type: NotificationType,
  options: NotificationOptions
): Promise<void> {
  // Check if notifications are supported
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported');
    return;
  }

  // Check permission
  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted:', permission);
    return;
  }

  // Check if this notification type is enabled
  if (!isNotificationTypeEnabled(type)) {
    return;
  }

  const preferences = loadNotificationPreferences();

  // Prepare notification options
  const notificationOptions: NotificationOptions = {
    icon: options.icon || '/vite.svg',
    badge: options.badge || '/vite.svg',
    tag: options.tag || type,
    requireInteraction: options.requireInteraction || false,
    silent: !preferences.sound,
    vibrate: preferences.vibrate ? (options.vibrate || [200, 100, 200]) : undefined,
    data: {
      ...options.data,
      type,
      url: options.url || '/',
      timestamp: Date.now(),
    },
    actions: options.actions,
  };

  // Try to use Service Worker notification first
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, notificationOptions);
      return;
    } catch (error) {
      console.warn('Failed to show notification via Service Worker:', error);
    }
  }

  // Fallback to regular Notification API
  try {
    const notification = new Notification(options.title, notificationOptions);
    
    // Auto-close after 5 seconds if not requiring interaction
    if (!notificationOptions.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    // Handle click
    notification.onclick = () => {
      window.focus();
      if (notificationOptions.data?.url) {
        window.location.href = notificationOptions.data.url;
      }
      notification.close();
    };
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Show risk warning notification
 */
export async function showRiskWarning(
  message: string,
  severity: 'warning' | 'blocked' = 'warning'
): Promise<void> {
  const type = severity === 'blocked' ? 'risk-blocked' : 'risk-warning';
  await showNotification(type, {
    title: severity === 'blocked' ? '🚫 Trading Bloqueado' : '⚠️ Advertencia de Riesgo',
    body: message,
    requireInteraction: severity === 'blocked',
    vibrate: severity === 'blocked' ? [300, 200, 300, 200, 300] : [200, 100, 200],
    url: '/risk',
  });
}

/**
 * Show drawdown notification
 */
export async function showDrawdownWarning(
  drawdownPercent: number,
  isCritical: boolean = false
): Promise<void> {
  const type = isCritical ? 'drawdown-critical' : 'drawdown-warning';
  await showNotification(type, {
    title: isCritical ? '🔴 Drawdown Crítico' : '🟡 Drawdown Alto',
    body: `Drawdown actual: ${drawdownPercent.toFixed(2)}%`,
    requireInteraction: isCritical,
    vibrate: isCritical ? [400, 200, 400] : [200, 100, 200],
    url: '/risk',
  });
}

/**
 * Show daily limit notification
 */
export async function showDailyLimitReached(limitType: string): Promise<void> {
  await showNotification('daily-limit-reached', {
    title: '📊 Límite Diario Alcanzado',
    body: `Has alcanzado el límite de ${limitType}`,
    requireInteraction: false,
    url: '/risk',
  });
}

/**
 * Show trade notification
 */
export async function showTradeNotification(
  type: 'opened' | 'closed',
  asset: string,
  pnl?: number
): Promise<void> {
  const notificationType = type === 'opened' ? 'trade-opened' : 'trade-closed';
  const title = type === 'opened' ? '📈 Operación Abierta' : '📉 Operación Cerrada';
  const body = type === 'opened'
    ? `Operación abierta en ${asset}`
    : `Operación cerrada en ${asset}${pnl !== undefined ? ` - P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}` : ''}`;

  await showNotification(notificationType, {
    title,
    body,
    requireInteraction: false,
    url: '/trades',
  });
}

/**
 * Show goal failed notification
 */
export async function showGoalFailedNotification(goalName: string): Promise<void> {
  await showNotification('goal-failed', {
    title: '❌ Meta Fallida',
    body: `La meta "${goalName}" no se cumplió`,
    requireInteraction: true,
    url: '/postmortems',
  });
}

/**
 * Show routine reminder
 */
export async function showRoutineReminder(routineName: string): Promise<void> {
  await showNotification('routine-reminder', {
    title: '📋 Recordatorio de Rutina',
    body: `Es hora de completar: ${routineName}`,
    requireInteraction: false,
    url: '/routines',
  });
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications();
      notifications.forEach(notification => notification.close());
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}

