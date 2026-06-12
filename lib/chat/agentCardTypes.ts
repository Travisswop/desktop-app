// Shared type definitions for the Astro chat agent display cards.
// Extracted from ChatArea.tsx; type-only module (no runtime code).

import type { TokenData } from '@/types/token';
import type { HLMarket } from '@/services/hyperliquid/types';
import type { PerpsAccountSummary } from '@/components/wallet/perps/hooks/useHyperliquidPositions';
import type { PolymarketPosition } from '@/hooks/polymarket/useUserPositions';
import type { PolymarketOrder } from '@/hooks/polymarket/useActiveOrders';
import type { AavePositionsData } from '@/types/aave';

export interface User {
  _id: string;
  name: string;
  profilePic?: string;
  ensName?: string;
  swopensId?: string;
  primaryMicrosite?: string;
  microsites?: Array<{
    ens?: string;
    name?: string;
    primary?: boolean;
  }>;
}

export interface WalletReceiveQrDetails {
  address: string;
  network?: string | null;
  networkLabel?: string | null;
  chainType?: string | null;
  chainId?: number | null;
  assetHint?: string | null;
  warning?: string | null;
  source?: string | null;
}

export interface PnlOverviewPreview {
  walletPortfolioValue: number;
  perpsAccountValue: number;
  perpsUnrealizedPnl: number;
  perpsPositionCount: number;
  predictionPortfolioValue: number;
  predictionUnrealizedPnl: number;
  predictionPositionCount: number;
  pendingOrderCount: number;
  isLoading: boolean;
  checkedAt: string;
}

export interface ResearchSourcePreview {
  title?: string | null;
  snippet?: string | null;
  sourceName?: string | null;
  url?: string | null;
}

export interface SportsResearchItem {
  label?: string | null;
  value?: string | null;
  status?: string | null;
  note?: string | null;
}

export interface SportsResearchGroup {
  title?: string | null;
  items?: SportsResearchItem[];
}

export interface SportsResearchBrief {
  title?: string | null;
  subtitle?: string | null;
  sourceName?: string | null;
  checkedAt?: string | null;
  groups?: SportsResearchGroup[];
  notes?: string[];
}

export interface MarketplaceItemPreview {
  id?: string | null;
  templateId?: string | null;
  micrositeId?: string | null;
  sellerUsername?: string | null;
  sellerName?: string | null;
  profileUrl?: string | null;
  name: string;
  description?: string | null;
  image?: string | null;
  price?: number | string | null;
  currency?: string | null;
  category?: string | null;
  nftType?: string | null;
  mintLimit?: number | string | null;
  available?: number | string | null;
}

export interface PolymarketMarketPreview {
  id?: string | null;
  conditionId?: string | null;
  slug?: string | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  eventLive?: boolean;
  gameStartTime?: string | null;
  question?: string | null;
  clobTokenIds?: string[];
  outcomes?: string[];
  yesPrice?: string | number | null;
  noPrice?: string | number | null;
  volume?: string | number | null;
  realtimePrices?: Record<string, PolymarketRealtimePrice>;
}

export interface PolymarketRealtimePrice {
  bidPrice?: number;
  askPrice?: number;
  midPrice?: number;
  spread?: number;
}

export interface PolymarketMarketGroup {
  key: string;
  isEventGroup: boolean;
  markets: PolymarketMarketPreview[];
}

export type PolymarketLiveQuote = {
  bid: number | null;
  ask: number | null;
};

export type InlinePolymarketQuoteState = PolymarketLiveQuote & {
  tokenId: string;
  status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
  message?: string;
};

export interface PolymarketOrderPrefill {
  marketKey?: string;
  outcome: 'yes' | 'no';
  side?: 'BUY' | 'SELL';
  orderType?: 'market' | 'limit';
  amount?: string;
  limitPriceCents?: string;
  sourceText?: string;
}

export interface ChartCommandIntent {
  query: string;
  coin: string | null;
  displayCoin: string;
  range: ChartTimeRange;
  market?: HLMarket | null;
  empty?: boolean;
  unsupported?: boolean;
}

export type ChartTimeRange = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export type HistoryPoint = { t: number; p: number };

export interface AstroConsoleData {
  eoaAddress?: string;
  solWalletAddress?: string;
  evmWalletAddress?: string;
  evmWalletAddresses?: string[];
  walletIdentityLabel: string;
  walletPortfolioBalance: number;
  walletPortfolioTokens: TokenData[];
  walletFundingTokens?: TokenData[];
  predictionWalletAddress?: string;
  predictionWalletAddresses?: string[];
  predictionUsdcBalance: number;
  predictionPortfolioUsdcBalance: number;
  predictionLegacyUsdcBalance: number;
  predictionPositions: PolymarketPosition[];
  predictionOpenOrders: PolymarketOrder[];
  isWalletPortfolioBalanceLoading: boolean;
  isWalletFundingBalanceLoading?: boolean;
  isPredictionBalanceLoading: boolean;
  aavePositions?: AavePositionsData | null;
  isAavePositionsLoading?: boolean;
  perpsAccount?: PerpsAccountSummary;
  perpsMasterAddress?: string | null;
  isPerpsLoading: boolean;
  perpsMarkets: HLMarket[];
  isPerpsAgentInitialized: boolean;
  isPerpsAgentInitializing: boolean;
  isPerpsAgentReconnecting: boolean;
  perpsAgentError: string | null;
  initializePerpsAgent: () => Promise<unknown>;
  isPerpsSubmitting: boolean;
  perpsTradingError: string | null;
  clearPerpsTradingError: () => void;
  updatePerpsLeverage: (
    assetIndex: number,
    leverage: number,
    isCross?: boolean
  ) => Promise<unknown>;
  placePerpsMarketOrder: (
    assetIndex: number,
    isBuy: boolean,
    size: string,
    markPrice: string
  ) => Promise<unknown>;
  placePerpsLimitOrder: (params: {
    assetIndex: number;
    isBuy: boolean;
    size: string;
    price: string;
    reduceOnly?: boolean;
  }) => Promise<unknown>;
  placePerpsTpSlOrder: (params: {
    assetIndex: number;
    isBuy: boolean;
    size: string;
    entryPrice: string;
    stopLossPrice: string;
    takeProfitPrice: string;
  }) => Promise<unknown>;
  placePerpsPositionTpSlOrder: (params: {
    assetIndex: number;
    isLong: boolean;
    size: string;
    stopLossPrice?: string;
    takeProfitPrice?: string;
  }) => Promise<unknown>;
  closePerpsPosition: (
    assetIndex: number,
    size: string,
    isLong: boolean,
    markPrice: string
  ) => Promise<unknown>;
}
