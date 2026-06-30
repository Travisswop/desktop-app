import { NextRequest, NextResponse } from 'next/server';

import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';

/**
 * Desktop-only proxy for /api/prediction-markets/desktop/markets. Adds the
 * A2 sports drill-down filters (live / kind / date_from / date_to) on top
 * of the standard tag/limit/offset params. Mobile clients continue using
 * the original /markets endpoint via /api/polymarket/markets — keep both
 * proxies so the payload contracts don't drift.
 */
const FORWARD_PARAMS = [
  'limit',
  'offset',
  'tag_id',
  'live',
  'kind',
  'q',
  'search',
  'quality',
  'market_set',
  'marketSet',
  'include_other',
  'includeOther',
  'event_slug',
  'eventSlug',
  'date_from',
  'date_to',
];

const BROAD_SPORTS_GAMELINE_TAG_IDS = [
  '745',
  '100254',
  '899',
  '100381',
  '450',
  '100351',
  '864',
  '100350',
  '279',
  '435',
  '517',
  '64',
  '101178',
];
const BROAD_SPORTS_TAG_IDS = new Set(['1', '100639']);
const MONEYLINE_MARKET_SETS = new Set(['moneyline', 'moneylines', 'ml']);
const FALLBACK_CACHE_HEADERS = {
  'Cache-Control': 'no-store',
};

type PolymarketProxyMarket = Record<string, any>;

function cacheHeadersFor(searchParams: URLSearchParams) {
  if (searchParams.get('live') === 'true') {
    return {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
    };
  }

  if (
    searchParams.get('q') ||
    searchParams.get('search') ||
    searchParams.get('event_slug') ||
    searchParams.get('eventSlug')
  ) {
    return {
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
    };
  }

  return {
    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=90',
  };
}

