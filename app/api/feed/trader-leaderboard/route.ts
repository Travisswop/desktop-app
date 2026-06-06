import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FORWARD_PARAMS = ['limit', 'scanLimit', 'viewerUserId'];

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const { searchParams } = new URL(request.url);
    const forward = new URLSearchParams();

    for (const key of FORWARD_PARAMS) {
      const value = searchParams.get(key);
      if (value != null && value !== '') forward.set(key, value);
    }

    const upstreamUrl = new URL('/api/v2/feed/trader-leaderboard', apiUrl);
    upstreamUrl.search = forward.toString();

    const cookieAccessToken = request.cookies.get('access-token')?.value;
    const authorization =
      request.headers.get('authorization') ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null);

    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      cache: 'no-store',
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type':
          response.headers.get('content-type') || 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[feed/trader-leaderboard] Backend fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trader leaderboard' },
      { status: 502 },
    );
  }
}
