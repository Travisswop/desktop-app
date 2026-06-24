// Pure formatting helpers shared by the Astro chat ticket components.
// Plus shared (mostly pure) helpers used by both ChatArea and the extracted
// chat card/ticket components.

import { useModalStore } from '@/zustandStore/modalstore';
import { isVisiblePortfolioPosition } from '@/lib/polymarket/position-payout';
import { DUST_THRESHOLD } from '@/constants/polymarket';
import type { AgentActionCompletion } from '@/lib/chat/agentActionHandoff';
import type { HLMarket } from '@/services/hyperliquid/types';
import type { PolymarketPosition } from '@/hooks/polymarket/useUserPositions';
import type { PolymarketMarketPreview, User } from '@/lib/chat/agentCardTypes';

export function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatCompactUsd(value: unknown) {
  const number = toFiniteNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(number) >= 1000 ? 0 : 2,
  }).format(number);
}

export function formatWalletAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatSwapAmount(value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value).trim();
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: number >= 100 ? 2 : 6,
  }).format(number);
}

export function parseSwapBalanceChangeError(
  message: unknown,
  fallbackTokenSymbol = 'TOKEN'
) {
  const text = String(message || '').trim();
  const match = text.match(
    /^Your\s+(?<token>[A-Za-z0-9._-]+|token)\s+balance changed\.\s+Available now:\s+(?<amount>[0-9][0-9,]*(?:\.[0-9]+)?)\s*(?<availableToken>[A-Za-z0-9._-]+)?\.\s+Try the swap again with the updated amount\.?$/i
  );
  if (!match?.groups?.amount) return null;

  const rawToken = (
    match.groups.availableToken ||
    match.groups.token ||
    fallbackTokenSymbol
  ).trim();
  const tokenSymbol =
    !rawToken || rawToken.toLowerCase() === 'token'
      ? fallbackTokenSymbol
      : rawToken;

  return {
    availableAmount: match.groups.amount.replace(/,/g, '').trim(),
    tokenSymbol,
  };
}

export function normalizeIntentText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[@$"']/g, ' ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getReceiptIdentityKeys(receipt?: AgentActionCompletion | null) {
  if (!receipt) return [];

  const keys = [
    receipt.proposalId ? `proposal:${receipt.proposalId}` : '',
    receipt.orderId !== undefined && receipt.orderId !== null
      ? `order:${String(receipt.orderId)}`
      : '',
    receipt.txHash ? `tx:${receipt.txHash}` : '',
  ].filter(Boolean);

  if (keys.length === 0 && receipt.provider && receipt.placedAt) {
    keys.push(
      `fallback:${receipt.provider}:${receipt.status || ''}:${receipt.placedAt}`
    );
  }

  return Array.from(new Set(keys));
}

export function hasRenderedReceiptIdentity(
  receipt: AgentActionCompletion | null | undefined,
  renderedReceiptIdentityKeys: Set<string>
) {
  return getReceiptIdentityKeys(receipt).some((key) =>
    renderedReceiptIdentityKeys.has(key)
  );
}

export function formatSignedUsd(value: unknown) {
  const number = toFiniteNumber(value);
  const formatted = formatCompactUsd(Math.abs(number));
  if (number > 0) return `+${formatted}`;
  if (number < 0) return `-${formatted}`;
  return '$0';
}

export function isOpenPredictionConsolePosition(position: PolymarketPosition) {
  return (
    !position.redeemable &&
    isVisiblePortfolioPosition(position, DUST_THRESHOLD)
  );
}