function marketEventKey(market: PolymarketProxyMarket) {
  const eventSlug = String(market?.eventSlug || '')
    .trim()
    .toLowerCase()
    .replace(/-more-markets$/, '');
  if (eventSlug) return `event:${eventSlug}`;

  const eventTitle = String(market?.eventTitle || '')
    .trim()
    .toLowerCase()
    .replace(/\s*(?:[:|-]\s*)?more\s+markets\s*$/i, '')
    .replace(/\s+/g, ' ');
  if (eventTitle) return `event-title:${eventTitle}`;

  return String(
    market?.conditionId ||
      market?.id ||
      market?.slug ||
      market?.question ||
      'market'
  );
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function marketScore(market: PolymarketProxyMarket) {
  return (
    Number.parseFloat(String(market?.liquidity || '0')) +
    Number.parseFloat(
      String(market?.volume24hr || market?.volume24h || market?.volume || '0')
    )
  );
}

function marketText(market: PolymarketProxyMarket) {
  return [
    market?.question,
    market?.title,
    market?.slug,
    market?.eventTitle,
    market?.eventSlug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isCompanionSportsMarket(market: PolymarketProxyMarket) {
  const text = marketText(market);
  const outcomes = parseArrayField(market?.outcomes);

  if (
    /\b(spreads?|totals?|o\/u|over\s*\/?\s*under|map\s*\d+|set\s*\d+|total\s+(sets?|games?|maps?)|first half|second half|halftime|quarter|period|exact score|first team|first corner|corner|cards?|booking|player props?|both teams to score|win by|ko|tko|submission|decision)\b/.test(
      text
    )
  ) {
    return true;
  }

  if (outcomes.some((outcome) => /^(over|under)$/i.test(outcome))) return true;
  if (outcomes.some((outcome) => /[+-]\d+\.?\d*$/.test(outcome))) return true;
  return false;
}

function isBinarySoccerMoneyline(market: PolymarketProxyMarket) {
  const outcomes = parseArrayField(market?.outcomes);
  if (
    outcomes.length !== 2 ||
    outcomes[0].toLowerCase() !== 'yes' ||
    outcomes[1].toLowerCase() !== 'no'
  ) {
    return false;
  }

  const text = marketText(market);
  return (
    /\bwill\b.+\bwin\b/.test(text) ||
    /\b(end|ends|ending|finish|finishes|result)\b.*\b(draw|tie)\b/.test(text)
  );
}

function isMoneylineMarket(market: PolymarketProxyMarket) {
  if (isCompanionSportsMarket(market)) return false;
  if (isBinarySoccerMoneyline(market)) return true;

  const outcomes = parseArrayField(market?.outcomes);
  const nonReserved = outcomes.filter(
    (outcome) => !/^(yes|no|over|under|draw|tie)$/i.test(outcome)
  );

  if (outcomes.length === 2 && nonReserved.length === 2) return true;
  if (outcomes.length === 3 && nonReserved.length === 2) return true;

  return /\b(vs\.?|versus)\b/i.test(
    `${market?.eventTitle || ''} ${market?.question || ''}`
  );
}

function pickMoneylineBundle(markets: PolymarketProxyMarket[]) {
  const candidates = markets.filter(isMoneylineMarket);
  const soccerMoneylines = candidates.filter(isBinarySoccerMoneyline);

  if (soccerMoneylines.length >= 2) {
    return [...soccerMoneylines]
      .sort((a, b) => {
        const rank = (market: PolymarketProxyMarket) =>
          /\b(end|ends|ending|finish|finishes|result)\b.*\b(draw|tie)\b/.test(
            marketText(market)
          )
            ? 2
            : 0;
        return rank(a) - rank(b) || marketScore(b) - marketScore(a);
      })
      .slice(0, 3);
  }

  return candidates.length
    ? [[...candidates].sort((a, b) => marketScore(b) - marketScore(a))[0]]
    : [];
}

function orderSportsBundlesByLeagueDiversity(
  bundles: PolymarketProxyMarket[][]
) {
  const buckets = new Map<number, PolymarketProxyMarket[][]>();
  const untagged: PolymarketProxyMarket[][] = [];

  for (const bundle of bundles) {
    const tagId = String(bundle[0]?.sportsTagId || '').trim();
    const tagIndex = BROAD_SPORTS_GAMELINE_TAG_IDS.indexOf(tagId);
    if (tagIndex < 0) {
      untagged.push(bundle);
      continue;
    }
    if (!buckets.has(tagIndex)) buckets.set(tagIndex, []);
    buckets.get(tagIndex)?.push(bundle);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => marketScore(b[0]) - marketScore(a[0]));
  }
  untagged.sort((a, b) => marketScore(b[0]) - marketScore(a[0]));

  const ordered: PolymarketProxyMarket[][] = [];
  let madeProgress = true;
  while (madeProgress) {
    madeProgress = false;
    for (let i = 0; i < BROAD_SPORTS_GAMELINE_TAG_IDS.length; i += 1) {
      const bucket = buckets.get(i);
      if (!bucket?.length) continue;
      const next = bucket.shift();
      if (next) ordered.push(next);
      madeProgress = true;
    }
  }

  return ordered.concat(untagged);
}

function selectSportsMoneylineMarkets(
  markets: PolymarketProxyMarket[],
  limit: number
) {
  const groups = new Map<string, PolymarketProxyMarket[]>();
  for (const market of markets) {
    const key = marketEventKey(market);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(market);
  }

  const bundles: PolymarketProxyMarket[][] = [];
  for (const group of groups.values()) {
    const bundle = pickMoneylineBundle(group);
    if (bundle.length) bundles.push(bundle);
  }

  return orderSportsBundlesByLeagueDiversity(bundles).flat().slice(0, limit);
}

function shouldFanOutSportsMoneylines(searchParams: URLSearchParams) {
  const tagId = String(searchParams.get('tag_id') || '').trim();
  const marketSet = String(
    searchParams.get('market_set') || searchParams.get('marketSet') || ''
  )
    .trim()
    .toLowerCase();

  return (
    searchParams.get('kind') === 'gamelines' &&
    MONEYLINE_MARKET_SETS.has(marketSet) &&
    !searchParams.get('q') &&
    !searchParams.get('search') &&
    !searchParams.get('event_slug') &&
    !searchParams.get('eventSlug') &&
    (!tagId || BROAD_SPORTS_TAG_IDS.has(tagId))
  );
}

async function fetchDesktopMarkets(forward: URLSearchParams) {
  const url = `${POLYMARKET_BACKEND_URL}/api/prediction-markets/desktop/markets?${forward.toString()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!response.ok) {
    throw new Error(`Upstream responded ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchBroadSportsMoneylines(
  forward: URLSearchParams,
  limit: number
) {
  const perTagLimit = String(Math.max(8, Math.min(20, limit)));
  const responses = await Promise.allSettled(
    BROAD_SPORTS_GAMELINE_TAG_IDS.map(async (tagId) => {
      const tagForward = new URLSearchParams(forward);
      tagForward.set('tag_id', tagId);
      tagForward.set('limit', perTagLimit);
      const markets = await fetchDesktopMarkets(tagForward);
      return markets.map((market) => ({ ...market, sportsTagId: tagId }));
    })
  );

  const markets: PolymarketProxyMarket[] = [];
  for (const response of responses) {
    if (response.status === 'fulfilled') markets.push(...response.value);
  }

  return selectSportsMoneylineMarkets(markets, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forward = new URLSearchParams();
    forward.set('limit', searchParams.get('limit') ?? '20');
    forward.set('offset', searchParams.get('offset') ?? '0');

    for (const key of FORWARD_PARAMS) {
      if (key === 'limit' || key === 'offset') continue;
      const v = searchParams.get(key);
      if (v != null && v !== '') forward.set(key, v);
    }

    const limit = Number.parseInt(forward.get('limit') || '20', 10) || 20;
    let data: PolymarketProxyMarket[] = [];
    if (shouldFanOutSportsMoneylines(forward)) {
      data = await fetchBroadSportsMoneylines(forward, limit);
    }

    if (!data.length) data = await fetchDesktopMarkets(forward);
    if (shouldFanOutSportsMoneylines(forward)) {
      data = selectSportsMoneylineMarkets(data, limit);
    }

    return NextResponse.json(data, { headers: cacheHeadersFor(forward) });
  } catch (error) {
    // This endpoint feeds a cosmetic market ticker that already renders
    // fallback content on an empty list. Degrade gracefully with 200 + []
    // instead of a 500 so a transient backend hiccup never surfaces as a
    // browser console error (which the Next.js dev overlay tallies).
    console.warn('Desktop markets ticker upstream unavailable:', error);
    return NextResponse.json([], {
      status: 200,
      headers: FALLBACK_CACHE_HEADERS,
    });
  }
}
