// ─── Perps Components ─────────────────────────────────────────────────────────
export { PerpsCard } from './PerpsCard';
export { PerpsPanel } from './PerpsPanel';
export { AgentSetupModal } from './AgentSetupModal';
export { DepositModal } from './DepositModal';
export { DepositForm } from './DepositForm';
export { PerpsActionsModal } from './PerpsActionsModal';
export type { PerpsActionTab } from './PerpsActionsModal';
export { MarketSelector } from './MarketSelector';
export { OrderBook } from './OrderBook';
export { TradingForm } from './TradingForm';
export { PositionCard } from './PositionCard';
export { PositionsList } from './PositionsList';
export { FundingRateBar } from './FundingRateBar';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useHyperliquidAgent } from './hooks/useHyperliquidAgent';
export { useHyperliquidBalanceCheck } from './hooks/useHyperliquidBalanceCheck';
export type { DepositCheckStatus } from './hooks/useHyperliquidBalanceCheck';
export { useHyperliquidDeposit } from './hooks/useHyperliquidDeposit';
export { useHyperliquidFaucet, hasClaimedFaucet } from './hooks/useHyperliquidFaucet';
export { useHyperliquidDualBalance } from './hooks/useHyperliquidDualBalance';
export type { DualBalance, NetworkBalance } from './hooks/useHyperliquidDualBalance';
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
