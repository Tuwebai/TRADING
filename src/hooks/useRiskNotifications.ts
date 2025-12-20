/**
 * Hook to monitor risk status and send notifications
 */

import { useEffect, useRef } from 'react';
import { useTradeStore } from '@/store/tradeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateGlobalRiskStatus } from '@/lib/riskControl';
import { getRiskMetrics } from '@/lib/risk';
import {
  showRiskWarning,
  showDrawdownWarning,
  showDailyLimitReached,
  type NotificationPreferences,
  loadNotificationPreferences,
} from '@/lib/notifications';

// Track last notification state to avoid duplicates
interface LastNotificationState {
  riskStatus: 'ok' | 'warning' | 'blocked' | null;
  drawdownPercent: number | null;
  dailyRiskPercent: number | null;
  lastNotificationTime: number;
}

export function useRiskNotifications() {
  const { trades } = useTradeStore();
  const { settings } = useSettingsStore();
  const lastStateRef = useRef<LastNotificationState>({
    riskStatus: null,
    drawdownPercent: null,
    dailyRiskPercent: null,
    lastNotificationTime: 0,
  });

  useEffect(() => {
    // Check if notifications are enabled
    const preferences: NotificationPreferences = loadNotificationPreferences();
    if (!preferences.enabled) {
      return;
    }

    // Only check if we have trades and settings
    if (!trades || trades.length === 0 || !settings) {
      return;
    }

    // Calculate risk status
    const riskStatus = calculateGlobalRiskStatus(trades, settings);
    const riskMetrics = getRiskMetrics(trades, settings);
    const todayRisk = calculateTodayRisk(trades, settings);

    const currentState = {
      riskStatus: riskStatus.status,
      drawdownPercent: riskMetrics.currentDrawdownPercent,
      dailyRiskPercent: todayRisk.percent,
    };

    const lastState = lastStateRef.current;
    const now = Date.now();
    const timeSinceLastNotification = now - lastState.lastNotificationTime;
    const minTimeBetweenNotifications = 60000; // 1 minute

    // Check for risk status changes
    if (
      currentState.riskStatus !== lastState.riskStatus &&
      currentState.riskStatus !== 'ok' &&
      timeSinceLastNotification > minTimeBetweenNotifications
    ) {
      const message = riskStatus.reasons.join('; ');
      showRiskWarning(message, currentState.riskStatus === 'blocked' ? 'blocked' : 'warning');
      lastStateRef.current = {
        ...currentState,
        lastNotificationTime: now,
      };
      return;
    }

    // Check for drawdown warnings
    const drawdownMaxAllowed = settings.advanced?.riskManagement?.maxDrawdown;
    if (drawdownMaxAllowed !== null && drawdownMaxAllowed !== undefined) {
      const isCritical = riskMetrics.currentDrawdownPercent > drawdownMaxAllowed;
      const isWarning = riskMetrics.currentDrawdownPercent > drawdownMaxAllowed * 0.8;
      
      if (
        (isCritical || isWarning) &&
        (lastState.drawdownPercent === null ||
          Math.abs(currentState.drawdownPercent - lastState.drawdownPercent) > 0.5) &&
        timeSinceLastNotification > minTimeBetweenNotifications
      ) {
        showDrawdownWarning(riskMetrics.currentDrawdownPercent, isCritical);
        lastStateRef.current = {
          ...currentState,
          lastNotificationTime: now,
        };
        return;
      }
    }

    // Check for daily limit reached
    const dailyRiskAllowed = settings.advanced?.riskManagement?.maxRiskDaily;
    if (dailyRiskAllowed !== null && dailyRiskAllowed !== undefined) {
      if (
        currentState.dailyRiskPercent >= dailyRiskAllowed &&
        (lastState.dailyRiskPercent === null ||
          lastState.dailyRiskPercent < dailyRiskAllowed) &&
        timeSinceLastNotification > minTimeBetweenNotifications
      ) {
        showDailyLimitReached('riesgo diario');
        lastStateRef.current = {
          ...currentState,
          lastNotificationTime: now,
        };
        return;
      }
    }

    // Update last state
    lastStateRef.current = {
      ...currentState,
      lastNotificationTime: lastState.lastNotificationTime,
    };
  }, [trades, settings]);
}

import { calculateTodayRisk } from '@/lib/riskControl';

