'use client';

import { useEffect, useMemo, useState } from 'react';

interface NormalizedPerpsCoin {
  requestCoin: string;
  dex?: string;
  displayCoin: string;
}

function maybeFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizePerpsCoin(value: string | null | undefined) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  if (!trimmed.includes(':')) {
    const displayCoin = trimmed.toUpperCase();
    if (displayCoin === 'SPCX' || displayCoin === 'SPACEX') {
      return {
        requestCoin: 'xyz:SPCX',
        dex: 'xyz',
        displayCoin: 'SPCX',
      } satisfies NormalizedPerpsCoin;
    }

    return {
      requestCoin: displayCoin,
      displayCoin,
    } satisfies NormalizedPerpsCoin;
  }

  const [rawDex, ...assetParts] = trimmed.split(':');
  const dex = rawDex.trim().toLowerCase();
  const displayCoin = assetParts.join(':').trim().toUpperCase();
  if (!dex || !displayCoin) return null;

  return {
    requestCoin: `${dex}:${displayCoin}`,
    dex,
    displayCoin,
  } satisfies NormalizedPerpsCoin;
}

function findMarketContext(
  data: unknown,
  normalized: NormalizedPerpsCoin,
) {
  if (!Array.isArray(data) || data.length < 2) return null;
  const [meta, contexts] = data as [
    { universe?: Array<{ name?: string }> },
    Array<Record<string, unknown> | undefined>,
  ];
  const universe = Array.isArray(meta?.universe) ? meta.universe : [];
  const marketIndex = universe.findIndex((asset) => {
    const name = String(asset?.name || '');
    return (
      name === normalized.requestCoin ||
      name.toUpperCase() === normalized.requestCoin.toUpperCase() ||
      name.toUpperCase() === normalized.displayCoin
    );
  });

  if (marketIndex < 0) return null;
  return contexts?.[marketIndex] || null;
}

type LivePerpsMarkPriceResult = {
  price: number | null;
  retryable: boolean;
};

async function fetchLivePerpsMarkPrice(
  normalized: NormalizedPerpsCoin,
  signal?: AbortSignal,
): Promise<LivePerpsMarkPriceResult> {
  const response = await fetch('/api/hyperliquid/mainnet/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'metaAndAssetCtxs',
      ...(normalized.dex ? { dex: normalized.dex } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      price: null,
      retryable: Boolean(payload?.retryable) || response.status >= 500,
    };
  }

  const data = await response.json().catch(() => null);
  const context = findMarketContext(data, normalized);
  return {
    price:
      maybeFiniteNumber(context?.markPx) ?? maybeFiniteNumber(context?.midPx),
    retryable: false,
  };
}

type LivePerpsMarkPriceState = {
  isStale: boolean;
  price: number | null;
};

export function useLivePerpsMarkPriceState(
  coin: string | null | undefined,
  enabled = true,
) {
  const normalized = useMemo(() => normalizePerpsCoin(coin), [coin]);
  const [state, setState] = useState<LivePerpsMarkPriceState>({
    price: null,
    isStale: false,
  });

  useEffect(() => {
    if (!enabled || !normalized) {
      setState({ price: null, isStale: false });
      return;
    }

    let cancelled = false;

    const load = async () => {
      const controller = new AbortController();
      const nextState = await fetchLivePerpsMarkPrice(
        normalized,
        controller.signal,
      ).catch(() => ({ price: null, retryable: true }));

      if (cancelled) {
        controller.abort();
        return;
      }

      setState((current) => {
        if (nextState.price !== null) {
          return { price: nextState.price, isStale: false };
        }

        if (nextState.retryable && current.price !== null) {
          return { price: current.price, isStale: true };
        }

        return { price: null, isStale: false };
      });
    };

    load();
    const interval = window.setInterval(load, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, normalized]);

  return state;
}

export function useLivePerpsMarkPrice(
  coin: string | null | undefined,
  enabled = true,
) {
  return useLivePerpsMarkPriceState(coin, enabled).price;
}
