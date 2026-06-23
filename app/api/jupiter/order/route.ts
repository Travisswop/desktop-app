import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const normalizeSlippageBps = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(Math.max(Math.round(number), 0), 10000);
};

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
  const inputMint = String(body?.inputMint || '');
  const outputMint = String(body?.outputMint || '');
  const amount = String(body?.amount || '');
  const taker = String(body?.taker || '');
  const receiver = body?.receiver ? String(body.receiver) : '';

  if (!inputMint || !outputMint || !amount || !taker) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required Jupiter order parameters.',
      },
      { status: 400 }
    );
  }

  const searchParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    taker,
    swapMode: 'ExactIn',
  });

  const slippageBps = normalizeSlippageBps(body?.slippageBps);
  if (slippageBps !== undefined) {
    searchParams.set('slippageBps', slippageBps.toString());
  }
  if (receiver) searchParams.set('receiver', receiver);

  try {
    const response = await fetch(
      `https://api.jup.ag/swap/v2/order?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: getJupiterApiHeaders(),
        cache: 'no-store',
      }
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const baseError =
        response.status === 429
          ? 'Service is busy. Please wait a moment and try again.'
          : response.status === 404
          ? 'This token pair is not available for swapping.'
          : response.status >= 500
          ? 'Swap service is temporarily down. Please try again later.'
          : data?.errorMessage ||
            data?.error ||
            'Unable to get swap order. Please try again.';
      const errorCode =
        data?.errorCode !== undefined ? ` (code ${data.errorCode})` : '';

      return NextResponse.json(
        {
          success: false,
          error: `${baseError}${errorCode} (HTTP ${response.status})`,
        },
        { status: response.status }
      );
    }

    if (!data?.outAmount) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to calculate swap price. Please try different amounts or tokens.',
        },
        { status: 502 }
      );
    }

    if (!data.transaction || !data.requestId) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.errorMessage ||
            data?.error ||
            'This token pair cannot be swapped via Jupiter at this time.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to get Jupiter order.',
      },
      { status: 500 }
    );
  }
}
