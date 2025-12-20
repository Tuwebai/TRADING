/**
 * Supabase trades integration
 * Handles fetching and syncing trades from Supabase
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Trade } from '@/types/Trading';

// SupabaseTrade interface removed - not used in code

/**
 * Map Supabase trade to frontend Trade format
 */
export function mapSupabaseTradeToTrade(supabaseTrade: any): Trade {
  // Determine status: closed if closed_at is not null
  const status: 'open' | 'closed' = supabaseTrade.closed_at ? 'closed' : 'open';
  const positionType: 'long' | 'short' = supabaseTrade.side === 'buy' ? 'long' : 'short';
  
  // Generate a unique ID for the frontend
  // Use trade_uid if available, otherwise use ticket + account_mode, fallback to Supabase id
  const ticketStr = supabaseTrade.ticket?.toString() || '';
  const id = supabaseTrade.trade_uid 
    ? `mt5_${supabaseTrade.trade_uid}` 
    : ticketStr
    ? `mt5_${supabaseTrade.account_mode}_${ticketStr}`
    : `mt5_${supabaseTrade.id}`;
  
  // Default journal structure
  const defaultJournal = {
    preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
    duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
    postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
  };
  
  const trade: Trade = {
    id,
    asset: supabaseTrade.symbol,
    positionType,
    entryPrice: supabaseTrade.price_open,
    exitPrice: supabaseTrade.price_close || null,
    positionSize: supabaseTrade.volume,
    leverage: null, // Not available from MT5
    stopLoss: supabaseTrade.stop_loss || null,
    takeProfit: supabaseTrade.take_profit || null,
    entryDate: supabaseTrade.opened_at,
    exitDate: supabaseTrade.closed_at || null,
    notes: '', // MT5 doesn't provide notes
    screenshots: [],
    videos: [],
    tags: [],
    journal: defaultJournal,
    status,
    pnl: supabaseTrade.pnl || null,
    riskReward: supabaseTrade.r_multiple || null,
    createdAt: supabaseTrade.created_at,
    updatedAt: supabaseTrade.updated_at,
    commission: supabaseTrade.commission || 0,
    swap: supabaseTrade.swap || null,
    // Map account_mode to mode (simulation/demo/live)
    mode: supabaseTrade.account_mode,
    // Additional fields
    pips: null, // Will be calculated if needed
    riskPips: null,
    rewardPips: null,
  };
  
  return trade;
}

/**
 * Fetch trades from Supabase
 * @param accountMode - Filter by account mode (simulation, demo, live)
 * @param limit - Maximum number of trades to fetch
 * @returns Array of trades
 */
export async function fetchTradesFromSupabase(
  accountMode?: 'simulation' | 'demo' | 'live',
  limit: number = 1000
): Promise<Trade[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  
  // Obtener usuario autenticado - REQUERIDO
  const { data: { user }, error: authError } = await supabase!.auth.getUser();
  
  if (authError || !user) {
    console.error('No user authenticated or auth error:', authError);
    return [];
  }
  
  try {
    // Build query: trades del usuario O trades sin user_id (trades de MT5)
    const fields = 'id,frontend_id,trade_uid,account_mode,asset,symbol,position_type,side,price_open,price_close,volume,leverage,stop_loss,take_profit,opened_at,closed_at,notes,tags,screenshots,videos,journal,pnl,commission,swap,pips,risk_pips,reward_pips,evaluated_rules,violated_rules,trade_classification,change_history,setup_id,session,r_multiple,broker,user_id,ticket,created_at,updated_at';
    
    // SIMPLIFICADO: Una sola query que obtiene todos los trades que el usuario puede ver
    // La política RLS ya maneja: user_id = auth.uid() OR user_id IS NULL
    let query = supabase!
      .from('trades')
      .select(fields)
      .order('opened_at', { ascending: false })
      .limit(limit);
    
    // Si se especifica account_mode, filtrar por él
    if (accountMode) {
      query = query.eq('account_mode', accountMode);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching trades from Supabase:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No trades found in Supabase');
      return [];
    }
    
    // Map Supabase trades to frontend Trade format
    const mappedTrades = data.map(mapSupabaseTradeToTrade);
    
    // Debug: Log final results
    const openTrades = mappedTrades.filter(t => t.status === 'open');
    const closedTrades = mappedTrades.filter(t => t.status === 'closed');
    console.log(`✅ Total trades loaded: ${mappedTrades.length} (${openTrades.length} open, ${closedTrades.length} closed)`);
    if (accountMode) {
      console.log(`Filtered by account_mode: ${accountMode}`);
    }
    
    return mappedTrades;
  } catch (error) {
    console.error('Error fetching trades from Supabase:', error);
    return [];
  }
}

/**
 * Sync trades from Supabase and merge with local trades
 * @param localTrades - Current local trades
 * @param accountMode - Filter by account mode
 * @returns Merged trades array
 */
export async function syncTradesFromSupabase(
  localTrades: Trade[],
  accountMode?: 'simulation' | 'demo' | 'live'
): Promise<Trade[]> {
  if (!isSupabaseConfigured()) {
    return localTrades;
  }
  
  try {
    // Fetch trades from Supabase filtered by account mode
    const supabaseTrades = await fetchTradesFromSupabase(accountMode);
    
    // Merge Supabase trades with local trades
    // Supabase trades take precedence (they're from MT5, more authoritative)
    const mergedTrades: Trade[] = [...localTrades];
    
    supabaseTrades.forEach(supabaseTrade => {
      const existingIndex = mergedTrades.findIndex(t => t.id === supabaseTrade.id);
      
      if (existingIndex >= 0) {
        // Update existing trade with Supabase data (MT5 is authoritative)
        mergedTrades[existingIndex] = supabaseTrade;
      } else {
        // Add new trade from Supabase
        mergedTrades.push(supabaseTrade);
      }
    });
    
    // Sort by entry date (newest first)
    mergedTrades.sort((a, b) => {
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      return dateB - dateA;
    });
    
    return mergedTrades;
  } catch (error) {
    console.error('Error syncing trades from Supabase:', error);
    return localTrades;
  }
}

// getCurrentAccountMode function removed - not used

