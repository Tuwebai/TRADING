/**
 * Supabase Storage Layer
 * Reemplaza localStorage con Supabase como backend principal
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Trade, Routine, Settings, TradeTemplate, TradingSetup, DailyRoutineExecution, TradingGoal } from '@/types/Trading';

/**
 * Get current user ID from Supabase Auth
 */
async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  const { data: { user } } = await supabase!.auth.getUser();
  return user?.id || null;
}

/**
 * Trade Storage with Supabase
 */
export const supabaseTradeStorage = {
  /**
   * Get all trades for current user
   */
  async getAll(): Promise<Trade[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const userId = await getUserId();
    if (!userId) {
      return [];
    }
    
    try {
      // Optimizar: seleccionar solo campos necesarios
      const fields = 'id,frontend_id,trade_uid,account_mode,asset,symbol,position_type,side,price_open,price_close,volume,leverage,stop_loss,take_profit,opened_at,closed_at,notes,tags,screenshots,videos,journal,pnl,commission,swap,pips,risk_pips,reward_pips,evaluated_rules,violated_rules,trade_classification,change_history,setup_id,session,r_multiple,created_at,updated_at';
      
      const { data, error } = await supabase!
        .from('trades')
        .select(fields)
        .eq('user_id', userId)
        .order('opened_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching trades:', error);
        return [];
      }
      
      // Map Supabase trades to frontend Trade format
      return (data || []).map(this.mapToTrade);
    } catch (error) {
      console.error('Error in getAll trades:', error);
      return [];
    }
  },
  
  /**
   * Map Supabase trade to frontend Trade format
   */
  mapToTrade(row: any): Trade {
    return {
      id: row.frontend_id || row.trade_uid || `supabase_${row.id}`,
      asset: row.asset || row.symbol,
      positionType: row.position_type || (row.side === 'buy' ? 'long' : 'short'),
      entryPrice: row.price_open,
      exitPrice: row.price_close || null,
      positionSize: row.volume,
      leverage: row.leverage || null,
      stopLoss: row.stop_loss || null,
      takeProfit: row.take_profit || null,
      entryDate: row.opened_at,
      exitDate: row.closed_at || null,
      notes: row.notes || '',
      screenshots: row.screenshots || [],
      videos: row.videos || [],
      tags: row.tags || [],
      journal: row.journal || {
        preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
        duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
        postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
      },
      status: row.closed_at ? 'closed' : 'open',
      pnl: row.pnl || null,
      riskReward: row.r_multiple || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      commission: row.commission || 0,
      swap: row.swap || null,
      mode: row.account_mode || 'demo',
      pips: row.pips || null,
      riskPips: row.risk_pips || null,
      rewardPips: row.reward_pips || null,
      evaluatedRules: row.evaluated_rules || [],
      violatedRules: row.violated_rules || [],
      tradeClassification: row.trade_classification || null,
      changeHistory: row.change_history || [],
    };
  },
  
  /**
   * Save a trade
   */
  async save(trade: Trade): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const existing = await this.getById(trade.id);
    
    const tradeData: any = {
      user_id: userId,
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
    };
    
    if (existing) {
      const { error } = await supabase!
        .from('trades')
        .update(tradeData)
        .eq('frontend_id', trade.id)
        .eq('user_id', userId);
      
      if (error) throw error;
    } else {
      const { error } = await supabase!
        .from('trades')
        .insert(tradeData);
      
      if (error) throw error;
    }
  },
  
  async getById(id: string): Promise<Trade | null> {
    if (!isSupabaseConfigured()) return null;
    const userId = await getUserId();
    if (!userId) return null;
    
    const { data } = await supabase!
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .or(`frontend_id.eq.${id},trade_uid.eq.${id}`)
      .single();
    
    return data ? this.mapToTrade(data) : null;
  },
  
  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('trades')
      .delete()
      .eq('frontend_id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },
};

/**
 * Settings Storage with Supabase
 */
export const supabaseSettingsStorage = {
  async get(): Promise<Settings | null> {
    if (!isSupabaseConfigured()) return null;
    const userId = await getUserId();
    if (!userId) return null;
    
    const { data } = await supabase!
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!data) return null;
    
    return {
      accountSize: data.account_size,
      baseCurrency: data.base_currency,
      riskPerTrade: data.risk_per_trade,
      currentCapital: data.current_capital,
      initialCapital: data.initial_capital,
      manualCapitalAdjustment: data.manual_capital_adjustment,
      theme: data.theme,
      customTheme: data.custom_theme,
      advanced: data.advanced_settings,
      tradingRules: data.trading_rules,
    } as Settings;
  },
  
  async save(settings: Settings): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('user_settings')
      .upsert({
        user_id: userId,
        account_size: settings.accountSize,
        base_currency: settings.baseCurrency,
        risk_per_trade: settings.riskPerTrade,
        current_capital: settings.currentCapital,
        initial_capital: settings.initialCapital,
        manual_capital_adjustment: settings.manualCapitalAdjustment,
        theme: settings.theme,
        custom_theme: settings.customTheme,
        advanced_settings: settings.advanced,
        trading_rules: settings.tradingRules,
      }, { onConflict: 'user_id' });
    
    if (error) throw error;
  },
};

