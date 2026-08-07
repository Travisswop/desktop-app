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

export type GoldmanEvaluationCheck = {
  label?: string | null;
  status?: string | null;
  detail?: string | null;
};

export type GoldmanStrategyEvaluation = {
  at?: string | null;
  detail?: string | null;
  checks?: GoldmanEvaluationCheck[];
  actions?: GoldmanEvaluationCheck[];
  predictionsMarkets?: string[];
  perpsMarketCount?: number | null;
  openPositions?: { predictions?: number | null; perps?: number | null } | null;
  // Allocation-target snapshot — only written when the user set targets.
  allocation?: {
    perpsTargetPct?: number | null;
    predictionsTargetPct?: number | null;
    perpsCurrentUsd?: number | null;
    detail?: string | null;
  } | null;
};

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
  lastEvaluation?: GoldmanStrategyEvaluation | null;
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
  // Human-readable swop.id funding handle for the vault (e.g.
  // "agent.travis.swop.id"). Null/absent = not yet registered; callers fall
  // back to the raw 0x walletAddress. Additive — backend ships it tolerantly.
  ensName?: string | null;
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
  // Authoritative Access Station config for the agent, as returned by the
  // strategy-vault fetch on open. Used to seed the toggles from a fresh source
  // instead of stale chat-list data. Shape matches GoldmanAccessStationInput;
  // typed loosely here to avoid a cross-module import.
  accessStation?: unknown;
  strategyFiles?: GoldmanStrategyFile[];
  strategies?: GoldmanTradingStrategy[];
  // Capital mid-hop between venues (a swap settling, a bridge deposit not yet
  // credited). It belongs to no bucket while it moves, so the console adds it
  // back explicitly rather than letting the total sag.
  inFlight?: GoldmanInFlightEntry[];
  // Versioned AI-trading acknowledgement. Absent on older backends, which the
  // console reads as "not required" — the server is the real gate either way.
  riskDisclosure?: GoldmanRiskDisclosureState | null;
};

export type GoldmanRiskDisclosureState = {
  version: string;
  acceptedVersion?: string | null;
  acceptedAt?: string | null;
  required: boolean;
};

export type GoldmanInFlightEntry = {
  venue: 'perps' | 'predictions' | null;
  action: string | null;
  label: string;
  amountUsd: number;
  token: string | null;
  chain: string | null;
  transactionHash: string | null;
  startedAt: string;
  ageSeconds: number;
  // 'outbound' = leaving the wallet for a venue; 'inbound' = coming back.
  direction: 'outbound' | 'inbound';
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
  // When true, the agent's trades are posted to the user's feed. Additive —
  // defaults to true on the backend; absent until that endpoint ships it.
  feedSharingEnabled?: boolean | null;
  usage?: GoldmanBrainUsage | null;
};

export type GoldmanAutonomyLevel = 'full' | 'proposal';

// Result of the one-shot autonomy switch. `agent` carries the updated
// config.accessStation so callers can merge it into local access state and
// flip the per-strategy autonomy chips immediately.
export type GoldmanAutonomyResult = {
  groupId?: string | null;
  agent?: {
    agentId?: string | null;
    config?: {
      accessStation?: unknown;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  } | null;
  autonomy?: {
    level?: GoldmanAutonomyLevel | string | null;
    openedVenues?: string[] | null;
    liveExecutionEnabled?: boolean | null;
  } | null;
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

// --- Allocation rebalance (console REBALANCE button) ---

export type GoldmanAllocationBucket = {
  key: 'perps' | 'predictions' | 'wallet';
  label: string;
  currentUsd: number;
  currentPct: number;
  // null = no percentage set for that bucket, so it is left unmanaged.
  targetPct: number | null;
  targetUsd: number | null;
  driftUsd: number | null;
};

export type GoldmanRebalanceMove = {
  venue: 'perps' | 'predictions';
  action: 'fund' | 'withdraw';
  amountUsd: number;
  detail: string;
};

export type GoldmanRebalanceBlocker = {
  venue: 'perps' | 'predictions' | null;
  reason: string;
  detail: string;
};

export type GoldmanRebalancePlan = {
  totalUsd: number;
  reserveUsd: number;
  availableUsd: number;
  targetsConfigured: boolean;
  buckets: GoldmanAllocationBucket[];
  moves: GoldmanRebalanceMove[];
  blockers: GoldmanRebalanceBlocker[];
};

export type GoldmanRebalanceLeg = {
  venue: 'perps' | 'predictions';
  action: 'fund' | 'withdraw';
  requestedUsd: number;
  status: string;
  amountUsd: number | null;
  transactionHash: string | null;
  detail: string | null;
};

export type GoldmanRebalanceResult = {
  supported: boolean;
  dryRun: boolean;
  plan: GoldmanRebalancePlan | null;
  executed: GoldmanRebalanceLeg[];
};
