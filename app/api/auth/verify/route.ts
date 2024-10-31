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

    let req;
    try {
      req = await request.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!req.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    try {
      const res = await fetch(
        `http://localhost:4000/api/v2/desktop/user/${req.email}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('External API response:', {
        status: res.status,
        statusText: res.statusText,
      });

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
      console.error('External API error:', error);
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      {
        error: 'Authentication failed',
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 401 }
    );
  }
}
