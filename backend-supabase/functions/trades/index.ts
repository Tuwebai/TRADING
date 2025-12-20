/**
 * Supabase Edge Function - MT5 Trade Logger
 * Handles trade open and close requests from MT5 Expert Advisor
 * 
 * @deno-types This file is for Deno runtime (Supabase Edge Functions)
 */

// @ts-ignore - Deno types are available at runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - ESM types are available at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import shared utilities
// Note: In Supabase Edge Functions, we need to import from relative paths
// For now, we'll inline the utilities or use a different approach
// @ts-ignore
const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || 
                     // @ts-ignore
                     Deno.env.get('NODE_ENV') === 'production';

// CORS helper function
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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

// Rate limiting store (in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): { limited: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { limited: false, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: maxRequests - entry.count };
}

function getRateLimitIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const ip = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || 'unknown';
  const apiKey = req.headers.get('x-api-key');
  return apiKey ? `api_key:${ip}` : `ip:${ip}`;
}

interface TradeOpenData {
  ticket: string;
  trade_uid: string;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  price_open: number;
  stop_loss?: number;
  take_profit?: number;
  time_open: number;
  account_mode: 'simulation' | 'demo' | 'live';
  broker?: string;
}

interface TradeCloseData {
  ticket: string;
  trade_uid: string;
  price_close: number;
  time_close: number;
  profit: number;
  commission?: number;
  swap?: number;
}

interface TradeUpdatePnLData {
  ticket: string;
  trade_uid?: string;
  current_price: number;
  unrealized_pnl: number;
  current_profit: number;
  swap?: number;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting
  const rateLimitId = getRateLimitIdentifier(req);
  const rateLimit = checkRateLimit(rateLimitId, 100, 60000); // 100 requests per minute
  