/**
 * Goals Storage with Supabase
 */
export const supabaseGoalsStorage = {
  async getAll(): Promise<TradingGoal[]> {
    if (!isSupabaseConfigured()) return [];
    const userId = await getUserId();
    if (!userId) return [];
    
    const { data } = await supabase!
      .from('trading_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return (data || []).map(this.mapToGoal);
  },
  
  mapToGoal(row: any): TradingGoal {
    return {
      id: row.id,
      period: row.period,
      type: row.type,
      target: row.target,
      current: row.current,
      startDate: row.start_date,
      endDate: row.end_date,
      completed: row.completed,
      isPrimary: row.is_primary,
      isBinding: row.is_binding,
      constraintType: row.constraint_type,
      constraintConfig: row.constraint_config,
      consequences: row.consequences,
      failedAt: row.failed_at,
      lastFailedAt: row.last_failed_at,
      failureCount: row.failure_count,
      generatedInsightIds: row.generated_insight_ids,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
  
  async save(goal: TradingGoal): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('trading_goals')
      .upsert({
        id: goal.id,
        user_id: userId,
        period: goal.period,
        type: goal.type,
        target: goal.target,
        current: goal.current,
        start_date: goal.startDate,
        end_date: goal.endDate,
        completed: goal.completed,
        is_primary: goal.isPrimary,
        is_binding: goal.isBinding,
        constraint_type: goal.constraintType,
        constraint_config: goal.constraintConfig,
        consequences: goal.consequences,
        failed_at: goal.failedAt,
        last_failed_at: goal.lastFailedAt,
        failure_count: goal.failureCount,
        generated_insight_ids: goal.generatedInsightIds,
      }, { onConflict: 'id' });
    
    if (error) throw error;
  },
  
  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('trading_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },
};

/**
 * Routines Storage with Supabase
 */
export const supabaseRoutinesStorage = {
  async getAll(): Promise<Routine[]> {
    if (!isSupabaseConfigured()) return [];
    const userId = await getUserId();
    if (!userId) return [];
    
    const { data } = await supabase!
      .from('routines')
      .select('*')
      .eq('user_id', userId);
    
    return (data || []).map(this.mapToRoutine);
  },
  
  mapToRoutine(row: any): Routine {
    return {
      id: row.id,
      type: row.type,
      items: row.items || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
  
  async save(routine: Routine): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('routines')
      .upsert({
        id: routine.id,
        user_id: userId,
        type: routine.type,
        items: routine.items,
      }, { onConflict: 'id' });
    
    if (error) throw error;
  },
  
  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },
};

/**
 * Templates Storage with Supabase
 */
export const supabaseTemplatesStorage = {
  async getAll(): Promise<TradeTemplate[]> {
    if (!isSupabaseConfigured()) return [];
    const userId = await getUserId();
    if (!userId) return [];
    
    const { data } = await supabase!
      .from('trade_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return (data || []).map(this.mapToTemplate);
  },
  
  mapToTemplate(row: any): TradeTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      formData: row.form_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
  
  async save(template: TradeTemplate): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('trade_templates')
      .upsert({
        id: template.id,
        user_id: userId,
        name: template.name,
        description: template.description,
        form_data: template.formData,
      }, { onConflict: 'id' });
    
    if (error) throw error;
  },
  
  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('trade_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },
};

/**
 * Setups Storage with Supabase
 */
export const supabaseSetupsStorage = {
  async getAll(): Promise<TradingSetup[]> {
    if (!isSupabaseConfigured()) return [];
    const userId = await getUserId();
    if (!userId) return [];
    
    const { data } = await supabase!
      .from('trading_setups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return (data || []).map(this.mapToSetup);
  },
  
  mapToSetup(row: any): TradingSetup {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      imageUrl: row.image_url,
      rules: row.rules || [],
      entryCriteria: row.entry_criteria,
      exitCriteria: row.exit_criteria,
      riskManagement: row.risk_management,
      tags: row.tags || [],
      stats: row.stats,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
  
  async save(setup: TradingSetup): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('trading_setups')
      .upsert({
        id: setup.id,
        user_id: userId,
        name: setup.name,
        description: setup.description,
        category: setup.category,
        image_url: setup.imageUrl,
        rules: setup.rules,
        entry_criteria: setup.entryCriteria,
        exit_criteria: setup.exitCriteria,
        risk_management: setup.riskManagement,
        tags: setup.tags,
        stats: setup.stats,
      }, { onConflict: 'id' });
    
    if (error) throw error;
  },
  
  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    
    const { error } = await supabase!
      .from('trading_setups')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },
};
