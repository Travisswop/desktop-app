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

    const url = `${POLYMARKET_BACKEND_URL}/api/prediction-markets/desktop/markets?${forward.toString()}`;

    // Bound the upstream call so a slow/hung backend can't stall the request.
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      throw new Error(`Upstream responded ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // This endpoint feeds a cosmetic market ticker that already renders
    // fallback content on an empty list. Degrade gracefully with 200 + []
    // instead of a 500 so a transient backend hiccup never surfaces as a
    // browser console error (which the Next.js dev overlay tallies).
    console.warn('Desktop markets ticker upstream unavailable:', error);
    return NextResponse.json([], { status: 200 });
  }
}
