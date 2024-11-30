import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

// Define which routes should be protected
const protectedRoutes = [
  '/',
  '/onboard',
  '/feed',
  '/smartsite',
  '/qrcode',
  '/wallet',
  '/analytics',
  '/mint',
  '/order',
  '/content',
];

// Define public paths that should be accessible without authentication
const publicPaths = [
  '/api',
  '/_next',
  '/static',
  '/images',
  '/favicon.ico',
  '/assets',
  '/login', // Add login to public paths to prevent redirect loop
];

// Cache auth results with expiry
const authCache = new Map<
  string,
  { timestamp: number; isValid: boolean }
>();
const CACHE_DURATION = 720 * 60 * 1000; // 720 minutes in milliseconds

async function verifyAuth(request: NextRequest) {
  const privy_token = request.cookies.get('privy-token')?.value;
  const privy_id_token = request.cookies.get('privy-id-token')?.value;
  // Check cache first
  const cacheKey = `${privy_token}:${privy_id_token}`;
  const cachedResult = authCache.get(cacheKey);
  const now = Date.now();

  if (cachedResult && now - cachedResult.timestamp < CACHE_DURATION) {
    console.log('cachedResult', cachedResult.isValid);
    return cachedResult.isValid;
  }

  try {
    const privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
      process.env.NEXT_PUBLIC_PRIVY_APP_SECRET || ''
    );
    // Verify both tokens
    if (!privy_token || !privy_id_token) {
      authCache.set(cacheKey, { timestamp: now, isValid: false });
      return false;
    }

    const { userId } = await privy.verifyAuthToken(privy_token);
    const user = await privy.getUser({ idToken: privy_id_token });

    if (!userId || !user) {
      authCache.set(cacheKey, { timestamp: now, isValid: false });
      return false;
    }

    // Cache successful result
    authCache.set(cacheKey, { timestamp: now, isValid: true });
    return true;
  } catch (error) {
    console.error('Auth verification error:', error);
    authCache.set(cacheKey, { timestamp: now, isValid: false });
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const privy_token = request.cookies.get('privy-token')?.value;
  const privy_id_token = request.cookies.get('privy-id-token')?.value;

  if (!privy_token || !privy_id_token) {
    if (pathname === '/login') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const isAuthenticated = await verifyAuth(request);
    console.log(
      '🚀 ~ middleware ~ isAuthenticated:',
      isAuthenticated
    );

    // If user is authenticated and trying to access protected routes, allow access
    if (
      isAuthenticated &&
      protectedRoutes.some((route) => pathname.startsWith(route))
    ) {
      return NextResponse.next();
    }

    // If user is not authenticated and trying to access protected routes
    if (
      !isAuthenticated &&
      protectedRoutes.some((route) => pathname.startsWith(route))
    ) {
      // Clear any stale cookies
      const response = NextResponse.redirect(
        new URL('/login', request.url)
      );
      response.cookies.delete('privy-token');
      response.cookies.delete('privy-id-token');
      response.cookies.delete('privy-refresh-token');
      response.cookies.delete('privy-session');
      response.cookies.delete('access-token');
      response.cookies.delete('user-id');
      return response;
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // Clear cookies on error
    const response = NextResponse.redirect(
      new URL('/login', request.url)
    );
    response.cookies.delete('privy-token');
    response.cookies.delete('privy-id-token');
    response.cookies.delete('privy-refresh-token');
    return response;
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of authCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      authCache.delete(key);
    }
  }
}, CACHE_DURATION);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
