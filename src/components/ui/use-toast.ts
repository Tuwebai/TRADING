/**
 * Simple Toast Hook
 * Provides a basic toast notification system
 */

import { useCallback } from 'react';
import { addToast } from './Toaster';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, title, description, variant };
      
      addToast(newToast);
    },
    []
  );

  return { toast };
}

