# Prediction Markets Implementation Guide

## Overview

This document describes the implementation of prediction markets functionality in the Swop wallet using DFlow's Pond API. The feature allows users to trade on the outcomes of future events using Solana blockchain.

## Architecture

### Frontend Structure

```
swop-desktop-app/
├── types/
│   └── prediction-markets.ts              # TypeScript type definitions
├── services/
│   └── prediction-markets/
│       └── dflow-service.ts               # DFlow API service layer
├── zustandStore/
│   └── predictionMarketsStore.ts          # Local UI state management
├── lib/
│   └── hooks/
│       └── usePredictionMarkets.ts        # React Query hooks
└── components/
    └── wallet/
        └── prediction-markets/
            ├── index.ts                   # Component exports
            ├── PredictionMarketsTab.tsx   # Main container
            ├── MarketList.tsx             # Market browsing
            ├── MarketCard.tsx             # Individual market display
            ├── MarketDetails.tsx          # Full market view
            ├── TradePanel.tsx             # Buy/sell interface
            ├── PositionsList.tsx          # User positions
            └── PositionCard.tsx           # Individual position display
```

### Backend Structure

```
swop-app-backend/
└── src/
    ├── routes/
    │   └── v5/
    │       └── predictionMarkets.js       # API routes
    └── controllers/
        └── v5/
            └── predictionMarketsController.js  # DFlow proxy controller
```

## Key Features

### 1. Market Discovery
- Browse all available prediction markets
- Filter by category, status, and sort by volume/liquidity
- Search markets by keywords
- View trending markets

### 2. Trading Interface
- Buy/sell outcome tokens
- Real-time price quotes
- Slippage control
- Price impact warnings
- Transaction execution via Solana wallet

### 3. Position Management
- View all active positions
- Track profit/loss (realized and unrealized)
- Filter positions by status (active/redeemable/all)
- Portfolio summary with total value and P&L

### 4. Redemption
- Redeem winning positions
- One-click payout for settled markets
- Transaction confirmation

## Component Details

### PredictionMarketsTab
Main container component that orchestrates the entire feature.

**Features:**
- Tab navigation (Markets, Positions, History)
- Wallet connection status display
- Market details modal
- Trade modal

**Props:** None (uses global state)

### MarketList
Displays markets with filtering and search.

**Features:**
- Grid layout for market cards
- Search bar
- Category, status, and sort filters
- Trending markets tab
- Pagination

### MarketCard
Individual market display card.

**Props:**
- `market: Market` - Market data
- `onClick?: (market: Market) => void` - Click handler

**Features:**
- Market title and description
- Outcome probabilities with progress bars
- Volume and liquidity stats
- End date countdown
- Quick trade button

### TradePanel
Trading interface for buying/selling outcome tokens.

**Props:**
- `market: Market` - Market to trade
- `solanaWalletAddress?: string` - User's Solana wallet

**Features:**
- Buy/sell toggle
- Outcome selection
- Amount input
- Slippage control slider
- Real-time quote display
- Price impact warnings
- Transaction execution

### PositionsList
Displays user's positions with portfolio summary.

**Props:**
- `walletAddress?: string` - User's wallet address

**Features:**
- Portfolio summary card (total value, P&L)
- Position filtering (active/redeemable/all)
- Grid layout for position cards
- Refresh button

### PositionCard
Individual position display.

**Props:**
- `position: Position` - Position data
- `onRedeem?: (position: Position) => void` - Redeem handler
- `onTrade?: (position: Position) => void` - Trade handler

**Features:**
- Market title and outcome
- Share count and average price
- Current value and P&L
- Redeemable amount (if won)
- Action buttons

## State Management

### Zustand Store (Local UI State)
Located at: `zustandStore/predictionMarketsStore.ts`

**State:**
- `selectedMarket` - Currently selected market
- `selectedPosition` - Currently selected position
- `isTradeModalOpen` - Trade modal visibility
- `tradeAmount`, `tradeSide`, `selectedOutcomeId` - Trade form state
- `maxSlippage` - User's slippage tolerance
- `marketFilters` - Active filters for market list
- `currentView` - Active tab (markets/positions/history)

