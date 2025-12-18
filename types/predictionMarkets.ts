/**
 * TypeScript Type Definitions for Prediction Market Card UI
 */

// ==========================================
// EVENT CARD TYPES
// ==========================================

export interface EventCard {
  // Identifiers
  id: string;
  ticker: string;
  seriesTicker?: string;

  // Display Information
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;

  // Category
  category?: string;
  competitionScope?: string;

  // Status & Timing
  status?: 'open' | 'settled' | 'closed';
  endDate?: string; // ISO date string
  createdAt?: string; // ISO date string

  // Volume & Liquidity Metrics
  volume?: number;
  volume24h?: number;
  liquidity?: number;
  openInterest?: number;

  // Markets (YES/NO betting options)
  markets?: Market[];

  // Metadata
  marketsCount: number;
}

// Token Account Structure
export interface TokenAccount {
  marketLedger: string;
  yesMint: string;
  noMint: string;
  isInitialized: boolean;
  redemptionStatus: string | null;
}

// Accounts object with currency mint addresses as keys
export interface MarketAccounts {
  [currencyMint: string]: TokenAccount;
}

export interface Market {
  // Identifiers
  id: string;
  ticker?: string;
  eventId?: string;

  // Market Type
  marketType?: 'binary' | string;

  // Question
  question: string;

  // Token Mints - Legacy flat structure (for backwards compatibility)
  yesMint?: string;
  noMint?: string;

  // Token Accounts - New structure from DFlow API
  accounts?: MarketAccounts;

  // Prices (0-1 range)
  yesPrice?: number;
  noPrice?: number;

  // Display Percentages (pre-calculated strings)
  yesPercent?: string; // e.g., "65.0"
  noPercent?: string; // e.g., "35.0"

  // Subtitles for YES/NO options
  yesSubTitle?: string;
  noSubTitle?: string;

  // Timing
  openTime?: number;
  closeTime?: number;
  expirationTime?: number;

  // Status and Result
  status?: 'open' | 'settled' | 'closed' | 'finalized';
  result?: 'yes' | 'no' | null;

  // Rules and Conditions
  canCloseEarly?: boolean;
  earlyCloseCondition?: string;
  rulesPrimary?: string;
  rulesSecondary?: string;

  // Order Book Data
  yesBid?: number | null;
  yesAsk?: number | null;
  noBid?: number | null;
  noAsk?: number | null;

  // Metrics
  volume?: number;
  volume24h?: number;
  totalVolume?: number;
  liquidity?: number;
  openInterest?: number;

  // Dates
  endDate?: string;
  createdAt?: string;
}

// ==========================================
// PREDICTION MARKETS RESPONSE
// ==========================================

export interface PredictionMarketsResponse {
  success: boolean;
  type: 'prediction_markets';
  displayType: 'cards';
  total: number;
  showing: number;
  query?: string | null;
  cards: EventCard[];
}

// ==========================================
// BET CONFIRMATION TYPES
// ==========================================

export interface BetConfirmationResponse {
  success: boolean;
  type: 'prediction_bet_confirmation';
  displayType: 'bet_card';

  // Market info
  market: {
    id: string;
    question: string;
    eventId?: string;
    status?: string;
    endDate?: string;
    yesSubTitle?: string;
    noSubTitle?: string;
  };

  // Bet details
  bet: {
    type: 'YES' | 'NO';
    amount: number;
    currency: 'USDC' | 'SOL' | 'CASH';
    currentPrice: number;
    estimatedTokens: number;
    estimatedTokensFormatted: string;
    yesPercent?: string;
    noPercent?: string;
    targetMint: string;
    currencyMint?: string;
    accountType?: 'legacy' | 'matched' | 'fallback';
  };

  // Potential outcomes
  outcomes?: {
    maxWin: string;
    maxLoss: number;
    breakEven: number;
  };

  // Risk warning
  riskWarning?: string;

  // Transaction data
  swap: {
    fromToken: string;
    fromMint?: string;
    toToken: string;
    toMint: string;
    amount: number;
    estimatedOutput: number;
    swapType?: 'prediction_bet';
  };

  // Confirmation details
  confirmation?: {
    title: string;
    details: string[];
  };
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type BetType = 'YES' | 'NO';
export type MarketStatus = 'open' | 'settled' | 'closed' | 'finalized';
export type Currency = 'USDC' | 'SOL' | 'CASH';

// ==========================================
// TYPE GUARDS
// ==========================================

export function isPredictionMarketsResponse(
  data: any
): data is PredictionMarketsResponse {
  return (
    data &&
    data.type === 'prediction_markets' &&
    data.displayType === 'cards' &&
    Array.isArray(data.cards)
  );
}

export function isBetConfirmationResponse(
  data: any
): data is BetConfirmationResponse {
  return (
    data &&
    data.type === 'prediction_bet_confirmation' &&
    data.displayType === 'bet_card' &&
    data.market &&
    data.bet
  );
}
