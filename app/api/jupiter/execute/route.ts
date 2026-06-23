import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getJupiterApiHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = process.env.JUPITER_API_KEY?.trim();
  if (apiKey) headers['x-api-key'] = apiKey;
  return headers;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const signedTransaction = String(body?.signedTransaction || '');
  const requestId = String(body?.requestId || '');

  if (!signedTransaction || !requestId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required Jupiter execute parameters.',
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch('https://api.jup.ag/swap/v2/execute', {
      method: 'POST',
      headers: getJupiterApiHeaders(),
      cache: 'no-store',
      body: JSON.stringify({
        signedTransaction,
        requestId,
        lastValidBlockHeight: body?.lastValidBlockHeight,
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.errorMessage ||
            data?.error ||
            'Unable to execute swap. Please try again.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute Jupiter order.',
      },
      { status: 500 }
    );
  }
}
