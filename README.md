# Trading Log System

A comprehensive, full-featured trading log system built with React, TypeScript, and TailwindCSS. This application allows traders to track their trades, manage routines, analyze performance, and optimize their trading strategy.

## Features

### Core Features

- **Trade Log Management**
  - Full CRUD operations for trades
  - Auto-calculation of PnL and Risk/Reward ratios
  - Support for long/short positions
  - Entry/exit price tracking
  - Position size and leverage management
  - Stop loss and take profit levels
  - Trade notes and screenshots (placeholder)
  - Filter trades by date, asset, win/loss, and status
  - Close open positions

- **Routines & Performance Module**
  - Morning routine checklist
  - Pre-market checklist
  - Pre-trade checklist
  - Post-trade review
  - End-of-day summary
  - Add, edit, delete, and reorder checklist items
  - Progress tracking

- **Analytics Dashboard**
  - Real-time win rate calculation
  - Average R (Risk/Reward) metrics
  - Average PnL per trade
  - Maximum win/loss streaks
  - Profit factor calculation
  - Equity curve visualization
  - Comprehensive performance statistics

- **Settings**
  - Account size configuration
  - Base currency selection
  - Risk per trade percentage
  - Light/dark theme toggle

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Recharts** - Charting library
- **Lucide React** - Icons

## Project Structure

```
src/
 ├─ components/        # Reusable UI components
 │  ├─ ui/            # Base UI components (Button, Input, Card, etc.)
 │  ├─ layout/        # Layout components (Sidebar, Layout)
 │  ├─ trades/        # Trade-related components
 │  └─ routines/      # Routine-related components
 ├─ pages/            # Page components
 ├─ features/         # Feature-specific modules
 ├─ hooks/            # Custom React hooks
 ├─ lib/              # Utility functions and helpers
 │  ├─ storage.ts     # Storage abstraction layer
 │  ├─ calculations.ts # Trading calculations
 │  └─ utils.ts       # General utilities
 ├─ store/            # Zustand stores
 │  ├─ tradeStore.ts
 │  ├─ routineStore.ts
 │  └─ settingsStore.ts
 └─ types/            # TypeScript type definitions
    └─ Trading.ts     # All trading-related types
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Architecture

### Storage Abstraction

The application uses a storage abstraction layer (`/lib/storage.ts`) that currently uses localStorage. This design allows for easy migration to a real database by only modifying this single file.

### State Management

Zustand stores manage:
- **Trade Store**: All trade-related state and operations
- **Routine Store**: Checklist and routine management
- **Settings Store**: Application settings and theme

### Calculations

All trading calculations are centralized in `/lib/calculations.ts`:
- `calculatePNL()` - Profit and Loss
- `calculateRR()` - Risk/Reward ratio
- `calculateWinRate()` - Win rate percentage
- `calculateProfitFactor()` - Profit factor
- `generateEquityCurve()` - Equity curve data

## Usage

### Adding a Trade

1. Navigate to the Trades page
2. Click "Add Trade"
3. Fill in the required fields (Asset, Entry Price, Position Size, etc.)
4. Optionally set stop loss, take profit, and leverage
5. Add notes if needed
6. Click "Add Trade" to save

### Managing Routines

1. Navigate to the Routines page
2. Select a routine type (Morning, Pre-market, etc.)
3. Add items to your checklist
4. Mark items as complete as you go
5. Edit or delete items as needed

### Viewing Analytics

1. Navigate to the Analytics page
2. View real-time metrics calculated from your trades
3. See your equity curve visualization
4. Track your performance over time

## Future Enhancements

- Database integration (replace localStorage)
- Screenshot upload functionality
- Export/import trades
- Advanced filtering and sorting
- Trade journal templates
- Performance reports
- Mobile app version

## License

MIT

