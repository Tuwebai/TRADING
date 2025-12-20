/**
 * Logger utility with environment-aware logging
 * Disables debug logs in production
 */

// @ts-ignore - Deno.env is available at runtime
const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || 
                     // @ts-ignore
                     Deno.env.get('NODE_ENV') === 'production';

export const logger = {
  debug: (...args: any[]): void => {
    if (!isProduction) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]): void => {
    console.log('[INFO]', ...args);
  },
  
  warn: (...args: any[]): void => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: any[]): void => {
    console.error('[ERROR]', ...args);
  },
  
  // Never log sensitive data
  sanitize: (data: any): any => {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sensitiveKeys = ['password', 'api_key', 'apiKey', 'secret', 'token', 'authorization', 'x-api-key'];
    const sanitized = { ...data };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = logger.sanitize(sanitized[key]);
      }
    }
    
    return sanitized;
  },
};

