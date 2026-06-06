import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const JUPITER_QUOTE_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = JUPITER_QUOTE_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

const normalizeSlippageBps = (value: string | null) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(Math.max(Math.round(number), 0), 10000);
};

const normalizePlatformFeeBps = (value: string | null) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return Math.min(Math.round(number), 10000);
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const inputMint = params.get('inputMint') || '';
  const outputMint = params.get('outputMint') || '';
  const amount = params.get('amount') || '';
  const swapMode = params.get('swapMode') || 'ExactIn';

  if (!inputMint || !outputMint || !amount) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required Jupiter quote parameters.',
      },
      { status: 400 },
    );
  }

  const searchParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    swapMode,
  });

  const slippageBps = normalizeSlippageBps(params.get('slippageBps'));
  if (slippageBps !== undefined) {
    searchParams.set('slippageBps', slippageBps.toString());
  }

  const platformFeeBps = normalizePlatformFeeBps(
    params.get('platformFeeBps'),
  );
  if (platformFeeBps !== undefined) {
    searchParams.set('platformFeeBps', platformFeeBps.toString());
  }

  const jupiterHeaders: HeadersInit = process.env.JUPITER_API_KEY
    ? {
        'Content-Type': 'application/json',
        'x-api-key': process.env.JUPITER_API_KEY,
      }
    : {
        'Content-Type': 'application/json',
      };

  const endpoints: Array<{ url: string; headers: HeadersInit }> = [
    {
      url: `https://api.jup.ag/swap/v1/quote?${searchParams.toString()}`,
      headers: jupiterHeaders,
    },
    {
      url: `https://lite-api.jup.ag/swap/v1/quote?${searchParams.toString()}`,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  ];

  try {
    let response: Response | null = null;
    let data: any = null;

    for (const [index, endpoint] of endpoints.entries()) {
      response = await fetchWithTimeout(endpoint.url, {
        method: 'GET',
        headers: endpoint.headers,
        cache: 'no-store',
      });
      data = await response.json().catch(() => null);

      if (response.ok || (response.status !== 429 && response.status < 500)) {
        break;
      }

      if (index < endpoints.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!response || !response.ok) {
      const status = response?.status || 502;
      const error =
        status === 429
          ? 'Service is busy. Please wait a moment and try again.'
          : status === 404
            ? 'This token pair is not available for swapping.'
            : status >= 500
              ? 'Swap service is temporarily down. Please try again later.'
              : data?.errorMessage ||
                data?.error ||
                'Unable to get price quote. Please try again.';

      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status },
      );
    }

    if (!data?.outAmount) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to calculate swap price. Please try different amounts or tokens.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    const isAbort = error?.name === 'AbortError';
    return NextResponse.json(
      {
        success: false,
        error: isAbort
          ? 'Jupiter quote is taking too long. Try refreshing the quote.'
          : error?.message || 'Failed to get Jupiter quote.',
      },
      { status: isAbort ? 504 : 500 },
    );
  }
}
