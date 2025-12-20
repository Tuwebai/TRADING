# MT5 Trade Logger Backend

Backend server for MT5 Trade Logger Expert Advisor - Built with TypeScript and Express.

## Features

- ✅ Full TypeScript support with type safety
- ✅ Secure API key authentication
- ✅ PostgreSQL database integration
- ✅ Trade open/close endpoints
- ✅ Trade querying with filters
- ✅ Health check endpoint

## Prerequisites

- Node.js >= 16.0.0
- PostgreSQL database
- Environment variables configured (see `.env.example.txt`)

## Installation

```bash
npm install
```

## Configuration

1. Copy `env.example.txt` to `.env`
2. Set required environment variables:
   - `API_KEY`: Secure API key (minimum 32 characters)
   - `DATABASE_URL`: PostgreSQL connection string
   - `PORT`: Server port (default: 3000)
   - `NODE_ENV`: Environment (development/production)

## Generate API Key

```bash
npm run generate:api-key
```

This will generate a secure API key. Copy it to your `.env` file.

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production server
- `npm run dev` - Run development server with hot reload
- `npm run generate:api-key` - Generate secure API key
- `npm run generate:encryption-key` - Generate encryption key for Supabase
- `npm run clean` - Remove build directory

## API Endpoints

### Health Check
```
GET /health
```

### Open Trade
```
POST /trades/open
Headers: x-api-key: <your-api-key>
Body: {
  ticket: number,
  trade_uid: string,
  symbol: string,
  side: "buy" | "sell",
  volume: number,
  price_open: number,
  stop_loss?: number,
  take_profit?: number,
  time_open: number,
  account_mode: "simulation" | "demo" | "live",
  broker?: string
}
```

### Close Trade
```
POST /trades/close
Headers: x-api-key: <your-api-key>
Body: {
  ticket: number,
  trade_uid: string,
  price_close: number,
  time_close: number,
  profit: number,
  commission?: number,
  swap?: number
}
```

### Get Trades
```
GET /trades?account_mode=demo&symbol=EURUSD&limit=100&offset=0
Headers: x-api-key: <your-api-key>
```

## TypeScript

The backend is fully typed with TypeScript. Types are defined in `src/types/index.ts`:

- `TradeOpenRequest` - Request body for opening trades
- `TradeCloseRequest` - Request body for closing trades
- `TradeQueryParams` - Query parameters for getting trades
- `TradeRecord` - Database trade record
- `ApiResponse<T>` - Generic API response wrapper
- And more...

## Security

- API key validation with constant-time comparison
- Environment variable validation on startup
- Secure database connection with SSL in production
- Input validation on all endpoints

## Project Structure

```
backend/
├── src/
│   ├── server.ts          # Main server file
│   ├── types/
│   │   └── index.ts       # Type definitions
│   └── middleware/
│       └── auth.ts        # Authentication middleware
├── scripts/
│   ├── generate-api-key.ts
│   └── generate-encryption-key.ts
├── dist/                  # Compiled JavaScript (generated)
├── tsconfig.json          # TypeScript configuration
└── package.json
```

## License

MIT

