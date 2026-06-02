import { NextRequest, NextResponse } from 'next/server';

import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';

/**
 * GET /api/polymarket/prices-history?tokenId=<TOKEN_ID>&interval=max&fidelity=30
 *
 * Frontend proxy for polymarket-backend's CLOB price history endpoint.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId');
  const interval = searchParams.get('interval') ?? 'max';
  const fidelity = searchParams.get('fidelity') ?? '30';

  if (!tokenId) {
    return NextResponse.json(
      { error: 'Missing required query param: tokenId' },
      { status: 400 },
    );
  }

  try {
    const params = new URLSearchParams({
      tokenId,
      interval,
      fidelity,
    });
    const response = await fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/prices-history?${params}`,
      { cache: 'no-store' },
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || 'Failed to fetch price history',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[polymarket/prices-history] Backend fetch error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
