import { NextResponse } from 'next/server';

// Every auth cookie the app may have set. Cleared server-side so this also
// removes httpOnly cookies (e.g. the `access-token` set by
// /api/auth/refresh-token), which client-side js-cookie cannot touch.
const AUTH_COOKIE_NAMES = [
  'privy-token',
  'privy-id-token',
  'privy-refresh-token',
  'privy-session',
  'access-token',
  'user-id',
];

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    for (const name of AUTH_COOKIE_NAMES) {
      // Expire the cookie at the same path it was set on ('/'), so the
      // Set-Cookie actually matches and removes it regardless of httpOnly.
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });
    }

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 },
    );
  }
}
