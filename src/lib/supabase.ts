/**
 * Supabase client configuration
 * Handles connection to Supabase for MT5 trade synchronization
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and key from environment variables
// These should be set in .env.local or .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase configuration - silent if not configured

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, // Persistir sesión para mantener autenticación al recargar
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

