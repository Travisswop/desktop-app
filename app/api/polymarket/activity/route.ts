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

    // Forward all query params to the backend
    const params = new URLSearchParams({ user });
    ['limit', 'offset', 'type', 'side', 'start', 'end', 'sort'].forEach(
      (key) => {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      },
    );

    const response = await fetch(
      `${POLYMARKET_API_BASE}/api/prediction-markets/activity?${params}`,
    );

    if (!response.ok) {
      throw new Error('Failed to fetch activity');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 },
    );
  }
}
