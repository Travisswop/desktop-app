// ─── Perps Components ─────────────────────────────────────────────────────────
export { PerpsCard } from './PerpsCard';
export { PerpsPanel } from './PerpsPanel';
export { AgentSetupModal } from './AgentSetupModal';
export { DepositModal } from './DepositModal';
export { MarketSelector } from './MarketSelector';
export { OrderBook } from './OrderBook';
export { TradingForm } from './TradingForm';
export { PositionCard } from './PositionCard';
export { PositionsList } from './PositionsList';
export { FundingRateBar } from './FundingRateBar';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useHyperliquidAgent } from './hooks/useHyperliquidAgent';
export { useHyperliquidDeposit } from './hooks/useHyperliquidDeposit';
export { useHyperliquidMarkets, useMarketContext, useMarketByCoins } from './hooks/useHyperliquidMarkets';
export { useHyperliquidPositions, usePositionForCoin } from './hooks/useHyperliquidPositions';
export { useHyperliquidTrading } from './hooks/useHyperliquidTrading';
export {
  useHyperliquidWebSocket,
  useAllMids,
  useOrderBook,
  useRecentTrades,
  useUserFills,
} from './hooks/useHyperliquidWebSocket';

// ─── Types (re-exported from service for convenience) ─────────────────────────
export type {
  HLMarket,
  HLPosition,
  HLOpenOrder,
  HLOrderBook,
  HLAgentInfo,
  OrderSide,
  OrderMode,
  OrderFormState,
  LiquidationRisk,
} from '@/services/hyperliquid/types';
