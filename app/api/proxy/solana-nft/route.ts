import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { endpoint, requestBody } = await req.json();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in solana-nft proxy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Metaplex API' },
      { status: 500 }
    );
  }
}