  if (rateLimit.limited) {
    logger.warn('Rate limit exceeded for:', rateLimitId);
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
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const pathLower = path.toLowerCase();
    
    logger.debug('Request:', req.method, path);
    if (req.method === 'POST' && !isProduction) {
      // Only log body in development
      const bodyText = await req.clone().text();
      logger.debug('Request body length:', bodyText.length);
    }

    // Health check endpoint - check first before any auth validation
    // Supabase requires auth header, but we accept any valid Supabase auth (anon key works)
    if (req.method === 'GET' && (pathLower === '/health' || pathLower.endsWith('/health'))) {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          message: 'Edge Function is running'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate API Key for all other endpoints
    // Accept either our custom API key OR Supabase auth (for flexibility)
    const customApiKey = req.headers.get('x-api-key');
    // @ts-ignore - Deno.env is available at runtime
    const expectedApiKey = Deno.env.get('MT5_API_KEY');
    
    // Validate MT5_API_KEY is configured (if custom API key auth is used)
    if (customApiKey && !expectedApiKey) {
      logger.error('MT5_API_KEY environment variable is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Error', 
          message: 'Server configuration error. Please contact administrator.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Validate API key format if provided
    if (expectedApiKey && expectedApiKey.length < 32) {
      logger.error('MT5_API_KEY is too short (minimum 32 characters required)');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Error', 
          message: 'Server configuration error. Please contact administrator.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Check if Supabase auth is present (anon key or service role)
    const supabaseAuth = req.headers.get('authorization') || req.headers.get('apikey');
    
    // Validate: must have either valid custom API key OR Supabase auth
    // Use constant-time comparison to prevent timing attacks
    let hasValidCustomKey = false;
    if (customApiKey && expectedApiKey) {
      // Constant-time comparison
      if (customApiKey.length === expectedApiKey.length) {
        let matches = true;
        for (let i = 0; i < customApiKey.length; i++) {
          if (customApiKey[i] !== expectedApiKey[i]) {
            matches = false;
          }
        }
        hasValidCustomKey = matches;
      }
    }
    
    const hasSupabaseAuth = !!supabaseAuth; // Supabase validates this before our code runs
    
    if (!hasValidCustomKey && !hasSupabaseAuth) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Invalid or missing API key. Please provide x-api-key header with MT5_API_KEY or Supabase Authorization header.'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // If custom API key is provided but invalid, reject
    if (customApiKey && !hasValidCustomKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid API key' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    // @ts-ignore - Deno.env is available at runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore - Deno.env is available at runtime
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validate and get user_id from auth token
    // For MT5 API key auth, we'll try to find user_id from broker account association
    let userId: string | null = null;
    let authMethod: 'user' | 'api_key' = 'api_key';
    
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // Create a client with anon key to verify the token
        // @ts-ignore - Deno.env is available at runtime
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        const authClient = createClient(supabaseUrl, anonKey);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await authClient.auth.getUser(token);
        
        if (user && !authError) {
          userId = user.id;
          authMethod = 'user';
        } else {
          logger.warn('Token verification failed:', authError?.message);
        }
      } catch (error) {
        logger.warn('Error verifying auth token:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    // For API key auth, log that we'll try to find user_id from broker association
    if (!userId && hasValidCustomKey) {
      logger.debug('Using API key auth, will attempt to find user_id from broker account association');
    }

    // Route handling
    if (req.method === 'POST' && path.endsWith('/trades/open')) {
      return await handleTradeOpen(req, supabase, userId);
    } else if (req.method === 'POST' && path.endsWith('/trades/close')) {
      return await handleTradeClose(req, supabase, userId);
    } else if (req.method === 'POST' && path.endsWith('/trades/update-pnl')) {
      return await handleTradeUpdatePnL(req, supabase, userId);
    } else if (req.method === 'GET' && path.endsWith('/trades')) {
      return await handleGetTrades(req, supabase, url, userId);
    } else {
      return new Response(
        JSON.stringify({ error: 'Not Found', message: 'Endpoint not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    logger.error('Unhandled error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Handle trade open
 */
async function handleTradeOpen(req: Request, supabase: any, userId: string | null = null) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  let data: TradeOpenData;
  let bodyText = '';
  
  try {
    // Read body as text first to handle any extra content
    bodyText = await req.text();
    logger.debug('Raw request body length:', bodyText.length);
    if (!isProduction) {
      logger.debug('Raw request body (first 500 chars):', bodyText.substring(0, 500));
      if (bodyText.length > 500) {
        logger.debug('Raw request body (last 200 chars):', bodyText.substring(bodyText.length - 200));
      }
    }
    
    // Try to find the JSON part (might have extra content before/after)
    // Remove any leading/trailing whitespace and try to extract JSON
    const trimmedBody = bodyText.trim();
    
    // Find the first { and last } to extract JSON object
    const firstBrace = trimmedBody.indexOf('{');
    const lastBrace = trimmedBody.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      throw new Error('No valid JSON object found in request body');
    }
    
    // Extract just the JSON part
    const jsonText = trimmedBody.substring(firstBrace, lastBrace + 1);
    logger.debug('Extracted JSON length:', jsonText.length);
    logger.debug('Extracted JSON:', jsonText);
    
    // Parse the cleaned JSON
    data = JSON.parse(jsonText);
    logger.debug('Parsed trade open data');
  } catch (error) {
    logger.error('JSON parse error:', error instanceof Error ? error.message : 'Unknown error');
    const bodyPreview = bodyText ? bodyText.substring(0, 500) : 'Unable to read body';
    
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid JSON in request body: ' + (error instanceof Error ? error.message : 'Unknown error'),
        bodyPreview: bodyPreview,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate required fields (trade_uid can be empty, we'll generate it)
  const missingFields: string[] = [];
  if (!data.ticket) missingFields.push('ticket');
  if (!data.symbol) missingFields.push('symbol');
  if (!data.side) missingFields.push('side');
  if (data.volume === undefined || data.volume === null) missingFields.push('volume');
  if (data.price_open === undefined || data.price_open === null) missingFields.push('price_open');
  if (!data.account_mode) missingFields.push('account_mode');

  if (missingFields.length > 0) {
    logger.warn('Missing required fields:', missingFields.join(', '));
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        received: {
          ticket: data.ticket || 'missing',
          symbol: data.symbol || 'missing',
          side: data.side || 'missing',
          volume: data.volume ?? 'missing',
          price_open: data.price_open ?? 'missing',
          account_mode: data.account_mode || 'missing',
        }
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Generate trade_uid if not provided or empty
  let tradeUid = data.trade_uid;
  if (!tradeUid || (typeof tradeUid === 'string' && tradeUid.trim() === '')) {
    tradeUid = `MT5_${data.account_mode}_${data.ticket}_${Date.now()}`;
  }

  // If no userId from auth token, try to find it from broker account association
  // This is for MT5 API key authentication where we need to associate trades with users
  if (!userId && data.broker && data.account_mode) {
    // First try broker_accounts (new system)
    const { data: brokerAccount, error: brokerError } = await supabase
      .from('broker_accounts')
      .select('user_id')
      .eq('broker', data.broker)
      .eq('account_type', data.account_mode)
      .in('status', ['connected', 'pending_verification'])
      .maybeSingle();
    
    if (brokerAccount && !brokerError) {
      userId = brokerAccount.user_id;
      logger.debug('Found user_id from broker_accounts association:', userId);
    } else {
      // Fallback to mt5_accounts (legacy system)
      const { data: mt5Account, error: mt5Error } = await supabase
        .from('mt5_accounts')
        .select('user_id')
        .eq('broker', data.broker)
        .eq('account_mode', data.account_mode)
        .eq('is_active', true)
        .maybeSingle();
      
      if (mt5Account && !mt5Error) {
        userId = mt5Account.user_id;
        logger.debug('Found user_id from MT5 account association (legacy):', userId);
      } else {
        // Log warning but don't fail - trade will be created without user_id
        // This allows MT5 trades to be logged even if broker account isn't configured
        logger.warn('Could not find user_id for broker:', data.broker, 'account_mode:', data.account_mode);
        logger.warn('Trade will be created without user_id association');
      }
    }
  }
  
  // Validate user_id is present for user-authenticated requests
  // For API key auth, user_id is optional (may be null if broker account not configured)
  // But we should log this for monitoring
  if (!userId) {
    logger.warn('Trade created without user_id - ensure broker account is properly configured');
  }

  // Validate side
  if (data.side !== 'buy' && data.side !== 'sell') {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'side must be "buy" or "sell"',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate account_mode
  if (!['simulation', 'demo', 'live'].includes(data.account_mode)) {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'account_mode must be "simulation", "demo", or "live"',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Check if trade already exists
  const { data: existing, error: checkError } = await supabase
    .from('trades')
    .select('id, trade_uid')
    .eq('ticket', data.ticket)
    .eq('account_mode', data.account_mode)
    .single();

  // If trade already exists, return success (idempotency)
  // This handles retries and duplicate requests gracefully
  if (existing && !checkError) {
    logger.info('Trade already exists, returning existing trade. Ticket:', data.ticket);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trade already exists (idempotent response)',
        data: {
          id: existing.id,
          trade_uid: existing.trade_uid,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Calculate Risk/Reward ratio if SL and TP are provided
  let rMultiple: number | null = null;
  if (data.stop_loss && data.take_profit && data.price_open) {
    const isLong = data.side === 'buy';
    let risk: number;
    let reward: number;
    
    if (isLong) {
      risk = data.price_open - data.stop_loss;
      reward = data.take_profit - data.price_open;
    } else {
      // Short position
      risk = data.stop_loss - data.price_open;
      reward = data.price_open - data.take_profit;
    }
    
    if (risk > 0) {
      rMultiple = reward / risk;
    }
  }

  // Insert trade
  const insertData: any = {
    ticket: data.ticket,
    trade_uid: tradeUid,
    account_mode: data.account_mode,
    broker: data.broker || null,
    symbol: data.symbol,
    side: data.side,
    volume: data.volume,
    price_open: data.price_open,
    stop_loss: data.stop_loss || null,
    take_profit: data.take_profit || null,
    r_multiple: rMultiple,
    opened_at: new Date(data.time_open * 1000).toISOString(),
  };
  
  // Add user_id if available (from auth token or broker association)
  // Always set user_id if we have it - this ensures proper data isolation
  if (userId) {
    insertData.user_id = userId;
  } else {
    // Log warning for trades without user_id
    logger.warn('Creating trade without user_id - this may indicate misconfiguration');
  }
  
  const { data: trade, error: insertError } = await supabase
    .from('trades')
    .insert(insertData)
    .select('id, trade_uid')
    .single();

  if (insertError) {
    logger.error('Insert error:', insertError);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to insert trade: ' + (insertError.message || JSON.stringify(insertError)),
        details: insertError,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Update broker_account status if this is the first trade from this account
  if (trade && !insertError && data.broker && userId) {
    // Find broker account that matches this trade
    // Build query to match broker and account_type
    let brokerQuery = supabase
      .from('broker_accounts')
      .select('id, status, platform')
      .eq('user_id', userId)
      .eq('broker', data.broker)
      .eq('account_type', data.account_mode)
      .eq('integration_type', 'ea')
      .in('status', ['pending_verification', 'error']);

    const { data: brokerAccounts } = await brokerQuery;

    // If found, update the first matching account to connected
    if (brokerAccounts && brokerAccounts.length > 0) {
      const brokerAccount = brokerAccounts[0]; // Take the first match
      
      if (brokerAccount.status === 'pending_verification') {
        await supabase
          .from('broker_accounts')
          .update({
            status: 'connected',
            last_sync_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', brokerAccount.id);
        
        logger.info('Updated broker account status to connected:', brokerAccount.id, 'for broker:', data.broker);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Trade opened and recorded',
      data: {
        id: trade.id,
        trade_uid: trade.trade_uid,
      },
    }),
    {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle trade close
 */
async function handleTradeClose(req: Request, supabase: any, userId: string | null = null) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  let data: TradeCloseData;
  let bodyText = '';
  
  try {
    // Read body as text first to handle any extra content
    bodyText = await req.text();
    logger.debug('Raw request body length:', bodyText.length);
    if (!isProduction) {
      logger.debug('Raw request body (first 500 chars):', bodyText.substring(0, 500));
      if (bodyText.length > 500) {
        logger.debug('Raw request body (last 200 chars):', bodyText.substring(bodyText.length - 200));
      }
    }
    
    // Try to find the JSON part (might have extra content before/after)
    // Remove any leading/trailing whitespace and try to extract JSON
    const trimmedBody = bodyText.trim();
    
    // Find the first { and last } to extract JSON object
    const firstBrace = trimmedBody.indexOf('{');
    const lastBrace = trimmedBody.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      throw new Error('No valid JSON object found in request body');
    }
    
    // Extract just the JSON part
    const jsonText = trimmedBody.substring(firstBrace, lastBrace + 1);
    logger.debug('Extracted JSON length:', jsonText.length);
    logger.debug('Extracted JSON:', jsonText);
    
    // Parse the cleaned JSON
    data = JSON.parse(jsonText);
    logger.debug('Parsed trade close data');
  } catch (error) {
    logger.error('JSON parse error:', error instanceof Error ? error.message : 'Unknown error');
    const bodyPreview = bodyText ? bodyText.substring(0, 500) : 'Unable to read body';
    
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid JSON in request body: ' + (error instanceof Error ? error.message : 'Unknown error'),
        bodyPreview: bodyPreview,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate required fields (trade_uid is optional - we can find by ticket only)
  const missingFields: string[] = [];
  if (!data.ticket) missingFields.push('ticket');
  if (data.price_close === undefined || data.price_close === null) missingFields.push('price_close');
  if (!data.time_close) missingFields.push('time_close');
  if (data.profit === undefined || data.profit === null) missingFields.push('profit');

  if (missingFields.length > 0) {
    logger.warn('Missing required fields:', missingFields.join(', '));
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        received: {
          ticket: data.ticket || 'missing',
          trade_uid: data.trade_uid || 'empty (optional)',
          price_close: data.price_close ?? 'missing',
          time_close: data.time_close || 'missing',
          profit: data.profit ?? 'missing',
        }
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Find trade by ticket (primary) or trade_uid (if provided)
  // First, let's search without the closed_at filter to see all trades
  logger.debug('Searching for trade to close:', {
    ticket: data.ticket,
    trade_uid: data.trade_uid || 'not provided',
  });
  
  // Try to find trade by ticket first (including closed ones to see what's there)
  const { data: allTradesByTicket, error: ticketError } = await supabase
    .from('trades')
    .select('id, ticket, trade_uid, closed_at, account_mode')
    .eq('ticket', data.ticket);
  
  logger.debug('Trades found by ticket:', {
    count: allTradesByTicket?.length || 0,
    trades: allTradesByTicket?.map(t => ({
      id: t.id,
      ticket: t.ticket,
      trade_uid: t.trade_uid,
      closed_at: t.closed_at,
      account_mode: t.account_mode,
    })),
    error: ticketError?.message,
  });
  
  // Now search for open trade
  let query = supabase
    .from('trades')
    .select('id, price_open, opened_at, stop_loss, take_profit, account_mode, ticket, trade_uid, side')
    .is('closed_at', null);
  
  // Build search condition: ticket OR trade_uid (if provided)
  if (data.trade_uid && data.trade_uid.trim() !== '') {
    query = query.or(`ticket.eq.${data.ticket},trade_uid.eq.${data.trade_uid}`);
  } else {
    // Only search by ticket if trade_uid not provided
    query = query.eq('ticket', data.ticket);
  }
  
  const { data: trade, error: findError } = await query.single();
  
  logger.debug('Open trade search result:', {
    found: !!trade,
    tradeId: trade?.id,
    ticket: trade?.ticket,
    trade_uid: trade?.trade_uid,
    error: findError?.message,
    errorCode: findError?.code,
  });

  if (!trade || findError) {
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: 'Open trade not found with this ticket or trade_uid',
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Calculate duration
  const openedAt = new Date(trade.opened_at);
  const closedAt = new Date(data.time_close * 1000);
  const durationSeconds = Math.floor((closedAt.getTime() - openedAt.getTime()) / 1000);

  // Calculate Risk/Reward ratio (R multiple)
  let rMultiple: number | null = null;
  if (trade.stop_loss && trade.take_profit && trade.price_open) {
    // Determine if it's a long or short position
    const isLong = trade.side === 'buy';
    
    let risk: number;
    let reward: number;
    
    if (isLong) {
      risk = trade.price_open - trade.stop_loss;
      reward = trade.take_profit - trade.price_open;
    } else {
      // Short position
      risk = trade.stop_loss - trade.price_open;
      reward = trade.price_open - trade.take_profit;
    }
    
    if (risk > 0) {
      rMultiple = reward / risk;
    }
  } else if (trade.stop_loss && trade.price_open) {
    // Fallback: calculate R multiple based on actual PnL vs risk (for closed trades without TP)
    const isLong = trade.side === 'buy';
    const riskAmount = isLong 
      ? trade.price_open - trade.stop_loss 
      : trade.stop_loss - trade.price_open;
    if (riskAmount > 0) {
      rMultiple = data.profit / riskAmount;
    }
  }

  // Determine result
  let result = 'breakeven';
  if (data.profit > 0) {
    result = 'win';
  } else if (data.profit < 0) {
    result = 'loss';
  }

  // Calculate total PnL
  const totalPnL = data.profit + (data.commission || 0) + (data.swap || 0);

  // Update trade
  logger.debug('Updating trade with data:', {
    tradeId: trade.id,
    price_close: data.price_close,
    closed_at: closedAt.toISOString(),
    pnl: totalPnL,
    commission: data.commission || 0,
    swap: data.swap || 0,
    result: result,
    duration_seconds: durationSeconds,
    r_multiple: rMultiple || null,
  });
  
  const { data: updatedTrade, error: updateError } = await supabase
    .from('trades')
    .update({
      price_close: data.price_close,
      closed_at: closedAt.toISOString(),
      pnl: totalPnL,
      commission: data.commission || 0,
      swap: data.swap || 0,
      result: result,
      duration_seconds: durationSeconds,
      r_multiple: rMultiple || null,
    })
    .eq('id', trade.id)
    .select('id, trade_uid, result, pnl, r_multiple, duration_seconds, closed_at, price_close')
    .single();

  if (updateError) {
    logger.error('Update error:', updateError);
    if (!isProduction) {
      logger.error('Update error details:', JSON.stringify(updateError, null, 2));
    }
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to update trade: ' + (updateError.message || JSON.stringify(updateError)),
        details: updateError,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  logger.info('Trade updated successfully:', {
    id: updatedTrade.id,
    closed_at: updatedTrade.closed_at,
    price_close: updatedTrade.price_close,
    pnl: updatedTrade.pnl,
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Trade closed and updated',
      data: {
        id: updatedTrade.id,
        trade_uid: updatedTrade.trade_uid,
        result: updatedTrade.result,
        pnl: updatedTrade.pnl,
        r_multiple: updatedTrade.r_multiple,
        duration_seconds: updatedTrade.duration_seconds,
      },
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle trade P&L update (for open positions)
 */
async function handleTradeUpdatePnL(req: Request, supabase: any, userId: string | null = null) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  let data: TradeUpdatePnLData;
  let bodyText = '';
  
  try {
    bodyText = await req.text();
    const trimmedBody = bodyText.trim();
    const firstBrace = trimmedBody.indexOf('{');
    const lastBrace = trimmedBody.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      throw new Error('No valid JSON object found in request body');
    }
    
    const jsonText = trimmedBody.substring(firstBrace, lastBrace + 1);
    data = JSON.parse(jsonText);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid JSON in request body: ' + (error instanceof Error ? error.message : 'Unknown error'),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate required fields
  if (!data.ticket) {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Missing required field: ticket',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Find trade by ticket
  let query = supabase
    .from('trades')
    .select('id, ticket, trade_uid, price_open, stop_loss, take_profit, side')
    .is('closed_at', null); // Only update open trades

  if (data.trade_uid && data.trade_uid.trim() !== '') {
    query = query.or(`ticket.eq.${data.ticket},trade_uid.eq.${data.trade_uid}`);
  } else {
    query = query.eq('ticket', data.ticket);
  }

  const { data: trade, error: findError } = await query.single();

  if (!trade || findError) {
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: 'Open trade not found with this ticket or trade_uid',
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Calculate unrealized P&L percentage and check if alerts should be triggered
  let alert_triggered = false;
  let alert_type: string | null = null;
  
  if (trade.stop_loss && trade.take_profit && trade.price_open) {
    const isLong = trade.side === 'buy';
    const currentPrice = data.current_price;
    
    // Check if TP or SL is reached
    if (isLong) {
      if (currentPrice >= trade.take_profit) {
        alert_triggered = true;
        alert_type = 'take_profit_reached';
      } else if (currentPrice <= trade.stop_loss) {
        alert_triggered = true;
        alert_type = 'stop_loss_reached';
      }
    } else {
      // Short position
      if (currentPrice <= trade.take_profit) {
        alert_triggered = true;
        alert_type = 'take_profit_reached';
      } else if (currentPrice >= trade.stop_loss) {
        alert_triggered = true;
        alert_type = 'stop_loss_reached';
      }
    }
  }

  // Update trade with current P&L
  const { data: updatedTrade, error: updateError } = await supabase
    .from('trades')
    .update({
      // Store unrealized P&L in a JSONB field or use a custom column
      // For now, we'll update the pnl field (even though it's unrealized)
      // In a production system, you might want a separate unrealized_pnl column
      pnl: data.unrealized_pnl,
      // Store current price and swap for real-time tracking
      // Note: These fields might need to be added to the schema
      updated_at: new Date().toISOString(),
    })
    .eq('id', trade.id)
    .select('id, ticket, trade_uid, pnl')
    .single();

  if (updateError) {
    logger.error('Update P&L error:', updateError);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to update trade P&L: ' + (updateError.message || JSON.stringify(updateError)),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Trade P&L updated',
      data: {
        id: updatedTrade.id,
        ticket: updatedTrade.ticket,
        trade_uid: updatedTrade.trade_uid,
        unrealized_pnl: data.unrealized_pnl,
        current_price: data.current_price,
        alert_triggered,
        alert_type,
      },
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle get trades
 * Requires user authentication or valid API key
 * For user auth: returns only user's trades
 * For API key: returns all trades (for MT5 monitoring)
 */
async function handleGetTrades(req: Request, supabase: any, url: URL, userId: string | null = null) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const accountMode = url.searchParams.get('account_mode');
  const symbol = url.searchParams.get('symbol');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Build query with user filtering if userId is available
  let query = supabase
    .from('trades')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // If user is authenticated, filter by user_id for security
  // This ensures users can only see their own trades
  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    // For API key auth without user_id, allow all trades but log for monitoring
    logger.warn('GET /trades called without user_id - returning all trades (API key auth)');
  }

  if (accountMode) {
    query = query.eq('account_mode', accountMode);
  }

  if (symbol) {
    query = query.eq('symbol', symbol);
  }

  const { data: trades, error } = await query;

  if (error) {
    logger.error('Query error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to fetch trades',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      count: trades?.length || 0,
      data: trades || [],
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

