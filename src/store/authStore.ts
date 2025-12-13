/**
 * Authentication store using Zustand
 * Manages authentication state across the application
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as authLogin, logout as authLogout, isAuthenticated, getCurrentUser, register as authRegister } from '@/lib/auth';

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,

      // Initialize auth state from localStorage
      checkAuth: () => {
        const authenticated = isAuthenticated();
        const user = getCurrentUser();
        set({
          isAuthenticated: authenticated,
          user: user,
        });
      },

      login: async (email: string, password: string) => {
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

      logout: () => {
        authLogout();
        set({
          isAuthenticated: false,
          user: null,
        });
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

// Initialize auth state on module load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}

