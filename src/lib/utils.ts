import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format price value (for entry/exit prices, not currency)
 * Formatea el precio como número simple, similar a TradingView
 */
export function formatPrice(value: number, decimals: number = 5): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency value (for PnL, account size, etc.)
 * Muestra el símbolo o código de moneda correcto según la moneda configurada
 * Respeta el modo estudio si está activado
 */
export function formatCurrency(
  value: number, 
  currency: string = 'USD',
  hideMoney: boolean = false
): string {
  // Modo estudio: ocultar dinero
  if (hideMoney) {
    return '***';
  }
  
  const currencyUpper = currency.toUpperCase();
  
  // Mapa de símbolos de moneda para casos especiales
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF',
    'CNY': '¥',
    'BTC': '₿',
    'ETH': 'Ξ',
  };
  
  try {
    // Para criptomonedas y casos especiales, usar formato personalizado
    if (currencyUpper === 'BTC' || currencyUpper === 'ETH') {
      return `${currencySymbols[currencyUpper] || currencyUpper} ${value.toFixed(8)}`;
    }
    
    // Para monedas tradicionales, usar Intl.NumberFormat
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currencyUpper,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
    
    return formatted;
  } catch (error) {
    // Si hay error (moneda no válida o no soportada), usar formato personalizado
    const symbol = currencySymbols[currencyUpper] || currencyUpper;
    return `${symbol} ${value.toLocaleString('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    })}`;
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-LA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('es-LA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
