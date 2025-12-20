/**
 * Supabase Routine Executions Storage
 * Handles daily routine execution records in Supabase
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { DailyRoutineExecution } from '@/types/Trading';

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
 * Map Supabase routine execution to frontend format
 */
function mapToExecution(row: any): DailyRoutineExecution {
  return {
    date: row.date,
    blocks: row.blocks || {},
    endOfDay: row.end_of_day || {
      marked: false,
      markedAt: null,
      isValid: true,
      justification: null,
    },
    updatedAt: row.updated_at,
  };
}

/**
 * Routine Executions Storage with Supabase
 */
export const supabaseRoutineExecutionsStorage = {
  /**
   * Get all routine executions for current user
   */
  async getAll(): Promise<DailyRoutineExecution[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    const userId = await getUserId();
    if (!userId) {
      return [];
    }
    
    try {
      const { data, error } = await supabase!
        .from('routine_executions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching routine executions:', error);
        return [];
      }
      
      return (data || []).map(mapToExecution);
    } catch (error) {
      console.error('Error in getAll routine executions:', error);
      return [];
    }
  },

  /**
   * Get execution by date (YYYY-MM-DD)
   */
  async getByDate(date: string): Promise<DailyRoutineExecution | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const userId = await getUserId();
    if (!userId) {
      return null;
    }
    
    try {
      const { data, error } = await supabase!
        .from('routine_executions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - this is normal for new dates
          return null;
        }
        console.error('Error fetching routine execution by date:', error);
        return null;
      }
      
      return data ? mapToExecution(data) : null;
    } catch (error) {
      console.error('Error in getByDate routine execution:', error);
      return null;
    }
  },

  /**
   * Save or update a routine execution
   */
  async save(execution: DailyRoutineExecution): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const executionData = {
        user_id: userId,
        date: execution.date,
        blocks: execution.blocks,
        end_of_day: execution.endOfDay,
      };
      
      const { error } = await supabase!
        .from('routine_executions')
        .upsert(executionData, { 
          onConflict: 'user_id,date',
        });
      
      if (error) {
        console.error('Error saving routine execution:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in save routine execution:', error);
      throw error;
    }
  },

  /**
   * Delete a routine execution by date
   */
  async deleteByDate(date: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const { error } = await supabase!
        .from('routine_executions')
        .delete()
        .eq('user_id', userId)
        .eq('date', date);
      
      if (error) {
        console.error('Error deleting routine execution:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteByDate routine execution:', error);
      throw error;
    }
  },
};

