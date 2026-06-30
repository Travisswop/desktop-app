import type {
  HyperliquidAgentOrderPrefill,
  PolymarketAgentOrderPrefill,
} from '@/lib/chat/agentActionHandoff';

export type ApprovalBoundaryBanner = {
  tone: 'info' | 'warning';
  title: string;
  detail: string;
  operatingModeLabel?: string;
};

type PerpsTicketState = {
  coin: string;
  side: 'long' | 'short';
  orderMode: 'market' | 'limit' | 'tpsl';
  sizeUsd: string;
  sizeCoins: string;
  leverage: number;
  isCross: boolean;
  price?: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
};

type PredictionTicketState = {
  marketRouteKey: string;
  outcome?: 'yes' | 'no';
  side?: 'BUY' | 'SELL';
  amount?: string;
  orderType?: 'market' | 'limit';
  limitPrice?: string;
};

function normalizeString(value?: string | null) {
  const next = value?.trim();
  return next ? next.toLowerCase() : null;
}

function normalizeOptionalNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return normalizeString(String(value));
  }
  return parsed.toFixed(8).replace(/\.?0+$/, '');
}

function matchesOptional(expected: string | number | boolean | null | undefined, actual: string | number | boolean | null | undefined) {
  if (expected === undefined || expected === null || expected === '') return true;
  if (typeof expected === 'boolean') return actual === expected;
  return normalizeOptionalNumber(expected) === normalizeOptionalNumber(actual);
}

export function resolveOperatingModeLabel(source: Record<string, unknown>) {
  const raw = [
    source.operatingModeLabel,
    source.operatingMode,
    source.executionMode,
    source.reviewMode,
    source.modeLabel,
    source.mode,
  ]
    .map((value) => normalizeString(typeof value === 'string' ? value : undefined))
    .find(Boolean);

  if (!raw) return undefined;
  if (raw.includes('monitor')) return 'Monitor-only';
  if (raw.includes('shadow')) return 'Shadow';
  if (raw.includes('paper')) return 'Paper';
  if (raw.includes('live')) return 'Live-ready';
  return undefined;
}

export function buildPerpsApprovalBoundaryBanner(
  prefill: HyperliquidAgentOrderPrefill | null | undefined,
  current: PerpsTicketState,
): ApprovalBoundaryBanner | null {
  if (!prefill?.proposalId) return null;

  const stillInsideBoundary =
    matchesOptional(prefill.coin, current.coin) &&
    matchesOptional(prefill.side, current.side) &&
    matchesOptional(prefill.orderMode, current.orderMode) &&
    (prefill.sizeUsd
      ? matchesOptional(prefill.sizeUsd, current.sizeUsd)
      : matchesOptional(prefill.sizeCoins, current.sizeCoins)) &&
    matchesOptional(prefill.leverage, current.leverage) &&
    matchesOptional(prefill.isCross, current.isCross) &&
    matchesOptional(prefill.price, current.price) &&
    matchesOptional(prefill.takeProfitPrice, current.takeProfitPrice) &&
    matchesOptional(prefill.stopLossPrice, current.stopLossPrice);

  const operatingModeLabel = prefill.operatingModeLabel;
  if (stillInsideBoundary) {
    return {
      tone: 'info',
      title: 'Approved trade draft loaded',
      detail: `You are still reviewing the original approved ticket${operatingModeLabel ? ` (${operatingModeLabel})` : ''}. Recheck every field before signing.`,
      operatingModeLabel,
    };
  }

  return {
    tone: 'warning',
    title: 'Trade details changed',
    detail: `This ticket no longer matches the original approved trade${operatingModeLabel ? ` (${operatingModeLabel})` : ''}. Treat it as a fresh manual review before signing.`,
    operatingModeLabel,
  };
}

export function buildPredictionApprovalBoundaryBanner(
  prefill: PolymarketAgentOrderPrefill | null | undefined,
  current: PredictionTicketState,
): ApprovalBoundaryBanner | null {
  if (!prefill?.proposalId) return null;

  const stillInsideBoundary =
    matchesOptional(prefill.marketRouteKey, current.marketRouteKey) &&
    matchesOptional(prefill.outcome, current.outcome) &&
    matchesOptional(prefill.side, current.side) &&
    matchesOptional(prefill.amount, current.amount) &&
    matchesOptional(prefill.orderType, current.orderType) &&
    matchesOptional(prefill.limitPrice, current.limitPrice);

  const operatingModeLabel = prefill.operatingModeLabel;
  if (stillInsideBoundary) {
    return {
      tone: 'info',
      title: 'Approved prediction draft loaded',
      detail: `You are still reviewing the original approved ticket${operatingModeLabel ? ` (${operatingModeLabel})` : ''}. Recheck the market, side, and size before signing.`,
      operatingModeLabel,
    };
  }

  return {
    tone: 'warning',
    title: 'Prediction ticket changed',
    detail: `This order no longer matches the original approved trade${operatingModeLabel ? ` (${operatingModeLabel})` : ''}. Treat it as a fresh manual review before signing.`,
    operatingModeLabel,
  };
}
