import type { PerpsPositionFeedContent } from '@/lib/perps/perpsFeed';
import type { FeedHealthIssue } from './feedHealth';

export interface PerpsTerminalFillHealthSnapshot {
  coin: string;
  side?: string | null;
  price?: number | null;
  sizeCoins?: number | null;
  startPosition?: number | null;
  endPosition?: number | null;
  orderId?: string | null;
  hash?: string | null;
  timestamp?: string | null;
  closeReason?: string;
}

export interface PerpsFeedSourceSnapshot {
  provider: 'hyperliquid';
  masterAddress: string;
  activePositionKeys: string[];
  terminalPositionKeys: string[];
  terminalFillsByPositionKey: Record<string, PerpsTerminalFillHealthSnapshot>;
  receivedAt: string;
}

export interface PerpsFeedHealthFillLike {
  coin?: string | null;
  dex?: string | null;
  side?: string | null;
  sz?: string | number | null;
  px?: string | number | null;
  time?: string | number | null;
  startPosition?: string | number | null;
  oid?: string | number | null;
  orderId?: string | number | null;
  hash?: string | null;
  dir?: string | null;
  liquidation?: unknown;
}

interface BuildPerpsCardHealthIssueParams {
  feedId?: string | null;
  userId?: string | null;
  smartsiteId?: string | null;
  content: Partial<PerpsPositionFeedContent>;
  sourceSnapshot?: PerpsFeedSourceSnapshot | null;
  renderedStatus: 'open' | 'closed' | 'liquidated';
  nowMs?: number;
  staleOpenGraceMs?: number;
}

