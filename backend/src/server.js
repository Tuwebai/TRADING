/**
 * MT5 Trade Logger Backend Server
 * Receives trade data from MT5 Expert Advisor and stores in database
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'change-me-in-production';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Middleware
app.use(cors());
app.use(express.json());

// API Key validation middleware
const validateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key' 
    });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /trades/open
 * Receives trade open data from MT5
 */
app.post('/trades/open', validateAPIKey, async (req, res) => {
  try {
    const {
      ticket,
      trade_uid,
      symbol,
      side,
      volume,
      price_open,
      stop_loss,
      take_profit,
      time_open,
      account_mode,
      broker,
    } = req.body;

    // Validate required fields
    if (!ticket || !trade_uid || !symbol || !side || !volume || !price_open || !account_mode) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: ticket, trade_uid, symbol, side, volume, price_open, account_mode',
      });
    }

    // Validate side
    if (side !== 'buy' && side !== 'sell') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'side must be "buy" or "sell"',
      });
    }

    // Validate account_mode
    if (!['simulation', 'demo', 'live'].includes(account_mode)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'account_mode must be "simulation", "demo", or "live"',
      });
    }

    // Check if trade already exists
    const existingCheck = await pool.query(
      'SELECT id FROM trades WHERE ticket = $1 AND account_mode = $2',
      [ticket, account_mode]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Trade with this ticket already exists',
      });
    }

    // Insert trade
    const result = await pool.query(
      `INSERT INTO trades (
        trade_uid, account_mode, broker, symbol, side, volume,
        price_open, stop_loss, take_profit, opened_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id, trade_uid`,
      [
        trade_uid,
        account_mode,
        broker || null,
        symbol,
        side,
        volume,
        price_open,
        stop_loss || null,
        take_profit || null,
        new Date(parseInt(time_open) * 1000).toISOString(),
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Trade opened and recorded',
      data: {
        id: result.rows[0].id,
        trade_uid: result.rows[0].trade_uid,
      },
    });
  } catch (error) {
    console.error('Error processing trade open:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process trade open',
    });
  }
});

/**
 * POST /trades/close
 * Receives trade close data from MT5
 */
app.post('/trades/close', validateAPIKey, async (req, res) => {
  try {
    const {
      ticket,
      trade_uid,
      price_close,
      time_close,
      profit,
      commission,
      swap,
    } = req.body;

    // Validate required fields
    if (!ticket || !trade_uid || !price_close || !time_close || profit === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: ticket, trade_uid, price_close, time_close, profit',
      });
    }

    // Find trade by ticket or trade_uid
    const findTrade = await pool.query(
      'SELECT id, price_open, opened_at, stop_loss, take_profit FROM trades WHERE (ticket = $1 OR trade_uid = $2) AND closed_at IS NULL',
      [ticket, trade_uid]
    );

    if (findTrade.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Open trade not found with this ticket or trade_uid',
      });
    }

    const trade = findTrade.rows[0];
    const openedAt = new Date(trade.opened_at);
    const closedAt = new Date(parseInt(time_close) * 1000);
    const durationSeconds = Math.floor((closedAt - openedAt) / 1000);

    // Calculate R multiple
    let rMultiple = null;
    if (trade.stop_loss && trade.price_open) {
      const riskAmount = Math.abs(trade.price_open - trade.stop_loss);
      if (riskAmount > 0) {
        rMultiple = profit / riskAmount;
      }
    }

    // Determine result
    let result = 'breakeven';
    if (profit > 0) {
      result = 'win';
    } else if (profit < 0) {
      result = 'loss';
    }

    // Calculate total PnL (profit + commission + swap)
    const totalPnL = parseFloat(profit || 0) + parseFloat(commission || 0) + parseFloat(swap || 0);

    // Update trade
    await pool.query(
      `UPDATE trades SET
        price_close = $1,
        closed_at = $2,
        pnl = $3,
        commission = $4,
        swap = $5,
        result = $6,
        duration_seconds = $7,
        r_multiple = $8,
        updated_at = NOW()
      WHERE id = $9`,
      [
        price_close,
        closedAt.toISOString(),
        totalPnL,
        commission || 0,
        swap || 0,
        result,
        durationSeconds,
        rMultiple,
        trade.id,
      ]
    );

    res.json({
      success: true,
      message: 'Trade closed and updated',
      data: {
        id: trade.id,
        trade_uid,
        result,
        pnl: totalPnL,
        r_multiple: rMultiple,
        duration_seconds: durationSeconds,
      },
    });
  } catch (error) {
    console.error('Error processing trade close:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process trade close',
    });
  }
});

/**
 * GET /trades
 * Get trades with optional filters
 */
app.get('/trades', validateAPIKey, async (req, res) => {
  try {
    const { account_mode, symbol, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM trades WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (account_mode) {
      paramCount++;
      query += ` AND account_mode = $${paramCount}`;
      params.push(account_mode);
    }

    if (symbol) {
      paramCount++;
      query += ` AND symbol = $${paramCount}`;
      params.push(symbol);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch trades',
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`MT5 Trade Logger Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connections...');
  await pool.end();
  process.exit(0);
});

module.exports = app;

