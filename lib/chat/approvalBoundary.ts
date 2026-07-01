import type {
  HyperliquidAgentOrderPrefill,
  PredictionOrderAmountUnit,
  PolymarketAgentOrderPrefill,
} from '@/lib/chat/agentActionHandoff';

export type ApprovalBoundaryBanner = {
  tone: 'info' | 'warning';
  title: string;
  detail: string;
  operatingModeLabel?: string;
};

type ApprovalBoundaryOptions = {
  approvalPathInvalidated?: boolean;
};

type PerpsTicketState = {
  coin: string;
  assetIndex?: number | null;
  dex?: string | null;
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
  shareAmount?: string;
  amountUnit?: PredictionOrderAmountUnit;
  orderType?: 'market' | 'limit';
  limitPrice?: string;
};

function normalizeString(value?: string | null) {
  const next = value?.trim();
  return next ? next.toLowerCase() : null;
}

function normalizeOptionalNumber(value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') {
    return String(value);
  }
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

export function isPerpsTicketInsideApprovedBoundary(
  prefill: HyperliquidAgentOrderPrefill | null | undefined,
  current: PerpsTicketState,
) {
  if (!prefill?.proposalId) return false;

  return (
    matchesOptional(prefill.coin, current.coin) &&
    matchesOptional(prefill.assetIndex, current.assetIndex) &&
    matchesOptional(prefill.dex, current.dex) &&
    matchesOptional(prefill.side, current.side) &&
    matchesOptional(prefill.orderMode, current.orderMode) &&
    (prefill.sizeUsd
      ? matchesOptional(prefill.sizeUsd, current.sizeUsd)
      : matchesOptional(prefill.sizeCoins, current.sizeCoins)) &&
    matchesOptional(prefill.leverage, current.leverage) &&
    matchesOptional(prefill.isCross, current.isCross) &&
    matchesOptional(prefill.price, current.price) &&
    matchesOptional(prefill.takeProfitPrice, current.takeProfitPrice) &&
    matchesOptional(prefill.stopLossPrice, current.stopLossPrice)
  );
}

export function resolvePerpsBoundarySizeCoins(options: {
  prefill: HyperliquidAgentOrderPrefill | null | undefined;
  currentSizeUsd: string;
  currentSizeCoins: string;
  appliedSizeUsd?: string | null;
  appliedSizeCoins?: string | null;
}) {
  const {
    prefill,
    currentSizeUsd,
    currentSizeCoins,
    appliedSizeUsd,
    appliedSizeCoins,
  } = options;

  if (!prefill?.sizeCoins || prefill.sizeUsd) {
    return currentSizeCoins;
  }

  if (!appliedSizeUsd || !appliedSizeCoins) {
    return currentSizeCoins;
  }

  return matchesOptional(appliedSizeUsd, currentSizeUsd)
    ? appliedSizeCoins
    : currentSizeCoins;
}

export function canCompletePerpsAgentHandoff(
  prefill: HyperliquidAgentOrderPrefill | null | undefined,
  current: PerpsTicketState,
  options?: ApprovalBoundaryOptions,
) {
  return (
    Boolean(prefill?.proposalId) &&
    isPerpsTicketInsideApprovedBoundary(prefill, current) &&
    !options?.approvalPathInvalidated
  );
}

export function buildPerpsApprovalBoundaryBanner(
  prefill: HyperliquidAgentOrderPrefill | null | undefined,
  current: PerpsTicketState,
  options?: ApprovalBoundaryOptions,
): ApprovalBoundaryBanner | null {
  if (!prefill?.proposalId) return null;

  const stillInsideBoundary = isPerpsTicketInsideApprovedBoundary(
    prefill,
    current,
  );
  const operatingModeLabel = prefill.operatingModeLabel;
  if (stillInsideBoundary && !options?.approvalPathInvalidated) {
    return {
      tone: 'info',
      title: 'Approved trade draft loaded',
      detail: `You are still reviewing the original approved ticket${operatingModeLabel ? ` (${operatingModeLabel})` : ''}. Recheck every field before signing.`,
      operatingModeLabel,
    };
  }

  if (options?.approvalPathInvalidated) {
    return {
      tone: 'warning',
      title: 'Approved trade draft expired',
      detail: `This ticket drifted outside the original approved trade${operatingModeLabel ? ` (${operatingModeLabel})` : ''}, so Goldman’s approved handoff no longer applies. Treat every submit as a fresh manual review.`,
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
  options?: ApprovalBoundaryOptions,
): ApprovalBoundaryBanner | null {
  if (!prefill?.proposalId) return null;

  const stillInsideBoundary = isPredictionTicketInsideApprovedBoundary(
    prefill,
    current,
  );

  const operatingModeLabel = prefill.operatingModeLabel;
  if (stillInsideBoundary && !options?.approvalPathInvalidated) {
    return {
      tone: 'info',
      title: 'Approved prediction draft loaded',
      detail: `You are still reviewing the original approved ticket${operatingModeLabel ? ` (${operatingModeLabel})` : ''}. Recheck the market, side, and size before signing.`,
      operatingModeLabel,
    };
  }

  if (options?.approvalPathInvalidated) {
    return {
      tone: 'warning',
      title: 'Approved prediction draft expired',
      detail: `This order drifted outside the original approved trade${operatingModeLabel ? ` (${operatingModeLabel})` : ''}, so Goldman’s approved handoff no longer applies. Treat every submit as a fresh manual review.`,
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

function resolvePredictionAmountUnit(
  prefill: PolymarketAgentOrderPrefill | null | undefined,
  current: PredictionTicketState,
): PredictionOrderAmountUnit {
  return (
    prefill?.amountUnit ??
    current.amountUnit ??
    (prefill?.side === 'SELL' ? 'shares' : 'usd')
  );
}

function matchesPredictionAmount(
  prefill: PolymarketAgentOrderPrefill,
  current: PredictionTicketState,
) {
  const amountUnit = resolvePredictionAmountUnit(prefill, current);
  if (amountUnit === 'shares') {
    if (current.side === 'BUY' && current.orderType === 'market') {
      return false;
    }
    return matchesOptional(prefill.amount, current.shareAmount);
  }
  return matchesOptional(prefill.amount, current.amount);
}

export function isPredictionTicketInsideApprovedBoundary(
  prefill: PolymarketAgentOrderPrefill | null | undefined,
  current: PredictionTicketState,
) {
  if (!prefill?.proposalId) return false;

  return (
    matchesOptional(prefill.marketRouteKey, current.marketRouteKey) &&
    matchesOptional(prefill.outcome, current.outcome) &&
    matchesOptional(prefill.side, current.side) &&
    matchesPredictionAmount(prefill, current) &&
    matchesOptional(prefill.orderType, current.orderType) &&
    matchesOptional(prefill.limitPrice, current.limitPrice)
  );
}

export function canCompletePredictionAgentHandoff(
  prefill: PolymarketAgentOrderPrefill | null | undefined,
  current: PredictionTicketState,
  options?: ApprovalBoundaryOptions,
) {
  return (
    Boolean(prefill?.proposalId) &&
    isPredictionTicketInsideApprovedBoundary(prefill, current) &&
    !options?.approvalPathInvalidated
  );
}