function normalizePredictionKeyPart(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function predictionPositionMarketKey(position: PolymarketPosition) {
  const marketId =
    normalizePredictionKeyPart(position.conditionId) ||
    normalizePredictionKeyPart(position.slug) ||
    normalizePredictionKeyPart(position.title) ||
    'market';
  const outcomeId =
    normalizePredictionKeyPart(position.asset) ||
    normalizePredictionKeyPart(position.outcomeIndex) ||
    normalizePredictionKeyPart(position.outcome) ||
    'outcome';

  return `${marketId}:${outcomeId}`;
}

function predictionPositionExactKey(position: PolymarketPosition) {
  return `${normalizePredictionKeyPart(
    position.proxyWallet
  )}:${predictionPositionMarketKey(position)}`;
}

function mergePredictionConsolePositions(
  base: PolymarketPosition,
  next: PolymarketPosition
): PolymarketPosition {
  const baseSize = toFiniteNumber(base.size);
  const nextSize = toFiniteNumber(next.size);
  const size = baseSize + nextSize;
  const initialValue =
    toFiniteNumber(base.initialValue) + toFiniteNumber(next.initialValue);
  const currentValue =
    toFiniteNumber(base.currentValue) + toFiniteNumber(next.currentValue);
  const cashPnl = toFiniteNumber(base.cashPnl) + toFiniteNumber(next.cashPnl);
  const realizedPnl =
    toFiniteNumber(base.realizedPnl) + toFiniteNumber(next.realizedPnl);
  const totalBought =
    toFiniteNumber(base.totalBought) + toFiniteNumber(next.totalBought);
  const avgPrice =
    size > 0 ? initialValue / size : toFiniteNumber(base.avgPrice);
  const curPrice =
    size > 0 ? currentValue / size : toFiniteNumber(base.curPrice);
  const percentPnl = initialValue > 0 ? (cashPnl / initialValue) * 100 : 0;
  const percentRealizedPnl =
    totalBought > 0 ? (realizedPnl / totalBought) * 100 : 0;

  return {
    ...base,
    size,
    avgPrice,
    initialValue,
    currentValue,
    cashPnl,
    percentPnl,
    totalBought,
    realizedPnl,
    percentRealizedPnl,
    curPrice,
    redeemable: Boolean(base.redeemable && next.redeemable),
    mergeable: Boolean(base.mergeable || next.mergeable),
    marketClosed: Boolean(base.marketClosed && next.marketClosed),
    marketResolutionPending: Boolean(
      base.marketResolutionPending || next.marketResolutionPending
    ),
  };
}

export function normalizePredictionConsolePositions(
  positions: PolymarketPosition[] = []
) {
  const seenExactPositions = new Set<string>();
  const byMarketOutcome = new Map<string, PolymarketPosition>();

  for (const position of positions) {
    const exactKey = predictionPositionExactKey(position);
    if (seenExactPositions.has(exactKey)) continue;
    seenExactPositions.add(exactKey);

    const marketKey = predictionPositionMarketKey(position);
    const existing = byMarketOutcome.get(marketKey);
    byMarketOutcome.set(
      marketKey,
      existing ? mergePredictionConsolePositions(existing, position) : position
    );
  }

  return Array.from(byMarketOutcome.values());
}

export function isProposalNoLongerPendingError(error: unknown) {
  const agentError = error as {
    code?: string;
    message?: string;
    details?: { status?: unknown };
  };
  return (
    agentError?.code === 'AGENT_PROPOSAL_NOT_PENDING' ||
    agentError?.code === 'AGENT_PROPOSAL_EXPIRED' ||
    agentError?.details?.status === 'approved' ||
    agentError?.message?.toLowerCase().includes('no longer pending') ||
    agentError?.message?.toLowerCase().includes('proposal has expired')
  );
}

export function getAgentFeedIdentity(user?: Partial<User> | null) {
  const userId = String(user?._id || '').trim();
  const smartsiteId = String(user?.primaryMicrosite || '').trim();
  return userId && smartsiteId ? { userId, smartsiteId } : null;
}

export function toAgentFeedNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function triggerAgentFeedRefresh() {
  useModalStore.getState().triggerFeedRefetch();
}

export function parseLivePolymarketPrice(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number < 1 ? number : null;
}

export function parsePolymarketProbability(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return clampProbability(fallback);
  return clampProbability(number > 1 ? number / 100 : number);
}

export function clampProbability(value: number) {
  return Math.max(0.01, Math.min(0.99, value));
}

export function getPolymarketOutcomeLabels(market: PolymarketMarketPreview) {
  return {
    yes: market.outcomes?.[0] || 'Yes',
    no: market.outcomes?.[1] || 'No',
  };
}

export function getPolymarketTokenId(
  market: PolymarketMarketPreview,
  outcome: 'yes' | 'no'
) {
  return market.clobTokenIds?.[outcome === 'yes' ? 0 : 1] || '';
}

export function buildPolymarketBetKey(
  market: PolymarketMarketPreview,
  outcome: 'yes' | 'no'
) {
  return [
    market.conditionId || market.id || market.slug || market.question || 'market',
    outcome,
    getPolymarketTokenId(market, outcome),
  ]
    .filter(Boolean)
    .join(':');
}

export function formatPolymarketPrice(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  const cents = number <= 1 ? number * 100 : number;
  return `${Math.round(cents)}¢`;
}

export type PolymarketMarketDisplayLabel = {
  kicker: string;
  title: string;
  detail: string;
};

export function formatPolymarketMarketLabel(
  market: PolymarketMarketPreview,
  groupTitle?: string
): PolymarketMarketDisplayLabel {
  const question = market.question || 'Prediction market';
  const normalizedQuestion = question.trim();
  const normalizedGroupTitle = groupTitle?.trim();
  const loweredQuestion = normalizedQuestion.toLowerCase();
  const loweredGroupTitle = normalizedGroupTitle?.toLowerCase();

  if (loweredGroupTitle && loweredQuestion === loweredGroupTitle) {
    return {
      kicker: 'moneyline',
      title: 'Winner',
      detail: '',
    };
  }

  if (/spread/u.test(loweredQuestion)) {
    return {
      kicker: 'spread',
      title: normalizedQuestion.replace(/^spread:\s*/iu, ''),
      detail: '',
    };
  }

  if (/(?:o\/u|over\/under|total)/iu.test(normalizedQuestion)) {
    return {
      kicker: 'total',
      title: normalizedQuestion.replace(/^(?:total|o\/u):\s*/iu, ''),
      detail: '',
    };
  }

  return {
    kicker: 'market',
    title: normalizedQuestion,
    detail: '',
  };
}

export const HYPERLIQUID_MARKET_ALIASES: Record<string, string[]> = {
  GOLD: ['PAXG', 'GOLD'],
  XAU: ['PAXG', 'GOLD'],
  XAUUSD: ['PAXG', 'GOLD'],
  PAXG: ['PAXG'],
  OIL: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  BRENT: ['BRENTOIL'],
  BRENTOIL: ['BRENTOIL'],
  'BRENT OIL': ['BRENTOIL'],
  CRUDE: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  'CRUDE OIL': ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  'NATURAL GAS': ['NATGAS'],
  NATGAS: ['NATGAS'],
  'NAT GAS': ['NATGAS'],
  SPACEX: ['SPCX', 'SPACEX'],
  'SPACE X': ['SPCX', 'SPACEX'],
};

export function normalizePerpsMarketQuery(value: string) {
  return value
    .replace(/-?PERP\b/gi, ' ')
    .replace(/[$]/g, '')
    .replace(/[^a-zA-Z0-9: .&/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function compactPerpsMarketKey(value: string) {
  return normalizePerpsMarketQuery(value).replace(/[^A-Z0-9]/g, '');
}

export function perpsAliasTargets(value: string) {
  const normalized = normalizePerpsMarketQuery(value);
  const compact = compactPerpsMarketKey(value);
  return [
    ...(HYPERLIQUID_MARKET_ALIASES[normalized] || []),
    ...(HYPERLIQUID_MARKET_ALIASES[compact] || []),
  ];
}

export const HYPERLIQUID_FALLBACK_MARKS: Record<string, number> = {
  BTC: 74000,
  ETH: 3250,
  SOL: 165,
  HYPE: 35,
  PAXG: 2000,
  GOLD: 2000,
  XRP: 2.2,
  DOGE: 0.2,
  BRENTOIL: 95,
  NATGAS: 3.2,
  SPCX: 200,
};

export function displayPerpsCoin(coin: string) {
  return coin.includes(':') ? coin.split(':').pop() || coin : coin;
}

export function perpsCoinMatches(candidate: string, coin: string) {
  const normalizedCandidate = candidate.trim().toUpperCase();
  const normalizedCoin = coin.trim().toUpperCase();
  const candidateDisplay = displayPerpsCoin(candidate).toUpperCase();
  const coinDisplay = displayPerpsCoin(coin).toUpperCase();
  const coinAliasTargets = perpsAliasTargets(coin).map((target) =>
    target.toUpperCase()
  );
  return (
    normalizedCandidate === normalizedCoin ||
    candidateDisplay === normalizedCoin ||
    normalizedCandidate === coinDisplay ||
    candidateDisplay === coinDisplay ||
    coinAliasTargets.includes(normalizedCandidate) ||
    coinAliasTargets.includes(candidateDisplay)
  );
}

export function perpsMarketForCoin(markets: HLMarket[], coin: string) {
  return (
    markets.find((market) => perpsCoinMatches(market.coin, coin)) ||
    markets.find((market) =>
      market.displayCoin ? perpsCoinMatches(market.displayCoin, coin) : false
    )
  );
}

export function getPerpsMarkPrice(coin: string, market?: HLMarket) {
  const live = toFiniteNumber(market?.markPrice || market?.midPrice);
  if (live > 0) return live;
  return HYPERLIQUID_FALLBACK_MARKS[displayPerpsCoin(coin).toUpperCase()] || 1;
}

export function formatPerpsPrice(value: unknown) {
  const number = toFiniteNumber(value);
  if (number >= 1000) {
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (number >= 1) {
    return number.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }
  return number.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}
