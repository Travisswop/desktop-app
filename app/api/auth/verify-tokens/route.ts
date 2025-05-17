import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

export async function POST(request: NextRequest) {
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

  if (!req.privyToken && !req.privyIdToken) {
    return NextResponse.json(
      { error: 'Privy token not found', isValid: false },
      { status: 400 }
    );
  }

  try {
    const privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
      process.env.NEXT_PUBLIC_PRIVY_APP_SECRET || ''
    );

    // Verify both tokens
    const { userId } = await privy.verifyAuthToken(req.privyToken);
    const user = await privy.getUser({ idToken: req.privyIdToken });

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Privy Id not found', isValid: false },
        { status: 404 }
      );
    }

    const email =
      user.google?.email ||
      user.email?.address ||
      user.linkedAccounts.find((account) => account.type === 'email')
        ?.address ||
      user.linkedAccounts.find(
        (account) => account.type === 'google_oauth'
      )?.email;

    return NextResponse.json({
      isValid: true,
      email,
      userId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Authentication failed',
        isValid: false,
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 401 }
    );
  }
}
