/**
 * Supabase Edge Function - Encrypt/Decrypt Broker Credentials
 * Handles encryption and decryption of broker API keys and secrets
 * 
 * @deno-types This file is for Deno runtime (Supabase Edge Functions)
 */

// @ts-ignore - Deno types are available at runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - ESM types are available at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore
const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || 
                     // @ts-ignore
                     Deno.env.get('NODE_ENV') === 'production';

// CORS helper
function getCorsHeaders(origin: string | null): Record<string, string> {
  // @ts-ignore
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv 
    ? allowedOriginsEnv.split(',').map((o: string) => o.trim())
    : [];

  let allowedOrigin = '*';
  
  if (isProduction) {
    if (allowedOrigins.length === 0) {
      // @ts-ignore
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      if (supabaseUrl) {
        allowedOrigin = supabaseUrl;
      }
    } else if (origin && allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin) {
      allowedOrigin = '';
    }
  } else {
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

// Logger helper
const logger = {
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
};

/**
 * Encrypt data using AES-256-GCM
 */
async function encrypt(plaintext: string, key: Uint8Array): Promise<string> {
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );
  
  // Combine IV + encrypted data + auth tag (last 16 bytes)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-256-GCM
 */
async function decrypt(ciphertext: string, key: Uint8Array): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes)
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

/**
 * Get encryption key from environment
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Uint8Array {
  // @ts-ignore - Deno.env is available at runtime
  const keyString = Deno.env.get('ENCRYPTION_KEY');
  
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // Convert hex string to Uint8Array
  // Key should be 64 hex characters (32 bytes)
  if (keyString.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(keyString.substr(i * 2, 2), 16);
  }
  
  return key;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  // Rate limiting (simple in-memory)
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const ip = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || 'unknown';
  const rateLimitId = `encrypt:${ip}`;
  
  const now = Date.now();
  const entry = rateLimitStore.get(rateLimitId);
  const maxRequests = 50; // Lower limit for encryption endpoint
  const windowMs = 60000; // 1 minute
  
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(rateLimitId, { count: 1, resetTime: now + windowMs });
  } else {
    entry.count++;
    if (entry.count > maxRequests) {
      logger.warn('Rate limit exceeded for encryption endpoint:', rateLimitId);
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }
  }

  try {
    // Create Supabase client
    // @ts-ignore - Deno.env is available at runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore - Deno.env is available at runtime
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Get encryption key
    let encryptionKey: Uint8Array;
    try {
      encryptionKey = getEncryptionKey();
    } catch (error) {
      logger.error('Encryption key error:', error instanceof Error ? error.message : 'Unknown error');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Error', 
          message: 'Server encryption configuration error' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Route: POST /encrypt
    if (req.method === 'POST' && path.endsWith('/encrypt')) {
      const { apiKey, apiSecret } = await req.json();
      
      if (!apiKey && !apiSecret) {
        return new Response(
          JSON.stringify({ error: 'Bad Request', message: 'apiKey or apiSecret required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      try {
        const result: any = {};
        
        if (apiKey) {
          result.api_key_encrypted = await encrypt(apiKey, encryptionKey);
        }
        
        if (apiSecret) {
          result.api_secret_encrypted = await encrypt(apiSecret, encryptionKey);
        }
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        logger.error('Encryption error:', error instanceof Error ? error.message : 'Unknown error');
        return new Response(
          JSON.stringify({ 
            error: 'Internal Server Error', 
            message: 'Failed to encrypt credentials' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Route: POST /decrypt (only for backend use, requires service role)
    if (req.method === 'POST' && path.endsWith('/decrypt')) {
      // Verify this is a service role request (for backend use only)
      const serviceRoleHeader = req.headers.get('x-service-role');
      // @ts-ignore
      const expectedServiceRole = Deno.env.get('SERVICE_ROLE_SECRET');
      
      if (!serviceRoleHeader || serviceRoleHeader !== expectedServiceRole) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'Decryption requires service role' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      const { api_key_encrypted, api_secret_encrypted } = await req.json();
      
      if (!api_key_encrypted && !api_secret_encrypted) {
        return new Response(
          JSON.stringify({ error: 'Bad Request', message: 'Encrypted credentials required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      try {
        const result: any = {};
        
        if (api_key_encrypted) {
          result.apiKey = await decrypt(api_key_encrypted, encryptionKey);
        }
        
        if (api_secret_encrypted) {
          result.apiSecret = await decrypt(api_secret_encrypted, encryptionKey);
        }
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        logger.error('Decryption error:', error instanceof Error ? error.message : 'Unknown error');
        return new Response(
          JSON.stringify({ 
            error: 'Internal Server Error', 
            message: 'Failed to decrypt credentials' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Route not found
    return new Response(
      JSON.stringify({ error: 'Not Found', message: 'Endpoint not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Unhandled error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

