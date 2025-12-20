/**
 * CORS utility for Edge Functions
 * Restricts CORS to allowed origins from environment variables
 */

/**
 * Get CORS headers based on request origin
 */
export function getCorsHeaders(origin: string | null, isProduction: boolean): Record<string, string> {
  // @ts-ignore - Deno.env is available at runtime
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv 
    ? allowedOriginsEnv.split(',').map(o => o.trim())
    : [];

  // In development, allow all origins if no ALLOWED_ORIGINS is set
  // In production, require explicit configuration
  let allowedOrigin = '*';
  
  if (isProduction) {
    if (allowedOrigins.length === 0) {
      // Fallback: use Supabase project URL if no origins configured
      // @ts-ignore
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      if (supabaseUrl) {
        allowedOrigin = supabaseUrl;
      }
    } else if (origin && allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin) {
      // Origin not in whitelist - reject
      allowedOrigin = '';
    }
  } else {
    // Development: allow all if origin matches common dev origins
    if (origin && (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('0.0.0.0') ||
      allowedOrigins.includes(origin)
    )) {
      allowedOrigin = origin;
    }
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

