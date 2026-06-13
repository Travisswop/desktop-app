// ─── Perps Components ─────────────────────────────────────────────────────────
export { PerpsCard } from './PerpsCard';
export { PerpsPanel } from './PerpsPanel';
export { AgentSetupModal } from './AgentSetupModal';
export { DepositModal } from './DepositModal';
export { DepositForm } from './DepositForm';
export { PerpsActionsModal } from './PerpsActionsModal';
export type { PerpsActionTab } from './PerpsActionsModal';
export { TradingForm } from './TradingForm';
export { CandleChart } from './CandleChart';
export { ChartPanel } from './ChartPanel';
export { PerpsHeader } from './PerpsHeader';
export { PositionsTable } from './PositionsTable';
export { AccountCard } from './AccountCard';
export { RecentFillsCard } from './RecentFillsCard';
export { MarketSearchModal } from './MarketSearchModal';
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
