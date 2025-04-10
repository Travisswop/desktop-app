import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const req = await request.json();
    if (!req.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/${req.email}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    const userData = await res.json();
    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to verify user',
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
