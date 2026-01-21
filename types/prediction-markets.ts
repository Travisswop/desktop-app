/**
 * Prediction Markets Type Definitions
 *
 * Types for DFlow's Pond API integration for prediction markets.
 * Based on Solana SPL token mechanics and prediction market protocols.
 */

/**
 * Market status enum
 */
export enum MarketStatus {
  ACTIVE = 'active',
  SETTLED = 'settled',
  CLOSED = 'closed',
  PENDING = 'pending',
}

/**
 * Outcome for binary or categorical prediction markets
 */
export interface MarketOutcome {
  id: string;
  name: string;
  description?: string;
  probability?: number; // 0-1 (e.g., 0.65 = 65%) - may use price instead
  price?: number; // Current price per outcome token in USDC (also represents probability)
  volume?: number; // Trading volume for this outcome
  tokenMint?: string; // SPL token mint address for this outcome
  mint?: string; // Alternative field name for token mint (DFlow API)
}

/**
 * Market filters for discovery
 */
export interface MarketFilters {
  category?: string;
  status?: MarketStatus;
  search?: string;
  minVolume?: number;
  maxVolume?: number;
  sortBy?: 'volume' | 'createdAt' | 'endDate' | 'liquidity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Market accounts for DFlow API
 */
export interface MarketAccounts {
  yesMint?: string;
  noMint?: string;
  settlementMint?: string;
  redemptionStatus?: string;
}

/**
 * Core market data structure
 */
export interface Market {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: MarketStatus | string;
  createdAt?: string; // ISO timestamp
  endDate?: string; // ISO timestamp - when market closes
  settledAt?: string; // ISO timestamp - when market was settled

  // Event data (from DFlow API)
  eventTicker?: string;
  subtitle?: string;
  rules?: string;

  // Market type
  marketType?: 'binary' | 'categorical' | 'scalar';

  // Outcomes
  outcomes: MarketOutcome[];

  // Financial data
  totalVolume?: number; // Total trading volume in USDC
  liquidity?: number; // Available liquidity in USDC
  openInterest?: number; // Open interest (DFlow API)

  // Metadata
  imageUrl?: string;
  tags?: string[];

  // On-chain data
  marketAddress?: string; // Solana program address
  vaultAddress?: string; // Token vault address
  accounts?: MarketAccounts; // DFlow API mint addresses
}

/**
 * Detailed market information with additional stats
 */
export interface MarketDetails extends Market {
  // Trading stats
  tradeCount?: number;
  uniqueTraders?: number;

  // Historical data
  volumeHistory?: Array<{ timestamp: number; volume: number }>;
  probabilityHistory?: Array<{
    timestamp: number;
    probabilities: Record<string, number>; // outcomeId -> probability
  }>;

  // Resolution details
  winningOutcomeId?: string;
  resolvedBy?: string; // Address that resolved the market
  result?: string; // 'yes', 'no', or '' for scalar markets
}

/**
 * Quote for buying/selling outcome tokens
 */
export interface Quote {
  marketId?: string;
  outcomeId?: string;
  outcomeMint?: string; // The mint address for the selected outcome token
  side?: 'buy' | 'sell';
  amount?: number; // Amount of outcome tokens
  price?: number; // Price per token
  total?: number; // Total cost/proceeds in USDC
  slippage?: number; // Expected slippage percentage
  priceImpact?: number; // Price impact percentage
  fees?: number; // Trading fees
  minReceived?: number; // Minimum tokens received (for buy)
  maxSold?: number; // Maximum tokens sold (for sell)
  expiresAt?: number; // Quote expiration timestamp
  // DFlow API fields
  inAmount?: string; // Input amount
  outAmount?: string; // Output amount
  inputMint?: string;
  outputMint?: string;
  transaction?: string; // Base64-encoded transaction
}

/**
 * Trade execution parameters
 */
export interface TradeParams {
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  amount: number; // Amount of outcome tokens to buy/sell
  maxSlippage: number; // Maximum acceptable slippage (0-1, e.g., 0.01 = 1%)
  walletAddress: string; // User's Solana wallet address
}

/**
 * User position in a market
 */
export interface Position {
  id: string;
  marketId: string;
  market?: Market; // Populated market data
  outcomeId: string;
  outcomeName: string;

  // Position data
  tokenBalance: number; // Number of outcome tokens held
  averagePrice: number; // Average purchase price per token
  currentPrice: number; // Current market price per token

  // Profit/loss calculation
  costBasis: number; // Total amount spent on this position
  currentValue: number; // Current market value
  unrealizedPnL: number; // Profit/loss (currentValue - costBasis)
  unrealizedPnLPercent: number; // PnL as percentage

  // Redemption
  isRedeemable: boolean; // Can be redeemed (market settled & won)
  redeemableAmount?: number; // Amount available for redemption

  // Metadata
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * User's portfolio summary
 */
export interface PortfolioSummary {
  totalPositions: number;
  activePositions: number;
  totalValue: number; // Total current value in USDC
  totalCostBasis: number; // Total amount invested
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;

  // Redeemable winnings
  redeemablePositions: number;
  redeemableAmount: number;
}

/**
 * Transaction history item
 */
export interface MarketTransaction {
  id: string;
  marketId: string;
  marketTitle: string;
  outcomeId: string;
  outcomeName: string;

  type: 'buy' | 'sell' | 'redeem';
  amount: number; // Token amount
  price: number; // Price per token
  total: number; // Total value
  fees: number;

  signature: string; // Solana transaction signature
  timestamp: string; // ISO timestamp
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * API Response wrappers
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * WebSocket message types for real-time updates
 */
export interface MarketUpdate {
  type: 'market_update';
  marketId: string;
  outcomes: MarketOutcome[];
  totalVolume: number;
  liquidity: number;
  timestamp: number;
}

export interface TradeUpdate {
  type: 'trade_update';
  marketId: string;
  outcomeId: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export type WebSocketMessage = MarketUpdate | TradeUpdate;
