/**
 * Global keyboard shortcuts hook
 * Handles keyboard shortcuts throughout the application
 */

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac
  handler: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        // Check if the key matches
        const isKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!isKey) return;

        // Check modifiers - if specified, must match; if not specified, must not be pressed
        const ctrlMatch = shortcut.ctrl !== undefined 
          ? (shortcut.ctrl && (event.ctrlKey || event.metaKey)) || (!shortcut.ctrl && !event.ctrlKey && !event.metaKey)
          : !event.ctrlKey && !event.metaKey;
        
        const shiftMatch = shortcut.shift !== undefined
          ? shortcut.shift === event.shiftKey
          : !event.shiftKey;
        
        const altMatch = shortcut.alt !== undefined
          ? shortcut.alt === event.altKey
          : !event.altKey;

        if (!ctrlMatch || !shiftMatch || !altMatch) return;

        // Check if we're in an input, textarea, or contenteditable
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;

        // Allow shortcuts even in inputs for global shortcuts like Ctrl+K
        const allowInInput = shortcut.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey);

        if (!isInput || allowInInput) {
          event.preventDefault();
          shortcut.handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

/**
 * Simplified hook for common shortcuts
 */
export const useCommonShortcuts = (handlers: {
  onSearch?: () => void;
  onNewTrade?: () => void;
  onSave?: () => void;
  onClose?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onSearch) {
    shortcuts.push({
      key: 'k',
      ctrl: true,
      handler: handlers.onSearch,
      description: 'Búsqueda global',
    });
  }

  if (handlers.onNewTrade) {
    shortcuts.push({
      key: 'n',
      ctrl: true,
      handler: handlers.onNewTrade,
      description: 'Nueva operación',
    });
  }

  if (handlers.onSave) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      handler: handlers.onSave,
      description: 'Guardar',
    });
  }

  if (handlers.onClose) {
    shortcuts.push({
      key: 'Escape',
      handler: handlers.onClose,
      description: 'Cerrar',
    });
  }

  useKeyboardShortcuts(shortcuts);
};

