'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PolymarketProviders, useTrading } from '@/providers/polymarket';
import {
  usePolymarketCollateralBalance,
  useUserPositions,
  type PolymarketMarket,
} from '@/hooks/polymarket';
import MarketDetailView from '@/components/wallet/polymarket/Markets/MarketDetailView';
import {
  marketRouteKey,
  useMarketDetailStore,
  type MarketDetailEntry,
} from '@/zustandStore/marketDetailStore';
import {
  buildRecoveredMarketDetailEntry,
  buildRecoveredSportsMarketDetailEntry,
  buildSiblingSportsMarketDetailEntry,
} from '@/lib/polymarket/marketDetailEntries';
import {
  recoverSportsGameDetailContext,
  type SportsGameDetailContext,
} from '@/lib/polymarket/sports-detail-context';
import type { SportsOutcomeSelection } from '@/lib/polymarket/sports-selection';

/**
 * Predictions market detail page — replaces the legacy MarketDetailModal.
 * The originating screen stashes the full PolymarketMarket object in the
 * marketDetailStore before navigating; we read it back here.
 *
 * Direct URL hits (refresh, share-link, deep-link) recover the market by URL
 * id, then rebuild sports game context when the market belongs to a matchup.
 */
export default function MarketDetailPage() {
  return (
    <PolymarketProviders>
      <MarketDetailPageInner />
    </PolymarketProviders>
  );
}

function MarketDetailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ marketId: string }>();
  const marketId = decodeURIComponent(params?.marketId ?? '');
  const { safeAddress, portfolioAddresses } = useTrading();
  const portfolioAddressInput = portfolioAddresses.length
    ? portfolioAddresses
    : safeAddress;
  const {
    orderableBalance,
    displayBalance,
    legacyBalanceHint,
    isNormalizingCollateral,
  } = usePolymarketCollateralBalance(portfolioAddressInput);
  const { data: positions } = useUserPositions(portfolioAddressInput);

  const entry = useMarketDetailStore((s) => s.entries[marketId]);
  const clearEntry = useMarketDetailStore((s) => s.clear);

  // Snapshot the entry so the page keeps rendering even if the store gets
  // cleared (e.g. if we cleared on unmount in a future iteration).
  const [snapshot, setSnapshot] = useState<MarketDetailEntry | undefined>(
    entry,
  );
  const [isRecoveringMarket, setIsRecoveringMarket] = useState(
    () => Boolean(marketId && !entry),
  );
  const [marketRecoveryFailed, setMarketRecoveryFailed] = useState(false);
  const [sportsRecoveryFailed, setSportsRecoveryFailed] = useState(false);
  useEffect(() => {
    if (entry) setSnapshot(entry);
  }, [entry]);

  const handleBack = useMemo(
    () => () => {
      clearEntry(marketId);
      router.push('/prediction');
    },
    [clearEntry, marketId, router],
  );

  const sharesForMarket = useCallback(
    (market: PolymarketMarket) => {
      const tokenIds = parseJsonArray<string>(market.clobTokenIds);
      return {
        yesShares: positions?.find((p) => p.asset === tokenIds[0])?.size || 0,
        noShares: positions?.find((p) => p.asset === tokenIds[1])?.size || 0,
      };
    },
    [positions],
  );
  const sharesForMarketRef = useRef(sharesForMarket);
  useEffect(() => {
    sharesForMarketRef.current = sharesForMarket;
  }, [sharesForMarket]);
  const selectedOutcomeFromUrl = normalizeOutcomeParam(
    searchParams?.get('outcome') ?? null,
  );

  useEffect(() => {
    if (snapshot || !marketId) return;

    let cancelled = false;
    setIsRecoveringMarket(true);
    setMarketRecoveryFailed(false);

    fetch(`/api/polymarket/market?id=${encodeURIComponent(marketId)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PolymarketMarket;
      })
      .then((market) => {
        if (cancelled) return;
        if (!market) {
          setMarketRecoveryFailed(true);
          return;
        }

        const nextEntry: MarketDetailEntry = buildRecoveredMarketDetailEntry(
          market,
          sharesForMarket(market),
        );
        const key = marketRouteKey(market) || marketId;
        useMarketDetailStore.getState().set(key, nextEntry);
        setSnapshot(nextEntry);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('[PredictionDetail] Market recovery failed:', error);
        setMarketRecoveryFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsRecoveringMarket(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketId, sharesForMarket, snapshot]);

  useEffect(() => {
    if (!snapshot || snapshot.game) return;
    if (!isSportsDetailRecoveryCandidate(snapshot.market)) return;

    let cancelled = false;
    setSportsRecoveryFailed(false);
    const selectedOutcome =
      snapshot.initialOutcome ||
      selectedOutcomeFromUrl ||
      'yes';

    recoverSportsDetailContext(snapshot.market, selectedOutcome)
      .then((context) => {
        if (cancelled) return;
        if (!context) {
          setSportsRecoveryFailed(true);
          return;
        }
        const shares = sharesForMarketRef.current(context.market);
        const nextEntry: MarketDetailEntry = buildRecoveredSportsMarketDetailEntry(
          snapshot,
          context,
          shares,
        );
        const key = marketRouteKey(context.market) || marketId;
        useMarketDetailStore.getState().set(key, nextEntry);
        setSnapshot(nextEntry);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('[PredictionDetail] Sports game context recovery failed:', error);
        setSportsRecoveryFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [marketId, selectedOutcomeFromUrl, snapshot]);

  const handleGameMarketSelect = useCallback(
    (market: PolymarketMarket, selection: SportsOutcomeSelection) => {
      const key = marketRouteKey(market);
      if (!key || !snapshot?.game) return;
      const shares = sharesForMarket(market);
      const nextEntry: MarketDetailEntry = buildSiblingSportsMarketDetailEntry(
        snapshot.game,
        market,
        selection,
        shares,
      );
      useMarketDetailStore.getState().set(key, nextEntry);
      router.replace(`/prediction/market/${encodeURIComponent(key)}`);
    },
    [router, sharesForMarket, snapshot?.game],
  );

  const isRecoveringSportsGame =
    Boolean(snapshot && !snapshot.game) &&
    !sportsRecoveryFailed &&
    Boolean(snapshot && isSportsDetailRecoveryCandidate(snapshot.market));

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#f4f4f2] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isRecoveringMarket && !marketRecoveryFailed
              ? 'Loading market...'
              : 'This market is no longer in memory.'}
          </p>
          {marketRecoveryFailed && (
            <button
              onClick={() => router.push('/prediction')}
              className="mt-3 text-sm font-semibold text-gray-900 underline"
            >
              Back to Predictions
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isRecoveringSportsGame) {
    return (
      <div className="min-h-screen bg-[#f4f4f2] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">Loading game lines...</p>
        </div>
      </div>
    );
  }

  return (
    <MarketDetailView
      onClose={handleBack}
      market={snapshot.market}
      balance={orderableBalance}
      displayBalance={displayBalance}
      balanceHint={legacyBalanceHint}
      isConvertingBalance={isNormalizingCollateral}
      yesShares={snapshot.yesShares}
      noShares={snapshot.noShares}
      initialOutcome={
        snapshot.initialOutcome ||
        selectedOutcomeFromUrl
      }
      initialAmount={snapshot.initialAmount || searchParams?.get('amount') || undefined}
      initialSide={
        snapshot.initialSide || normalizeSideParam(searchParams?.get('side') ?? null)
      }
      initialOrderType={
        snapshot.initialOrderType ||
        normalizeOrderTypeParam(searchParams?.get('orderType') ?? null)
      }
      initialLimitPrice={
        snapshot.initialLimitPrice ||
        searchParams?.get('limitPrice') ||
        undefined
      }
      agentOrderPrefill={snapshot.agentOrderPrefill}
      onAgentActionComplete={(completion) => {
        if (completion.groupId) {
          router.push(
            `/dashboard/chat?groupId=${encodeURIComponent(
              completion.groupId,
            )}`,
          );
        } else {
          router.push('/dashboard/chat');
        }
      }}
      onAddFunds={() => router.push('/prediction?funds=deposit')}
      outcomeLabels={snapshot.outcomeLabels}
      game={snapshot.game}
      onGameMarketSelect={handleGameMarketSelect}
    />
  );
}

function parseJsonArray<T>(raw: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeOutcomeParam(value: string | null): 'yes' | 'no' | undefined {
  if (value === 'yes' || value === 'no') return value;
  return undefined;
}

function normalizeSideParam(value: string | null): 'BUY' | 'SELL' | undefined {
  if (value === 'BUY' || value === 'SELL') return value;
  return undefined;
}

function normalizeOrderTypeParam(value: string | null): 'market' | 'limit' | undefined {
  if (value === 'market' || value === 'limit') return value;
  return undefined;
}

function normalizeSportsEventSlug(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/-more-markets$/, '');
}

function normalizeSportsEventTitle(value: unknown): string {
  return String(value ?? '')
    .replace(/\s*(?:[-–—:]\s*)?more\s+markets\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSportsDetailRecoveryCandidate(market: PolymarketMarket): boolean {
  const title = normalizeSportsEventTitle(market.eventTitle || market.question);
  return Boolean(
    /\bvs\.?\b/i.test(title) &&
      (market.eventSlug ||
        market.gameStartTime ||
        market.eventStartDate ||
        market.eventTeams?.length),
  );
}

function sportsDetailRecoveryUrls(market: PolymarketMarket): string[] {
  const urls = new Set<string>();
  const baseSlug = normalizeSportsEventSlug(market.eventSlug);
  const eventId = String(market.eventId ?? '').trim();
  const title = normalizeSportsEventTitle(market.eventTitle);

  const addUrl = (params: URLSearchParams) => {
    const slug = params.get('slug');
    if (slug) {
      urls.add(`/api/polymarket/event-markets?slug=${encodeURIComponent(slug)}`);
      return;
    }

    params.set('limit', '96');
    params.set('offset', '0');
    params.set('quality', 'relaxed');
    urls.add(`/api/polymarket/desktop/markets?${params.toString()}`);
  };

  if (eventId) {
    urls.add(`/api/polymarket/event-markets?id=${encodeURIComponent(eventId)}`);
  }

  if (baseSlug) {
    addUrl(new URLSearchParams({ slug: baseSlug }));
    addUrl(new URLSearchParams({ slug: `${baseSlug}-more-markets` }));
    const baseParams = new URLSearchParams({ event_slug: baseSlug });
    addUrl(baseParams);
    const moreParams = new URLSearchParams({
      event_slug: `${baseSlug}-more-markets`,
    });
    addUrl(moreParams);
  }

  if (title) {
    const titleParams = new URLSearchParams({
      tag_id: '1',
      kind: 'gamelines',
      q: title,
    });
    addUrl(titleParams);
  }

  return [...urls];
}

async function recoverSportsDetailContext(
  market: PolymarketMarket,
  selectedOutcome: 'yes' | 'no',
): Promise<SportsGameDetailContext | null> {
  const urls = sportsDetailRecoveryUrls(market);
  if (!urls.length) return null;

  const responses = await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = (await response.json()) as unknown;
      return Array.isArray(data) ? (data as PolymarketMarket[]) : [];
    }),
  );
  const relatedMarkets = responses.flatMap((response) =>
    response.status === 'fulfilled' ? response.value : [],
  );

  return recoverSportsGameDetailContext(
    market,
    relatedMarkets,
    selectedOutcome,
  );
}
