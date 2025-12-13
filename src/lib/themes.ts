/**
 * Theme definitions and management
 * Centralized theme configuration for the entire application
 */

import type { ThemeConfig, ThemeName } from '@/types/Trading';

/**
 * Predefined themes
 */
export const predefinedThemes: Record<ThemeName, ThemeConfig> = {
  'light': {
    name: 'Claro',
    primary: '221.2 83.2% 53.3%',
    secondary: '210 40% 96.1%',
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    muted: '210 40% 96.1%',
    accent: '210 40% 96.1%',
    destructive: '0 84.2% 60.2%',
    border: '214.3 31.8% 91.4%',
    profitColor: '142 76% 36%', // Verde para ganancias
    lossColor: '0 84.2% 60.2%', // Rojo para pérdidas
  },
  'dark': {
    name: 'Oscuro',
    primary: '217.2 91.2% 59.8%',
    secondary: '217.2 32.6% 17.5%',
    background: '222.2 84% 4.9%',
    foreground: '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    accent: '217.2 32.6% 17.5%',
    destructive: '0 62.8% 30.6%',
    border: '217.2 32.6% 17.5%',
    profitColor: '142 71% 45%', // Verde más claro para dark mode
    lossColor: '0 72% 51%', // Rojo más claro para dark mode
  },
  'high-contrast': {
    name: 'Alto Contraste',
    primary: '217.2 100% 50%',
    secondary: '0 0% 20%',
    background: '0 0% 100%',
    foreground: '0 0% 0%',
    muted: '0 0% 90%',
    accent: '0 0% 95%',
    destructive: '0 100% 50%',
    border: '0 0% 50%',
    profitColor: '120 100% 25%', // Verde muy oscuro
    lossColor: '0 100% 50%', // Rojo brillante
  },
  'trading-terminal': {
    name: 'Terminal de Trading',
    primary: '120 100% 25%', // Verde terminal
    secondary: '0 0% 10%',
    background: '0 0% 8%',
    foreground: '120 100% 50%',
    muted: '0 0% 15%',
    accent: '0 0% 12%',
    destructive: '0 100% 50%',
    border: '0 0% 20%',
    profitColor: '120 100% 40%', // Verde brillante
    lossColor: '0 100% 60%', // Rojo brillante
  },
  'custom': {
    name: 'Personalizado',
    primary: '221.2 83.2% 53.3%',
    secondary: '210 40% 96.1%',
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    muted: '210 40% 96.1%',
    accent: '210 40% 96.1%',
    destructive: '0 84.2% 60.2%',
    border: '214.3 31.8% 91.4%',
    profitColor: '142 76% 36%',
    lossColor: '0 84.2% 60.2%',
  },
};

/**
 * Apply theme to document
 */
export function applyTheme(themeName: ThemeName, customTheme: ThemeConfig | null = null): void {
  const theme = themeName === 'custom' && customTheme 
    ? customTheme 
    : predefinedThemes[themeName];

  const root = document.documentElement;
  
  // Apply CSS variables
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-foreground', theme.foreground);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--secondary-foreground', theme.foreground);
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--foreground', theme.foreground);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--muted-foreground', theme.foreground);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-foreground', theme.foreground);
  root.style.setProperty('--destructive', theme.destructive);
  root.style.setProperty('--destructive-foreground', theme.foreground);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--input', theme.border);
  root.style.setProperty('--ring', theme.primary);
  root.style.setProperty('--card', theme.background);
  root.style.setProperty('--card-foreground', theme.foreground);
  
  // Custom colors for profit/loss
  root.style.setProperty('--profit-color', theme.profitColor);
  root.style.setProperty('--loss-color', theme.lossColor);
  
  // Apply dark mode class if needed
  const isDark = themeName === 'dark' || themeName === 'trading-terminal' || 
                 (themeName === 'custom' && customTheme && 
                  parseInt(customTheme.background.split(' ')[2] || '100') < 50);
  
  root.classList.toggle('dark', isDark ?? false);
}

/**
 * Get theme configuration
 */
export function getTheme(themeName: ThemeName, customTheme: ThemeConfig | null = null): ThemeConfig {
  if (themeName === 'custom' && customTheme) {
    return customTheme;
  }
  return predefinedThemes[themeName];
}

