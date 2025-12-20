/**
 * Supabase MT5 Accounts management
 * Functions to associate/disassociate MT5 accounts with users
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface MT5Account {
  id: string;
  user_id: string;
  broker: string;
  account_mode: 'simulation' | 'demo' | 'live';
  account_number?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMT5AccountData {
  broker: string;
  account_mode: 'simulation' | 'demo' | 'live';
  account_number?: string;
}

/**
 * Get all MT5 accounts for the current user
 */
export async function getMT5Accounts(): Promise<MT5Account[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      return [];
    }

    const { data, error } = await supabase!
      .from('mt5_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching MT5 accounts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching MT5 accounts:', error);
    return [];
  }
}

/**
 * Create a new MT5 account association
 */
export async function createMT5Account(
  accountData: CreateMT5AccountData
): Promise<{ success: boolean; account?: MT5Account; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Check if account already exists
    const { data: existing } = await supabase!
      .from('mt5_accounts')
      .select('id')
      .eq('broker', accountData.broker)
      .eq('account_mode', accountData.account_mode)
      .eq('account_number', accountData.account_number || '')
      .single();

    if (existing) {
      return { success: false, error: 'Esta cuenta MT5 ya está asociada' };
    }

    const { data, error } = await supabase!
      .from('mt5_accounts')
      .insert({
        user_id: user.id,
        broker: accountData.broker,
        account_mode: accountData.account_mode,
        account_number: accountData.account_number || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating MT5 account:', error);
      return { success: false, error: error.message };
    }

    return { success: true, account: data };
  } catch (error) {
    console.error('Error creating MT5 account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Update an MT5 account (e.g., toggle active status)
 */
export async function updateMT5Account(
  accountId: string,
  updates: Partial<Pick<MT5Account, 'is_active' | 'broker' | 'account_number'>>
): Promise<{ success: boolean; account?: MT5Account; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const { data, error } = await supabase!
      .from('mt5_accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('user_id', user.id) // Ensure user owns this account
      .select()
      .single();

    if (error) {
      console.error('Error updating MT5 account:', error);
      return { success: false, error: error.message };
    }

    return { success: true, account: data };
  } catch (error) {
    console.error('Error updating MT5 account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Delete an MT5 account association
 */
export async function deleteMT5Account(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const { error } = await supabase!
      .from('mt5_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id); // Ensure user owns this account

    if (error) {
      console.error('Error deleting MT5 account:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting MT5 account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

