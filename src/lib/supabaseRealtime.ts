/**
 * Supabase Realtime subscriptions
 * Para sincronización en tiempo real de datos
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Trade } from '@/types/Trading';
import { mapSupabaseTradeToTrade } from './supabaseTrades';

/**
 * Subscribe to trades changes
 */
export function subscribeToTrades(
  userId: string,
  onInsert: (trade: Trade) => void,
  onUpdate: (trade: Trade) => void,
  onDelete: (tradeId: string) => void
) {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const channel = supabase!
    .channel(`trades:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trades',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        try {
          const trade = mapSupabaseTradeToTrade(payload.new as any);
          onInsert(trade);
        } catch (error) {
          console.error('Error mapping new trade from realtime:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trades',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        try {
          const trade = mapSupabaseTradeToTrade(payload.new as any);
          onUpdate(trade);
          
          // Check for alerts (TP/SL reached)
          const newData = payload.new as any;
          if (newData.alert_triggered && newData.alert_type) {
            // Trigger browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              const alertMessage = newData.alert_type === 'take_profit_reached' 
                ? `🎯 Take Profit alcanzado en ${trade.asset}`
                : `🛑 Stop Loss alcanzado en ${trade.asset}`;
              
              new Notification(alertMessage, {
                body: `Trade ${trade.id} - P&L: ${trade.pnl?.toFixed(2) || '0.00'}`,
                icon: '/favicon.ico',
                tag: `trade-alert-${trade.id}`,
              });
            }
          }
        } catch (error) {
          console.error('Error mapping updated trade from realtime:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'trades',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onDelete(payload.old.id);
      }
    )
    .subscribe();
  
  return () => {
    supabase!.removeChannel(channel);
  };
}

/**
 * Subscribe to goals changes
 */
export function subscribeToGoals(
  userId: string,
  onInsert: (goal: any) => void,
  onUpdate: (goal: any) => void,
  onDelete: (goalId: string) => void
) {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const channel = supabase!
    .channel(`goals:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trading_goals',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          onInsert(payload.new);
        } else if (payload.eventType === 'UPDATE') {
          onUpdate(payload.new);
        } else if (payload.eventType === 'DELETE') {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe();
  
  return () => {
    supabase!.removeChannel(channel);
  };
}

