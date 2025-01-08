import { PrivyClient } from '@privy-io/server-auth';
import { NextRequest, NextResponse } from 'next/server';

// Define a type for cached authentication results
type AuthCacheEntry = {
  timestamp: number;
  isValid: boolean;
  userId?: string;
};

class AuthMiddleware {
  private authCache: Map<string, AuthCacheEntry>;
  private protectedRoutes: string[];
  private CACHE_DURATION: number;
  private MAX_CACHE_SIZE: number;

  constructor() {
    this.authCache = new Map();
    this.protectedRoutes = [
      '/',
      '/feed',
      '/smartsite',
      '/qrcode',
      '/wallet',
      '/analytics',
      '/mint',
      '/order',
      '/content',
    ];
    this.CACHE_DURATION = 720 * 60 * 1000; // 720 minutes
    this.MAX_CACHE_SIZE = 1000;
  }

  // Check if a route is protected
  private isProtectedRoute(pathname: string): boolean {
    return this.protectedRoutes.some(
      (route) =>
        pathname === route || pathname.startsWith(`${route}/`)
    );
  }

  // Clean up the authentication cache
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.authCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.authCache.delete(key);
      }
    }

    if (this.authCache.size > this.MAX_CACHE_SIZE) {
      const oldestEntries = [...this.authCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.authCache.size - this.MAX_CACHE_SIZE);

      oldestEntries.forEach(([key]) => this.authCache.delete(key));
    }
  }

  // Create a response to redirect to login
  private createLoginRedirect(
    req: NextRequest,
    reason: string
  ): NextResponse {
    console.info(`Redirecting to login: ${reason}`);

    const response = NextResponse.redirect(
      new URL('/login', req.url)
    );

    // Clear all authentication-related cookies
    const cookiesToClear = [
      'privy-token',
      'privy-id-token',
      'privy-refresh-token',
      'privy-session',
      'access-token',
      'user-id',
    ];
    cookiesToClear.forEach((cookie) =>
      response.cookies.delete(cookie)
    );

    return response;
  }

  // New method to check if the request is from a mobile device
  private isMobileDevice(userAgent: string): boolean {
    return /Mobi|Android/i.test(userAgent);
  }

  // Validate environment configuration
  private validateEnvironment(): void {
    if (
      !process.env.NEXT_PUBLIC_PRIVY_APP_ID ||
      !process.env.NEXT_PUBLIC_PRIVY_APP_SECRET
    ) {
      throw new Error(
        'Privy authentication credentials are not configured'
      );
    }
  }

  // Main middleware authentication logic
  public async authenticate(
    req: NextRequest
  ): Promise<NextResponse | null> {
    try {
      // Validate environment first
      this.validateEnvironment();

      const { pathname } = req.nextUrl;

      // Check if the request is from a mobile device
      if (this.isMobileDevice(req.headers.get('user-agent') || '')) {
        const playStoreUrl =
          'https://play.google.com/store/apps/details?id=com.travisheron.swop&fbclid=IwAR2nRw3Ey1N0RQhFhNUfBUNA-77I_3Z7iNgJjIchiY4-5WhA7jjGLMetSTo';

        const appStoreUrl =
          'https://apps.apple.com/us/app/swopnew/id1593201322?fbclid=IwAR3yh6c7ri7DK56JEeXyOsIZHzJ4ZGNCJidFuZj-j4UCRXN8BxaK49HD3-I#?platform=iphone';

        // Redirect to the app store or play store based on the user agent
        if (req.headers.get('user-agent')?.includes('Android')) {
          return NextResponse.redirect(
            new URL(playStoreUrl, req.url)
          );
        } else {
          return NextResponse.redirect(new URL(appStoreUrl, req.url));
        }
      }

      // Skip authentication for specific pages or if not a protected route
      if (
        pathname === '/login' ||
        pathname === '/onboard' ||
        !this.isProtectedRoute(pathname) ||
        pathname.startsWith('/api')
      ) {
        return NextResponse.next();
      }

      // Extract the Privy token from cookies
      const token = req.cookies.get('privy-token')?.value;

      // No token for protected routes
      if (!token) {
        return this.createLoginRedirect(
          req,
          'No authentication token'
        );
      }

      // Check cache first
      this.cleanupCache();
      const cacheKey = `${token}`;
      const cachedResult = this.authCache.get(cacheKey);
      const now = Date.now();

      // Use cached result if valid
      if (
        cachedResult &&
        now - cachedResult.timestamp < this.CACHE_DURATION
      ) {
        if (cachedResult.isValid) {
          return NextResponse.next();
        } else {
          return this.createLoginRedirect(
            req,
            'Cached invalid token'
          );
        }
      }

      // Initialize Privy Client
      const privyServer = new PrivyClient(
        process.env.NEXT_PUBLIC_PRIVY_APP_ID as string,
        process.env.NEXT_PUBLIC_PRIVY_APP_SECRET as string
      );

      // Verify the Privy token
      const verifiedClaims = await privyServer.verifyAuthToken(token);

      // Cache successful authentication
      this.authCache.set(cacheKey, {
        timestamp: now,
        isValid: true,
        userId: verifiedClaims.userId,
      });

      // Additional verification
      if (verifiedClaims.userId) {
        return NextResponse.next();
      }

      // Unauthorized access
      return this.createLoginRedirect(req, 'No user ID found');
    } catch (error) {
      // Comprehensive error logging
      console.error('Authentication middleware error:', {
        errorName:
          error instanceof Error ? error.name : 'Unknown Error',
        errorMessage:
          error instanceof Error ? error.message : 'No error message',
        path: req.nextUrl.pathname,
      });

      // Specific error handling
      if (error instanceof Error) {
        switch (error.name) {
          case 'TokenExpiredError':
            return this.createLoginRedirect(req, 'Token expired');
          case 'JsonWebTokenError':
            return this.createLoginRedirect(req, 'Invalid token');
          default:
            return this.createLoginRedirect(
              req,
              'Authentication failed'
            );
        }
      }

      // Fallback error handling
      return this.createLoginRedirect(
        req,
        'Unexpected authentication error'
      );
    }
  }
}

// Create a singleton instance
const authMiddleware = new AuthMiddleware();

// Middleware function
export async function middleware(req: NextRequest) {
  return await authMiddleware.authenticate(req);
}

// Route matcher configuration
export const config = {
  matcher: [
    '/',
    '/feed/:path*',
    '/smartsite/:path*',
    '/qrcode/:path*',
    '/wallet/:path*',
    '/analytics/:path*',
    '/mint/:path*',
    '/order/:path*',
    '/content/:path*',
    '/login',
    '/onboard',
  ],
};
