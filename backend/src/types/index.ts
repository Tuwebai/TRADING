/**
 * Type definitions for MT5 Trade Logger Backend
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extended Express Request with API key validation
 */
export interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

/**
 * Account mode types
 */
export type AccountMode = 'simulation' | 'demo' | 'live';

/**
 * Trade side types
 */
export type TradeSide = 'buy' | 'sell';

/**
 * Trade result types
 */
export type TradeResult = 'win' | 'loss' | 'breakeven';

/**
 * Request body for opening a trade
 */
export interface TradeOpenRequest {
  ticket: number;
  trade_uid: string;
  symbol: string;
  side: TradeSide;
  volume: number;
  price_open: number;
  stop_loss?: number;
  take_profit?: number;
  time_open: number; // Unix timestamp in seconds
  account_mode: AccountMode;
  broker?: string;
}

/**
 * Request body for closing a trade
 */
export interface TradeCloseRequest {
  ticket: number;
  trade_uid: string;
  price_close: number;
  time_close: number; // Unix timestamp in seconds
  profit: number;
  commission?: number;
  swap?: number;
}

/**
 * Query parameters for getting trades
 */
export interface TradeQueryParams {
  account_mode?: AccountMode;
  symbol?: string;
  limit?: string;
  offset?: string;
}

/**
 * Database trade record
 */
export interface TradeRecord {
  id: number;
  trade_uid: string;
  ticket?: number;
  account_mode: AccountMode;
  broker?: string;
  symbol: string;
  side: TradeSide;
  volume: number;
  price_open: number;
  price_close?: number;
  stop_loss?: number;
  take_profit?: number;
  opened_at: Date;
  closed_at?: Date;
  pnl?: number;
  commission?: number;
  swap?: number;
  result?: TradeResult;
  duration_seconds?: number;
  r_multiple?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

/**
 * Trade open response
 */
export interface TradeOpenResponse {
  id: number;
  trade_uid: string;
}

/**
 * Trade close response
 */
export interface TradeCloseResponse {
  id: number;
  trade_uid: string;
  result: TradeResult;
  pnl: number;
  r_multiple: number | null;
  duration_seconds: number;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Express middleware type
 */
export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Authenticated middleware type
 */
export type AuthenticatedMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

