/**
 * Storage Adapter
 * SOLO usa Supabase - NO localStorage
 * Requiere autenticación obligatoria
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseTradeStorage, supabaseSettingsStorage, supabaseTemplatesStorage, supabaseRoutinesStorage, supabaseSetupsStorage, supabaseGoalsStorage } from './supabaseStorage';
import { supabaseRoutineExecutionsStorage } from './supabaseRoutineExecutions';
import type { Trade, Settings, TradeTemplate, Routine, DailyRoutineExecution, TradingSetup, TradingGoal } from '@/types/Trading';

/**
 * Get current user ID - Returns null if not authenticated (silent)
 */
async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  const { data: { user }, error } = await supabase!.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

/**
 * Require user ID - Throws error if not authenticated (for operations that MUST have user)
 */
async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuario no autenticado. Por favor inicia sesión.');
  }
  return userId;
}

/**
 * Storage Adapter - SOLO Supabase
 */
class StorageAdapter {

  // Trade Storage - SOLO Supabase
  async getAllTrades(): Promise<Trade[]> {
    const userId = await getUserId();
    if (!userId) return []; // Silently return empty if not authenticated
    return supabaseTradeStorage.getAll();
  }

  async saveTrade(trade: Trade): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseTradeStorage.save(trade);
  }

  async getTradeById(id: string): Promise<Trade | null> {
    const userId = await getUserId();
    if (!userId) return null; // Silently return null if not authenticated
    return supabaseTradeStorage.getById(id);
  }

  async deleteTrade(id: string): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseTradeStorage.delete(id);
  }

  async saveAllTrades(trades: Trade[]): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    // Save all trades to Supabase
    for (const trade of trades) {
      try {
        await supabaseTradeStorage.save(trade);
      } catch (error) {
        console.error(`Error saving trade ${trade.id}:`, error);
      }
    }
  }

  // Settings Storage - SOLO Supabase
  async getSettings(): Promise<Settings | null> {
    const userId = await getUserId();
    if (!userId) return null; // Silently return null if not authenticated
    return supabaseSettingsStorage.get();
  }

  async saveSettings(settings: Settings): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseSettingsStorage.save(settings);
  }

  // Templates Storage - SOLO Supabase
  async getAllTemplates(): Promise<TradeTemplate[]> {
    const userId = await getUserId();
    if (!userId) return []; // Silently return empty if not authenticated
    return supabaseTemplatesStorage.getAll();
  }

  async saveTemplate(template: TradeTemplate): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseTemplatesStorage.save(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseTemplatesStorage.delete(id);
  }

  // Routines Storage - SOLO Supabase
  async getAllRoutines(): Promise<Routine[]> {
    const userId = await getUserId();
    if (!userId) return []; // Silently return empty if not authenticated
    return supabaseRoutinesStorage.getAll();
  }

  async saveRoutine(routine: Routine): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseRoutinesStorage.save(routine);
  }

  async deleteRoutine(id: string): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseRoutinesStorage.delete(id);
  }

  // Routine Executions Storage - SOLO Supabase
  async getAllRoutineExecutions(): Promise<DailyRoutineExecution[]> {
    const userId = await getUserId();
    if (!userId) return []; // Silently return empty if not authenticated
    return supabaseRoutineExecutionsStorage.getAll();
  }

  async getRoutineExecutionByDate(date: string): Promise<DailyRoutineExecution | null> {
    const userId = await getUserId();
    if (!userId) return null; // Silently return null if not authenticated
    return supabaseRoutineExecutionsStorage.getByDate(date);
  }

  async saveRoutineExecution(execution: DailyRoutineExecution): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseRoutineExecutionsStorage.save(execution);
  }

  async deleteRoutineExecutionByDate(date: string): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseRoutineExecutionsStorage.deleteByDate(date);
  }

  // Setups Storage - SOLO Supabase
  async getAllSetups(): Promise<TradingSetup[]> {
    const userId = await getUserId();
    if (!userId) return []; // Silently return empty if not authenticated
    return supabaseSetupsStorage.getAll();
  }

  async saveSetup(setup: TradingSetup): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseSetupsStorage.save(setup);
  }

  async deleteSetup(id: string): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseSetupsStorage.delete(id);
  }

  // Goals Storage - SOLO Supabase
  async getAllGoals(): Promise<TradingGoal[]> {
    const userId = await getUserId();
    if (!userId) return []; // Silently return empty if not authenticated
    return supabaseGoalsStorage.getAll();
  }

  async saveGoal(goal: TradingGoal): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseGoalsStorage.save(goal);
  }

  async deleteGoal(id: string): Promise<void> {
    const userId = await getUserId();
    if (!userId) return; // Silently skip if not authenticated
    await supabaseGoalsStorage.delete(id);
  }

  // Reset cache (useful when auth state changes)
  resetCache() {
    // No hay cache que resetear en este adapter
    // Este método existe para compatibilidad con código que lo llama
  }
}

export const storageAdapter = new StorageAdapter();

