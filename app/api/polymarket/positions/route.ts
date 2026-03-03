import { NextRequest, NextResponse } from 'next/server';

const POLYMARKET_API_BASE = 'https://polymarket.apiswop.co';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${POLYMARKET_API_BASE}/api/prediction-markets/positions?user=${userAddress}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}