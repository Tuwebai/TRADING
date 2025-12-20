/**
 * Rate limiting utility for Edge Functions
 * Simple in-memory rate limiter (for production, consider using Supabase Rate Limiting or Redis)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on function restart)
// For production, consider using Supabase KV or external Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, API key, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false otherwise
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute default
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // New entry or expired - reset
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });
    return {
      limited: false,
      remaining: maxRequests - 1,
      resetAt: resetTime,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: entry.resetTime,
    };
  }

  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetTime,
  };
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(req: Request): string {
  // Try to get IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || 'unknown';
  
  // Also include API key or user ID if available for more granular limiting
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  
  if (apiKey) {
    // Use hash of API key (don't store full key)
    return `api_key:${ip}`;
  }
  
  if (authHeader) {
    // Extract user ID from token if possible, otherwise use IP
    return `user:${ip}`;
  }
  
  return `ip:${ip}`;
}

