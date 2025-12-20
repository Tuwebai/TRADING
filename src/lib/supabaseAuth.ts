/**
 * Supabase Authentication helpers
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  // Add more fields as needed
}

/**
 * Sign up with email and password
 * Automatically creates a user profile in the public.users table via trigger
 */
export async function signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: new Error('Supabase not configured') };
  }
  
  try {
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: {
          email: email,
        }
      }
    });
    
    if (error) {
      return { user: null, error };
    }
    
    // The trigger will automatically create the user profile in public.users
    // Wait a bit to ensure the trigger has executed
    if (data.user) {
      // Try to verify the user was created in public.users
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: userProfile } = await supabase!
        .from('users')
        .select('id, email')
        .eq('id', data.user.id)
        .single();
      
      if (!userProfile) {
        // If trigger didn't work, create manually
        await supabase!
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || email,
          })
          .select()
          .single();
      }
    }
    
    return {
      user: data.user ? {
        id: data.user.id,
        email: data.user.email || '',
      } : null,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: new Error('Supabase not configured') };
  }
  
  try {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { user: null, error };
    }
    
    return {
      user: data.user ? {
        id: data.user.id,
        email: data.user.email || '',
      } : null,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }
  
  try {
    const { error } = await supabase!.auth.signOut();
    return { error };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  try {
    const { data: { user } } = await supabase!.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (fast - uses cached session)
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }
  
  try {
    // Use getSession() which is faster than getUser() as it uses cached session
    const { data: { session } } = await supabase!.auth.getSession();
    return !!session?.user;
  } catch (error) {
    return false;
  }
}

/**
 * Get current user (fast - uses cached session)
 */
export async function getCurrentUserFast(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  try {
    // Use getSession() which is faster than getUser() as it uses cached session
    const { data: { session } } = await supabase!.auth.getSession();
    
    if (!session?.user) {
      return null;
    }
    
    return {
      id: session.user.id,
      email: session.user.email || '',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get Supabase user (alias for getCurrentUser for consistency)
 * Uses fast session check when possible
 */
export async function getSupabaseUser(): Promise<AuthUser | null> {
  // Try fast method first
  const fastUser = await getCurrentUserFast();
  if (fastUser) {
    return fastUser;
  }
  // Fallback to slower method if needed
  return getCurrentUser();
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
      });
    } else {
      callback(null);
    }
  });
  
  return () => {
    subscription.unsubscribe();
  };
}

