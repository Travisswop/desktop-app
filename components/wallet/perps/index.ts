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
export { AssetHeader } from './AssetHeader';
export { CandleChart } from './CandleChart';
export { AccountStats } from './AccountStats';
export { FocusedPositionCard } from './FocusedPositionCard';
export { OrderConfirmModal } from './OrderConfirmModal';
export type { OrderConfirmDetails } from './OrderConfirmModal';

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
export { useHyperliquidCandles } from './hooks/useHyperliquidCandles';
export type { OhlcvBar, HLInterval } from './hooks/useHyperliquidCandles';

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
