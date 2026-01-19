import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/node';

export async function GET(request: NextRequest) {
  const privyToken = request.cookies.get('privy-token')?.value;
  const accessToken = request.headers
    .get('authorization')
    ?.split(' ')[1];

  if (!privyToken || !accessToken) {
    return NextResponse.json(
      { error: 'Missing authentication tokens', isValid: false },
      { status: 401 }
    );
  }

  try {
    const privy = new PrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });

    const { user_id} = await privy.utils().auth().verifyAccessToken(privyToken)

    if (!user_id) {
      return NextResponse.json(
        { error: "Invalid Privy token" },
        { status: 401 }
      );
    }

    // Verify access token with your backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/verify-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Invalid access token', isValid: false },
        { status: 401 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      isValid: true,
      expiresIn: data.expiresIn,
      userId: user_id,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      {
        error: 'Session verification failed',
        isValid: false,
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 401 }
    );
  }
}
