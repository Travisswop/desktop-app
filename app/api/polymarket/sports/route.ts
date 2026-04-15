import { NextResponse } from 'next/server';

const GAMMA_API = 'https://gamma-api.polymarket.com';

/**
 * GET /api/polymarket/sports
 *
 * Proxies the Gamma /sports endpoint which returns a list of sports/leagues
 * with their tag IDs, icons, and configuration used to filter /events and
 * /markets by sport.
 */
export async function GET() {
  try {
    const res = await fetch(`${GAMMA_API}/sports`, {
      headers: { Accept: 'application/json' },
      // Sports metadata changes rarely — cache for 1 hour at the edge
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
    console.error('[polymarket/sports] Fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
