/**
 * Authentication middleware
 * Validates API key from request headers
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { AuthenticatedRequest, ErrorResponse } from '../types';

/**
 * Validate API key from environment
 */
export function validateApiKey(): string {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error('❌ ERROR: API_KEY environment variable is required');
    console.error('Please set API_KEY in your .env file or environment variables');
    console.error('You can generate a secure API key using: npm run generate:api-key');
    process.exit(1);
  }
  
  if (apiKey.length < 32) {
    console.error('❌ ERROR: API_KEY must be at least 32 characters long');
    console.error('Current length:', apiKey.length);
    console.error('You can generate a secure API key using: npm run generate:api-key');
    process.exit(1);
  }
  
  if (apiKey === 'change-me-in-production' || apiKey === 'your-secure-api-key-here-change-in-production') {
    console.error('❌ ERROR: API_KEY cannot use default/example values');
    console.error('Please generate a secure API key using: npm run generate:api-key');
    process.exit(1);
  }
  
  return apiKey;
}

/**
 * API Key validation middleware
 * Uses constant-time comparison to prevent timing attacks
 */
export function validateAPIKeyMiddleware(apiKey: string) {
  return (req: AuthenticatedRequest, res: Response<ErrorResponse>, next: NextFunction): void => {
    const providedApiKey = req.headers['x-api-key'] as string | undefined;
    
    if (!providedApiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing API key. Please provide x-api-key header.',
      });
      return;
    }
    
    // Use constant-time comparison to prevent timing attacks
    if (providedApiKey.length !== apiKey.length || 
        !crypto.timingSafeEqual(Buffer.from(providedApiKey), Buffer.from(apiKey))) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
      return;
    }
    
    req.apiKey = providedApiKey;
    next();
  };
}

