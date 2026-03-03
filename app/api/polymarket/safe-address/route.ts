import { NextRequest, NextResponse } from 'next/server';
import { POLYMARKET_API_BASE } from '@/constants/polymarket';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eoaAddress = searchParams.get('eoa');

    if (!eoaAddress) {
      return NextResponse.json(
        { error: 'EOA address is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${POLYMARKET_API_BASE}/api/prediction-markets/safe-address?eoa=${eoaAddress}`
    );

    if (!response.ok) {
      throw new Error('Failed to derive Safe address');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Safe address:', error);
    return NextResponse.json(
      { error: 'Failed to derive Safe address' },
      { status: 500 }
    );
  }
}