import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

export async function POST(request: NextRequest) {
  const privyToken = request.cookies.get('privy-token')?.value;
  const privyIdToken = request.cookies.get('privy-id-token')?.value;

  if (!privyToken || !privyIdToken) {
    return NextResponse.json(
      { error: 'Privy token not found', user: null },
      { status: 401 }
    );
  }

  try {
    const privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
      process.env.NEXT_PUBLIC_PRIVY_APP_SECRET || ''
    );

    // Verify both tokens
    const { userId } = await privy.verifyAuthToken(privyToken);
    const user = await privy.getUser({ idToken: privyIdToken });

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Privy Id not found', user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Authentication failed',
        user: null,
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 401 }
    );
  }
}
