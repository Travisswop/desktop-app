import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/polymarket/btc5m-market?window_start=<unix_seconds>
 *
 * Fetches the Polymarket BTC 5-minute Up/Down market for a specific window.
 * Tries multiple slug patterns against Gamma API, then falls back to a
 * title/endDate search so we gracefully handle any future slug changes.
 */

const GAMMA_API = 'https://gamma-api.polymarket.com';

/** Slug patterns used by Polymarket for 5-minute BTC Up/Down markets. */
function candidateSlugs(windowStart: number): string[] {
  return [
    `btc-updown-5m-${windowStart}`,
    `btc-up-down-5m-${windowStart}`,
    `bitcoin-updown-5m-${windowStart}`,
    `btc-5m-${windowStart}`,
  ];
}

/** True if a market looks like a BTC 5-minute up/down market. */
function isBtc5mMarket(m: Record<string, unknown>): boolean {
  const slug = ((m.slug ?? '') as string).toLowerCase();
  const question = ((m.question ?? m.title ?? '') as string).toLowerCase();
  const hasBtc = slug.includes('btc') || question.includes('btc') || question.includes('bitcoin');
  const has5m =
    slug.includes('5m') ||
    question.includes('5 minute') ||
    question.includes('5-minute') ||
    slug.includes('updown') ||
    slug.includes('up-down');
  return hasBtc && has5m;
}

async function fetchGamma(url: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.results ?? data?.markets ?? null);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const windowStartParam = searchParams.get('window_start');

  if (!windowStartParam) {
    return NextResponse.json({ error: 'window_start (unix seconds) is required' }, { status: 400 });
  }

  const windowStart = parseInt(windowStartParam, 10);
  if (isNaN(windowStart) || windowStart <= 0) {
    return NextResponse.json({ error: 'Invalid window_start' }, { status: 400 });
  }

  // ── 1. Try each known slug pattern ────────────────────────────────────────
  for (const slug of candidateSlugs(windowStart)) {
    const markets = await fetchGamma(`${GAMMA_API}/markets?slug=${slug}`);
    if (markets && markets.length > 0) {
      return NextResponse.json(markets[0]);
    }
  }

  // ── 2. Fallback: search markets ending within this 5-min window ───────────
  // Polymarket 5m markets have endDate = windowStart + 300 seconds.
  const windowEnd = windowStart + 300;
  const endDateMin = new Date((windowStart - 60) * 1000).toISOString(); // ±60s tolerance
  const endDateMax = new Date((windowEnd + 60) * 1000).toISOString();

  const searched = await fetchGamma(
    `${GAMMA_API}/markets?active=true&end_date_min=${endDateMin}&end_date_max=${endDateMax}&limit=20`,
  );

  if (searched) {
    const match = (searched as Record<string, unknown>[]).find(isBtc5mMarket);
    if (match) return NextResponse.json(match);
  }

  // ── 3. Fallback: search by tag and title ──────────────────────────────────
  const tagged = await fetchGamma(
    `${GAMMA_API}/markets?active=true&tag_slug=bitcoin&limit=30`,
  );

  if (tagged) {
    // Filter to markets that end within ±5 minutes of our window
    const match = (tagged as Record<string, unknown>[]).find((m) => {
      if (!isBtc5mMarket(m)) return false;
      const endTs = m.endDate
        ? Math.floor(new Date(m.endDate as string).getTime() / 1000)
        : 0;
      return endTs > 0 && Math.abs(endTs - windowEnd) < 300;
    });
    if (match) return NextResponse.json(match);
  }

  return NextResponse.json(
    { error: `No BTC 5m market found for window starting at ${windowStart}` },
    { status: 404 },
  );
}
