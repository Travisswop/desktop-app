import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API = 'https://gamma-api.polymarket.com';

/**
 * GET /api/polymarket/teams[?sport=<slug>]
 *
 * Proxies the Gamma /teams endpoint which returns team metadata (name,
 * abbreviation, logo URL) used to decorate sports events and markets.
 *
 * Optional query param:
 *   sport — filter by sport slug (e.g. "nba", "nfl")
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport');

  let url = `${GAMMA_API}/teams`;
  if (sport) url += `?sport=${encodeURIComponent(sport)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Team rosters change occasionally — cache for 1 hour
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Gamma API returned an error', status: res.status },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[polymarket/teams] Fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
