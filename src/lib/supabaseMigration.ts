/**
 * Migration utilities for moving from localStorage to Supabase
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { tradeStorage, settingsStorage, templateStorage } from './storage';
import type { Trade, Settings, TradeTemplate } from '@/types/Trading';

/**
 * Check if user wants to use Supabase (has authenticated)
 */
export async function shouldUseSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }
  
  const { data: { user } } = await supabase!.auth.getUser();
  return !!user;
}

/**
 * Migrate all data from localStorage to Supabase
 */
export async function migrateToSupabase(): Promise<{
  success: boolean;
  migrated: {
    trades: number;
    settings: boolean;
    templates: number;
  };
  errors: string[];
}> {
  const result = {
    success: true,
    migrated: {
      trades: 0,
      settings: false,
      templates: 0,
    },
    errors: [] as string[],
  };
  
  if (!isSupabaseConfigured()) {
    result.success = false;
    result.errors.push('Supabase not configured');
    return result;
  }
  
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) {
    result.success = false;
    result.errors.push('User not authenticated');
    return result;
  }
  
  try {
    // Migrate trades
    const localTrades = tradeStorage.getAll();
    for (const trade of localTrades) {
      try {
        const { error } = await supabase!
          .from('trades')
          .upsert({
            user_id: user.id,
            frontend_id: trade.id,
            account_mode: trade.mode || 'demo',
            asset: trade.asset,
            symbol: trade.asset,
            position_type: trade.positionType,
            side: trade.positionType === 'long' ? 'buy' : 'sell',
            price_open: trade.entryPrice,
            price_close: trade.exitPrice,
            volume: trade.positionSize,
            leverage: trade.leverage,
            stop_loss: trade.stopLoss,
            take_profit: trade.takeProfit,
            opened_at: trade.entryDate,
            closed_at: trade.exitDate,
            notes: trade.notes,
            tags: trade.tags,
            screenshots: trade.screenshots,
            videos: trade.videos,
            journal: trade.journal,
            pnl: trade.pnl,
            commission: trade.commission || 0,
            swap: trade.swap || null,
            pips: trade.pips,
            risk_pips: trade.riskPips,
            reward_pips: trade.rewardPips,
            evaluated_rules: trade.evaluatedRules,
            violated_rules: trade.violatedRules,
            trade_classification: trade.tradeClassification,
            change_history: trade.changeHistory,
            setup_id: trade.setupId,
            session: trade.session,
          }, { onConflict: 'frontend_id' });
        
        if (!error) {
          result.migrated.trades++;
        } else {
          result.errors.push(`Error migrating trade ${trade.id}: ${error.message}`);
        }
      } catch (error) {
        result.errors.push(`Error migrating trade ${trade.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Migrate settings
    try {
      const localSettings = settingsStorage.get();
      const { error } = await supabase!
        .from('user_settings')
        .upsert({
          user_id: user.id,
          account_size: localSettings.accountSize,
          base_currency: localSettings.baseCurrency,
          risk_per_trade: localSettings.riskPerTrade,
          current_capital: localSettings.currentCapital,
          initial_capital: localSettings.initialCapital,
          manual_capital_adjustment: localSettings.manualCapitalAdjustment,
          theme: localSettings.theme,
          custom_theme: localSettings.customTheme,
          advanced_settings: localSettings.advanced,
          trading_rules: localSettings.tradingRules,
        }, { onConflict: 'user_id' });
      
      if (!error) {
        result.migrated.settings = true;
      } else {
        result.errors.push(`Error migrating settings: ${error.message}`);
      }
    } catch (error) {
      result.errors.push(`Error migrating settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Migrate templates
    const localTemplates = templateStorage.getAll();
    for (const template of localTemplates) {
      try {
        const { error } = await supabase!
          .from('trade_templates')
          .upsert({
            id: template.id,
            user_id: user.id,
            name: template.name,
            description: template.description,
            form_data: template.formData,
          }, { onConflict: 'id' });
        
        if (!error) {
          result.migrated.templates++;
        } else {
          result.errors.push(`Error migrating template ${template.id}: ${error.message}`);
        }
      } catch (error) {
        result.errors.push(`Error migrating template ${template.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (result.errors.length > 0) {
      result.success = false;
    }
    
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

