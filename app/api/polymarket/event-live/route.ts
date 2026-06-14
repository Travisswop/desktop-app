import { NextRequest, NextResponse } from 'next/server';

import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

/**
 * GET /api/polymarket/event-live?slug=<event-slug>
 *
 * Frontend proxy for polymarket-backend's event status endpoint. The backend
 * owns the Gamma API call so the app has one Polymarket integration surface.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing required query param: slug' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/events/live?slug=${encodeURIComponent(
        slug,
      )}`,
      { cache: 'no-store' },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || 'Failed to fetch event live data',
        },
        { status: response.status, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[polymarket/event-live] Backend fetch error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
