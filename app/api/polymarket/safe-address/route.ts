import { NextRequest, NextResponse } from 'next/server';

const POLYMARKET_API_BASE = 'https://polymarket.apiswop.co';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eoaAddress = searchParams.get('eoa');

    console.log('Safe address API called with EOA:', eoaAddress);

    if (!eoaAddress) {
      console.error('No EOA address provided');
      return NextResponse.json(
        { error: 'EOA address is required' },
        { status: 400 }
      );
    }

    const url = `${POLYMARKET_API_BASE}/api/prediction-markets/safe-address?eoa=${eoaAddress}`;
    console.log('Fetching from URL:', url);

    const response = await fetch(url);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('External API error:', response.status, errorText);
      throw new Error(`External API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Safe address:', error);
    return NextResponse.json(
      { 
        error: 'Failed to derive Safe address',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}