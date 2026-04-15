import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/polymarket/sports-events?tag_id=<tagId>&limit=<n>&offset=<n>
 *
 * Fetches sports events with nested markets from the Gamma API.
 * Each event includes all related markets (moneyline, spread, total) so the
 * client can group them without additional round-trips.
 */

const GAMMA_API = 'https://gamma-api.polymarket.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ?? '20';
  const offset = searchParams.get('offset') ?? '0';
  const tagId = searchParams.get('tag_id');

  let url =
    `${GAMMA_API}/events` +
    `?active=true&closed=false` +
    `&limit=${limit}&offset=${offset}` +
    `&order=volume_24hr&ascending=false`;

  if (tagId) url += `&tag_id=${tagId}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Revalidate every 30 s at the edge — fine for sports schedules
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Gamma API returned an error', status: res.status },
        { status: res.status },
      );
    }

    const data = await res.json();
    // Gamma may return a plain array or { results: [...] } shape
    const events = Array.isArray(data)
      ? data
      : (data?.results ?? data?.events ?? []);

    return NextResponse.json(events);
  } catch (err) {
    console.error('[sports-events] Fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
