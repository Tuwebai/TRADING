/**
 * Authentication store using Zustand
 * Manages authentication state across the application
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as authLogin, logout as authLogout, isAuthenticated, getCurrentUser, register as authRegister } from '@/lib/auth';
import { signIn, signUp, signOut, getCurrentUser as getSupabaseUser, isAuthenticated as isSupabaseAuthenticated, onAuthStateChange } from '@/lib/supabaseAuth';
import { storageAdapter } from '@/lib/storageAdapter';

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      isLoading: true,

      // Initialize auth state - check both Supabase and localStorage
      checkAuth: async () => {
        // If already authenticated and not loading, skip check (optimization)
        const currentState = useAuthStore.getState();
        if (currentState.isAuthenticated && !currentState.isLoading) {
          return;
        }
        
        set({ isLoading: true });
        
        try {
          // Check Supabase first (using fast session check)
          const supabaseAuth = await isSupabaseAuthenticated();
          if (supabaseAuth) {
            // Use getCurrentUserFast which uses cached session
            const supabaseUser = await getSupabaseUser();
            if (supabaseUser) {
              set({
                isAuthenticated: true,
                user: supabaseUser.email,
                isLoading: false,
              });
              // Reset storage adapter cache
              storageAdapter.resetCache();
              return;
            }
          }
          
          // Fallback to localStorage auth
          const authenticated = isAuthenticated();
          const user = getCurrentUser();
          set({
            isAuthenticated: authenticated,
            user: user,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error checking auth:', error);
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }
      },

      login: async (email: string, password: string) => {
        // Try Supabase first
        const supabaseResult = await signIn(email, password);
        if (!supabaseResult.error && supabaseResult.user) {
          set({
            isAuthenticated: true,
            user: supabaseResult.user.email,
          });
          storageAdapter.resetCache();
          return { success: true };
        }
        
        // Fallback to localStorage auth
        const result = authLogin(email, password);
        
        if (result.success) {
          const user = getCurrentUser();
          set({
            isAuthenticated: true,
            user: user,
          });
        }
        
        return result;
      },

      register: async (email: string, password: string) => {
        // Try Supabase first
        const supabaseResult = await signUp(email, password);
        if (!supabaseResult.error && supabaseResult.user) {
          set({
            isAuthenticated: true,
            user: supabaseResult.user.email,
          });
          storageAdapter.resetCache();
          return { success: true };
        }
        
        // Fallback to localStorage auth
        const result = authRegister(email, password);
        
        if (result.success) {
          const user = getCurrentUser();
          set({
            isAuthenticated: true,
            user: user,
          });
        }
        
        return result;
      },

      logout: async () => {
        // Logout from Supabase
        await signOut();
        
        // Logout from localStorage
        authLogout();
        
        set({
          isAuthenticated: false,
          user: null,
        });
        
        // Reset storage adapter cache
        storageAdapter.resetCache();
      },
    }),
    {
      name: 'auth-storage',
      // We don't persist the auth state in Zustand because we're using localStorage directly
      // But we use persist middleware to sync on mount
      partialize: () => ({}),
    }
  )
);

// Initialize auth state on module load (only once, using fast session check)
if (typeof window !== 'undefined') {
  // Initialize immediately with fast session check (non-blocking)
  (async () => {
    try {
      const supabaseAuth = await isSupabaseAuthenticated();
      if (supabaseAuth) {
        const supabaseUser = await getSupabaseUser();
        if (supabaseUser) {
          useAuthStore.setState({
            isAuthenticated: true,
            user: supabaseUser.email,
            isLoading: false,
          });
          return;
        }
      }
      
      // Fallback to localStorage
      const authenticated = isAuthenticated();
      const user = getCurrentUser();
      useAuthStore.setState({
        isAuthenticated: authenticated,
        user: user,
        isLoading: false,
      });
    } catch (error) {
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  })();
  
  // Listen to Supabase auth state changes (only updates state, doesn't show loading)
  onAuthStateChange((user) => {
    if (user) {
      useAuthStore.setState({
        isAuthenticated: true,
        user: user.email,
        isLoading: false,
      });
    } else {
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  });
}