function normalizeKey(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCoin(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function normalizeDex(value: unknown) {
  return String(value || '').trim();
}

function dateMs(value: unknown) {
  const milliseconds = Date.parse(String(value || ''));
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function tailAddress(value: unknown) {
  const text = String(value || '').trim();
  if (text.length <= 10) return text;
  return text.slice(-8);
}

function latestTimestampMs(values: unknown[]) {
  return values.reduce<number | null>((latest, value) => {
    const next = dateMs(value);
    if (next === null) return latest;
    return latest === null ? next : Math.max(latest, next);
  }, null);
}

function qualifyPositionCoin({
  coin,
  dex,
}: {
  coin: string;
  dex?: string | null;
}) {
  const normalizedCoin = normalizeCoin(coin);
  const normalizedDex = normalizeDex(dex);

  if (!normalizedCoin || !normalizedDex || normalizedCoin.includes(':')) {
    return normalizedCoin;
  }

  return `${normalizedDex}:${normalizedCoin}`.toUpperCase();
}

function buildPositionKey({
  userId,
  masterAddress,
  coin,
  dex,
}: {
  userId?: string | null;
  masterAddress?: string | null;
  coin: string;
  dex?: string | null;
}) {
  return `hyperliquid:${masterAddress || userId || 'unknown'}:${qualifyPositionCoin({ coin, dex })}`;
}

function fillSignedSize(fill: PerpsFeedHealthFillLike) {
  const size = numberOrNull(fill.sz);
  if (size === null || size <= 0) return null;

  const side = String(fill.side || '').toUpperCase();
  if (side === 'B') return size;
  if (side === 'A') return -size;
  return null;
}

function fillTimestamp(fill: PerpsFeedHealthFillLike) {
  const rawTime = numberOrNull(fill.time);
  if (rawTime === null || rawTime <= 0) return null;

  return new Date(
    rawTime < 1_000_000_000_000 ? rawTime * 1000 : rawTime,
  ).toISOString();
}

function fillCloseReason(fill: PerpsFeedHealthFillLike) {
  if (fill.liquidation) return 'liquidation';

  const direction = String(fill.dir || '').toLowerCase();
  if (direction.includes('take profit') || direction.includes('tp')) {
    return 'take_profit';
  }
  if (direction.includes('stop') || direction.includes('sl')) {
    return 'stop_loss';
  }

  return 'closed';
}

export function buildPerpsTerminalFillsByPositionKey({
  fills,
  userId,
  masterAddress,
  dexByCoin,
}: {
  fills: PerpsFeedHealthFillLike[];
  userId?: string | null;
  masterAddress?: string | null;
  dexByCoin?: Record<string, string | null | undefined>;
}) {
  const terminalFills: Record<string, PerpsTerminalFillHealthSnapshot> = {};

  fills.forEach((fill) => {
    const coin = normalizeCoin(fill.coin);
    if (!coin) return;

    const startPosition = numberOrNull(fill.startPosition);
    const signedSize = fillSignedSize(fill);
    if (startPosition === null || signedSize === null || startPosition === 0) {
      return;
    }

    const endPosition = startPosition + signedSize;
    const closedOrCrossedZero =
      Math.abs(endPosition) < 0.00000001 ||
      Math.sign(startPosition) !== Math.sign(endPosition);

    if (!closedOrCrossedZero) return;

    const dex =
      fill.dex ||
      dexByCoin?.[coin] ||
      dexByCoin?.[coin.split(':').pop() || coin] ||
      null;
    const positionKey = normalizeKey(
      buildPositionKey({
        userId,
        masterAddress,
        coin,
        dex,
      }),
    );

    if (terminalFills[positionKey]) return;

    terminalFills[positionKey] = {
      coin: qualifyPositionCoin({ coin, dex }),
      side: fill.side || null,
      price: numberOrNull(fill.px),
      sizeCoins: Math.abs(signedSize),
      startPosition,
      endPosition,
      orderId:
        fill.orderId === undefined || fill.orderId === null
          ? fill.oid === undefined || fill.oid === null
            ? null
            : String(fill.oid)
          : String(fill.orderId),
      hash: fill.hash || null,
      timestamp: fillTimestamp(fill),
      closeReason: fillCloseReason(fill),
    };
  });

  return terminalFills;
}

export function buildPerpsCardHealthIssue({
  feedId,
  userId,
  smartsiteId,
  content,
  sourceSnapshot,
  renderedStatus,
  nowMs = Date.now(),
  staleOpenGraceMs = 30_000,
}: BuildPerpsCardHealthIssueParams): FeedHealthIssue | null {
  if (!content.positionKey) {
    return {
      surface: 'perps',
      cardType: 'perpsPosition',
      issueType: 'perps_card_missing_position_key',
      severity: 'medium',
      title: 'Perps feed card is missing its position key',
      description:
        'A rendered perps feed card does not have content.positionKey, so lifecycle reconciliation cannot tell whether it is open or terminal.',
      feedId,
      userId,
      smartsiteId,
      cardState: {
        coin: content.coin,
        status: content.status,
        event: content.event,
        updatedAt: content.updatedAt,
      },
      expectedState: {
        positionKey: 'present',
      },
      acceptanceCriteria: [
        'Every perpsPosition feed card stores a stable content.positionKey.',
        'Cards missing positionKey are backfilled or hidden from lifecycle-sensitive views.',
      ],
      fingerprintComponents: {
        issueType: 'perps_card_missing_position_key',
        coin: content.coin,
      },
    };
  }

  if (
    renderedStatus !== 'open' ||
    !sourceSnapshot ||
    !content.masterAddress ||
    normalizeKey(sourceSnapshot.masterAddress) !==
      normalizeKey(content.masterAddress)
  ) {
    return null;
  }

  const positionKey = normalizeKey(content.positionKey);
  const activeKeys = new Set(
    sourceSnapshot.activePositionKeys.map((key) => normalizeKey(key)),
  );

  if (activeKeys.has(positionKey)) return null;

  const lastCardUpdateMs = latestTimestampMs([
    content.updatedAt,
    content.openedAt,
  ]);

  if (lastCardUpdateMs !== null && nowMs - lastCardUpdateMs < staleOpenGraceMs) {
    return null;
  }

  const terminalFill =
    sourceSnapshot.terminalFillsByPositionKey[positionKey] ||
    sourceSnapshot.terminalFillsByPositionKey[content.positionKey];
  const issueType = terminalFill
    ? 'perps_stale_open_after_terminal_fill'
    : 'perps_stale_open_absent_from_source';
  const closeReason = terminalFill?.closeReason || 'position_not_active';

  return {
    surface: 'perps',
    cardType: 'perpsPosition',
    issueType,
    severity: 'high',
    title: terminalFill
      ? `Perps feed card stayed open after ${String(content.coin || 'position')} terminal fill`
      : `Perps feed card stayed open after ${String(content.coin || 'position')} disappeared from Hyperliquid`,
    description:
      'A perps feed card rendered as OPEN, but the latest Hyperliquid position snapshot for the same master wallet no longer includes that position key.',
    feedId,
    userId,
    smartsiteId,
    sourceOfTruth: {
      provider: sourceSnapshot.provider,
      masterAddressSuffix: tailAddress(sourceSnapshot.masterAddress),
      activePositionKeyCount: sourceSnapshot.activePositionKeys.length,
      terminalFill,
      receivedAt: sourceSnapshot.receivedAt,
    },
    cardState: {
      positionKey: content.positionKey,
      coin: content.coin,
      side: content.side,
      status: content.status,
      event: content.event,
      renderedStatus,
      updatedAt: content.updatedAt,
      openedAt: content.openedAt,
      markPrice: content.markPrice,
      exitPrice: content.exitPrice,
      returnPct: content.returnPct,
    },
    expectedState: {
      status: terminalFill?.closeReason === 'liquidation' ? 'liquidated' : 'closed',
      event:
        terminalFill?.closeReason === 'liquidation'
          ? 'liquidate'
          : closeReason,
      closedAt: terminalFill?.timestamp || 'latest reconcile timestamp',
      exitPrice: terminalFill?.price || 'latest mark or fill price',
    },
    observedState: {
      renderedStatus,
      activePositionKeysIncludesCard: false,
    },
    acceptanceCriteria: [
      'When Hyperliquid no longer reports the position as active, the matching perps feed card becomes CLOSED, TP HIT, SL HIT, or LIQUIDATED.',
      'Terminal cards preserve exit price, closed timestamp, close reason, and final return percentage.',
      'A feed refetch is triggered after the reconcile endpoint updates terminal perps cards.',
    ],
    fingerprintComponents: {
      provider: sourceSnapshot.provider,
      issueType,
      positionKey: content.positionKey,
      coin: content.coin,
      closeReason,
      masterAddressSuffix: tailAddress(sourceSnapshot.masterAddress),
    },
  };
}
