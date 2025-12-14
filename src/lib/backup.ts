/**
 * Automatic backup system
 * Creates daily backups of trading data
 */

import { saveBackupToLocalStorage } from './export';
import type { Trade } from '@/types/Trading';

const BACKUP_KEY = 'trading_last_backup_date';

/**
 * Check if backup is needed and perform it
 */
export function performBackupIfNeeded(trades: Trade[]): void {
  try {
    const lastBackupDate = localStorage.getItem(BACKUP_KEY);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (!lastBackupDate || lastBackupDate !== today) {
      // Perform backup
      saveBackupToLocalStorage(trades);
      localStorage.setItem(BACKUP_KEY, today);
      console.log('Backup automático realizado:', today);
    }
  } catch (error) {
    console.error('Error en backup automático:', error);
  }
}

/**
 * Initialize automatic backup system
 * Should be called on app startup
 */
export function initializeBackupSystem(trades: Trade[]): void {
  // Perform initial backup check
  performBackupIfNeeded(trades);

  // Set up interval to check every hour
  setInterval(() => {
    performBackupIfNeeded(trades);
  }, 60 * 60 * 1000); // Check every hour
}

/**
 * Get all available backups
 */
export function getAvailableBackups(): Array<{ date: string; data: string }> {
  const keys = Object.keys(localStorage);
  const backupKeys = keys.filter(k => k.startsWith('trading_backup_')).sort().reverse();
  
  return backupKeys.map(key => {
    const date = key.replace('trading_backup_', '');
    const data = localStorage.getItem(key) || '';
    return { date, data };
  });
}

/**
 * Restore from backup
 */
export function restoreFromBackup(backupData: string): Trade[] {
  try {
    const data = JSON.parse(backupData);
    const trades = Array.isArray(data) ? data : (data.trades || []);
    return trades;
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw new Error('Error al restaurar el backup');
  }
}

