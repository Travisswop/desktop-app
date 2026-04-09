import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { success: false, status: 'fail', message: 'API URL not configured' },
      { status: 500 }
    );
  }

  const cookieToken = request.cookies.get('access-token')?.value;
  const headerToken = request.headers.get('authorization')?.split(' ')[1];
  const accessToken = cookieToken || headerToken;

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        status: 'fail',
        message: 'Access Denied ⁣⁣🔴',
        debug: {
          hasAccessTokenCookie: Boolean(cookieToken),
          hasAuthorizationHeader: Boolean(headerToken),
        },
      },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, status: 'fail', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const upstream = await fetch(`${apiUrl}/api/v5/wallet/ensure-user-token-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
    },
  });
}