**Actions:**
- `openTradeModal()` - Open trade modal
- `setTradeAmount()` - Update trade amount
- `setMaxSlippage()` - Update slippage tolerance
- `resetFilters()` - Clear all filters

### React Query (Server State)
Located at: `lib/hooks/usePredictionMarkets.ts`

**Hooks:**
- `useMarkets(filters)` - Fetch markets with filters
- `useTrendingMarkets(limit)` - Fetch trending markets
- `useMarketDetails(marketId)` - Fetch market details
- `useUserPositions(walletAddress)` - Fetch user positions
- `usePortfolioSummary(walletAddress)` - Fetch portfolio summary
- `useGetQuote()` - Mutation for getting trade quotes
- `useExecuteTrade()` - Mutation for executing trades
- `useRedeemPosition()` - Mutation for redeeming positions

## API Integration

### Frontend Service Layer
Located at: `services/prediction-markets/dflow-service.ts`

All API calls go through the backend proxy to avoid CORS issues and rate limiting.

**Methods:**
- `getMarkets(filters)` - Fetch markets
- `getMarketById(marketId)` - Get market details
- `getQuote(marketId, outcomeId, amount, side)` - Get price quote
- `executeTrade(tradeParams, wallet, connection)` - Execute trade
- `getUserPositions(walletAddress)` - Get user positions
- `getPortfolioSummary(walletAddress)` - Get portfolio summary
- `redeemPosition(positionId, walletAddress, wallet, connection)` - Redeem winnings

### Backend Proxy
Located at: `swop-app-backend/src/controllers/v5/predictionMarketsController.js`

**Endpoints:**
- `GET /api/v5/prediction-markets/markets` - List markets
- `GET /api/v5/prediction-markets/markets/:marketId` - Get market
- `POST /api/v5/prediction-markets/quote` - Get trade quote
- `POST /api/v5/prediction-markets/trade` - Create trade transaction
- `GET /api/v5/prediction-markets/positions/:walletAddress` - Get positions
- `GET /api/v5/prediction-markets/portfolio/:walletAddress` - Get portfolio
- `POST /api/v5/prediction-markets/redeem` - Redeem position
- `GET /api/v5/prediction-markets/transactions/:walletAddress` - Transaction history

**Mock Data:**
The controller includes mock data for development/testing when DFlow API credentials are not configured.

## Wallet Integration

### Privy Solana Wallet
The feature uses the existing Privy wallet infrastructure:

```typescript
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

const { wallets: solanaWallets } = useSolanaWallets();
const selectedWallet = solanaWallets[0];
const solanaWalletAddress = selectedWallet?.address;
```

### Transaction Signing
Trades and redemptions create Solana transactions that are signed by the user's wallet:

```typescript
const signature = await wallet.sendTransaction(transaction, connection);
await connection.confirmTransaction(signature, 'confirmed');
```

## Configuration

### Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_DFLOW_API_URL=https://api.dflow.net
NEXT_PUBLIC_DFLOW_API_KEY=your-dflow-api-key
```

**Backend (.env):**
```env
DFLOW_API_URL=https://api.dflow.net
DFLOW_API_KEY=your-dflow-api-key
```

### DFlow API Setup
1. Sign up for DFlow Pond API access
2. Obtain API key
3. Configure environment variables
4. Update API endpoints if using a different base URL

## Usage

### For Users

1. **Browse Markets:**
   - Navigate to Wallet page
   - Scroll to Prediction Markets section
   - Browse or search for markets

2. **Trade:**
   - Click on a market card
   - Select an outcome
   - Enter amount to buy/sell
   - Adjust slippage tolerance
   - Review quote
   - Click Buy/Sell to execute

3. **View Positions:**
   - Click "My Positions" tab
   - View portfolio summary
   - Filter by active/redeemable/all

4. **Redeem Winnings:**
   - Click "My Positions" tab
   - Find redeemable positions
   - Click "Redeem" button
   - Confirm transaction

### For Developers

**Adding a New Market Type:**
1. Update `MarketType` enum in `types/prediction-markets.ts`
2. Update `MarketCard` component to handle new type
3. Update `TradePanel` if trading logic differs
4. Test thoroughly

**Customizing UI:**
1. Components use NextUI + TailwindCSS
2. Colors and styling follow existing wallet patterns
3. Modify component files in `components/wallet/prediction-markets/`

**Adding Analytics:**
1. Add tracking to key user actions in components
2. Track: market views, trades, redemptions
3. Use existing analytics infrastructure

## Testing

### Manual Testing Checklist

**Market Discovery:**
- [ ] Markets load correctly
- [ ] Filters work (category, status, sort)
- [ ] Search functionality works
- [ ] Trending markets display
- [ ] Pagination works

**Trading:**
- [ ] Quote updates when amount changes
- [ ] Buy/sell toggle works
- [ ] Slippage control updates quote
- [ ] Price impact warnings show correctly
- [ ] Transaction executes successfully
- [ ] Position updates after trade

**Positions:**
- [ ] Positions load for connected wallet
- [ ] Portfolio summary calculates correctly
- [ ] P&L displays accurately
- [ ] Filters work (active/redeemable/all)
- [ ] Redemption works for winning positions

**Error Handling:**
- [ ] Wallet connection errors handled
- [ ] API errors show user-friendly messages
- [ ] Transaction failures handled gracefully
- [ ] Network errors don't crash app

### Test Data
The backend controller includes mock markets and positions for testing without DFlow API credentials.

## Security Considerations

1. **Transaction Validation:**
   - All transactions validated before signing
   - Price quotes expire after 1 minute
   - Slippage protection built-in

2. **API Security:**
   - API key stored in environment variables
   - Backend proxy prevents key exposure
   - Rate limiting on backend endpoints

3. **User Safety:**
   - Price impact warnings for large trades
   - Transaction preview before signing
   - Clear display of fees and slippage

## Performance Optimizations

1. **React Query Caching:**
   - Markets cached for 30s
   - Positions cached for 30s
   - Auto-refetch every 60s

2. **Component Optimization:**
   - Memoized calculations
   - Debounced quote fetching
   - Lazy loading for modals

3. **API Efficiency:**
   - Backend caching layer
   - Batch requests where possible
   - Optimistic UI updates

## Future Enhancements

1. **Advanced Features:**
   - Market creation
   - Limit orders
   - Stop losses
   - Portfolio analytics

2. **Social Features:**
   - Share positions
   - Follow other traders
   - Market comments

3. **Charts & Data:**
   - Price history charts
   - Volume charts
   - Probability over time

4. **Mobile:**
   - Responsive improvements
   - Mobile-specific UX

## Troubleshooting

### Common Issues

**Markets not loading:**
- Check API key configuration
- Verify backend is running
- Check CORS settings

**Trades failing:**
- Ensure Solana wallet connected
- Check wallet has sufficient SOL for fees
- Verify RPC endpoint is working

**Positions not updating:**
- Clear React Query cache
- Check wallet address is correct
- Verify transaction confirmed on-chain

**Mock data showing:**
- DFlow API key not configured
- Using development mode
- Check environment variables

## Support

For issues or questions:
1. Check this documentation
2. Review component code
3. Check browser console for errors
4. Verify environment configuration
5. Contact DFlow support for API issues

## File Locations Reference

**Frontend:**
- Types: `/swop-desktop-app/types/prediction-markets.ts`
- Service: `/swop-desktop-app/services/prediction-markets/dflow-service.ts`
- Store: `/swop-desktop-app/zustandStore/predictionMarketsStore.ts`
- Hooks: `/swop-desktop-app/lib/hooks/usePredictionMarkets.ts`
- Components: `/swop-desktop-app/components/wallet/prediction-markets/`
- Integration: `/swop-desktop-app/components/wallet/WalletContent.tsx` (line 79, 866-868)

**Backend:**
- Routes: `/swop-app-backend/src/routes/v5/predictionMarkets.js`
- Controller: `/swop-app-backend/src/controllers/v5/predictionMarketsController.js`
- App Integration: `/swop-app-backend/src/app.js` (line 162)
- Route Index: `/swop-app-backend/src/routes/v5/index.js` (line 10, 22)
