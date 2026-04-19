import { NextRequest, NextResponse } from 'next/server';

const POLYMARKET_API_BASE = 'https://polymarket.apiswop.co';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const tagId = searchParams.get('tag_id');

    let url = `${POLYMARKET_API_BASE}/api/prediction-markets/markets?limit=${limit}&offset=${offset}`;

    if (tagId) {
      url += `&tag_id=${tagId}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch markets');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
