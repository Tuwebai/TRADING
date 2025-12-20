/**
 * Toaster Component
 * Displays toast notifications
 */

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Toast } from './use-toast';

let toastState: { toasts: Toast[] } = { toasts: [] };
let listeners: Array<() => void> = [];

const notify = () => {
  listeners.forEach((listener) => listener());
};

// Export function to add toasts (used by useToast hook)
export const addToast = (toast: Toast) => {
  toastState.toasts = [...toastState.toasts, toast];
  notify();
};

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = () => {
      setToasts([...toastState.toasts]);
    };
    listeners.push(listener);
    listener(); // Initial call
    
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const removeToast = (id: string) => {
    toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
    notify();
  };

  // Auto-remove toasts after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, 5000);
      timers.push(timer);
    });
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full md:max-w-[420px] md:bottom-4 md:right-4 p-4 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${
            toast.variant === 'destructive'
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
              : 'bg-background border-border'
          }`}
        >
          {toast.variant === 'destructive' ? (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{toast.title}</div>
            {toast.description && (
              <div className="text-sm mt-1 opacity-90">{toast.description}</div>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

