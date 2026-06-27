import { NextResponse } from 'next/server';

const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:4000';

function getBackendApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_LOCAL_API_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const email = getString(body?.email);
    const privyId = getString(body?.privyId);
    const apiPath = email
      ? `/api/v2/desktop/user/${encodeURIComponent(email)}`
      : privyId
        ? `/api/v2/desktop/user/getPrivyUser/${encodeURIComponent(privyId)}`
        : '';

    if (!apiPath) {
      return NextResponse.json(
        { error: 'Email or Privy ID is required' },
        { status: 400 },
      );
    }

    const response = await fetch(`${getBackendApiBaseUrl()}${apiPath}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const bodyText = await response.text();

    return new Response(bodyText, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type':
          response.headers.get('content-type') ||
          'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch backend user',
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 },
    );
  }
}
