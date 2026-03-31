import { NextRequest, NextResponse } from 'next/server';

const POLYMARKET_API_BASE = 'https://polymarket.apiswop.co';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');

    if (!user) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 },
      );
    }

    // Forward all supported query params to the polymarket proxy backend
    const params = new URLSearchParams({ user });
    ['limit', 'offset', 'type', 'side', 'start', 'end', 'sort'].forEach(
      (key) => {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      },
    );

    const response = await fetch(
      `${POLYMARKET_API_BASE}/api/prediction-markets/activity?${params}`,
      { cache: 'no-store' },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        `[polymarket/activity] upstream error ${response.status}:`,
        text,
      );
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('[polymarket/activity] fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 },
    );
  }
}
