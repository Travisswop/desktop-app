// Shared type definitions for the Goldman Sacks trading-agent surfaces
// (console panel sections, approval review modal, runtime cards).
// Extracted from ChatArea.tsx; type-only module (no runtime code).

import type { PolymarketMarketPreview } from '@/lib/chat/agentCardTypes';
import type { PolymarketPosition } from '@/hooks/polymarket/useUserPositions';

export type GoldmanStrategyRuntimeState =
  | 'idle'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

export type GoldmanStrategyRuntime = {
  state?: GoldmanStrategyRuntimeState;
  runId?: string | null;
  executionMode?: 'monitor' | 'proposal' | 'execute' | string;
  startedAt?: string | null;
  stoppedAt?: string | null;
  lastHeartbeatAt?: string | null;
  lastActivity?: string | null;
  lastError?: string | null;
  cycleCount?: number | null;
};

export type GoldmanTakeProfitRung = {
  profitPct?: number | string | null;
  closePercent?: number | string | null;
};

export type GoldmanStrategyPerformance = {
  realizedPnlUsd?: number | null;
  feesUsd?: number | null;
  tradeCount?: number | null;
  winCount?: number | null;
  lossCount?: number | null;
  firstTradeAt?: string | null;
  lastTradeAt?: string | null;
  updatedAt?: string | null;
};

export type GoldmanDailyPnlDay = {
  day?: string | null;
  realizedUsd?: number | null;
  feesUsd?: number | null;
  redemptionProceedsUsd?: number | null;
  byVenue?: Record<string, number | null | undefined> | null;
};

export type GoldmanTradingStrategy = {
  id: string;
  // Some backend branches emit `_id` instead of `id`; ingestion points in
  // ChatArea normalize onto `id`, but consumers keep a defensive fallback.
  _id?: string | null;
  title?: string | null;
  prompt?: string | null;
  venues?: string[];
  assets?: string[];
  status?:
    | 'draft'
    | 'pending_authorization'
    | 'active'
    | 'paused'
    | 'revoked'
    | 'expired'
    | string;
  rules?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  runtime?: GoldmanStrategyRuntime;
  metadata?: Record<string, unknown>;
  // Additive PnL-ledger fields (may be absent until the backend ships them).
  performance?: GoldmanStrategyPerformance | null;
  dailyPnl?: GoldmanDailyPnlDay[] | null;
  lastEvaluatedAt?: string | null;
  lastExecutedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type GoldmanStrategyFile = {
  file: string;
  detail?: string | null;
  status?: string | null;
  content: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type GoldmanStrategyVault = {
  id: string;
  userId?: string | null;
  groupId?: string | null;
  agentId: string;
  walletAddress: string;
  walletChain?: string | null;
  walletRole?: string | null;
  privyWalletId?: string | null;
  status?: string | null;
  network?: string | null;
  networkLabel?: string | null;
  chainType?: string | null;
  chainId?: number | null;
  assetHint?: string | null;
  warning?: string | null;
  source?: string | null;
  activatedAt?: string | null;
  limits?: Record<string, unknown>;
  strategyFiles?: GoldmanStrategyFile[];
  strategies?: GoldmanTradingStrategy[];
};

export type GoldmanStrategyRuntimeCardPayload = {
  runId?: string | null;
  phase?: string | null;
  status?: string | null;
  title?: string | null;
  detail?: string | null;
  executionMode?: string | null;
  executionReady?: boolean | null;
  walletAddress?: string | null;
  strategy?: GoldmanTradingStrategy | null;
  checks?: Array<{ label?: string; status?: string; detail?: string }>;
  actions?: Array<{ label?: string; status?: string; detail?: string }>;
  markets?: PolymarketMarketPreview[];
  positions?: PolymarketPosition[];
  swaps?: Array<{
    fromToken?: string;
    toToken?: string;
    amount?: string;
    status?: string;
    detail?: string;
  }>;
  updatedAt?: string | null;
};

export type GoldmanBrainUsage = {
  date?: string | null;
  calls?: number | null;
  tokens?: number | null;
  callCap?: number | null;
  tokenCap?: number | null;
  exhausted?: boolean | null;
};

export type GoldmanBrainState = {
  enabled?: boolean | null;
  tier?: 'fast' | 'deep' | string | null;
  memoryEnabled?: boolean | null;
  usage?: GoldmanBrainUsage | null;
};

export type GoldmanActivityEntry = {
  id: string;
  ts?: string | null;
  strategyId?: string | null;
  action?: string | null;
  venue?: string | null;
  thesis?: string | null;
  outcome?: string | null;
  pnlUsd?: number | null;
  lesson?: string | null;
  label?: string | null;
  detail?: string | null;
};
