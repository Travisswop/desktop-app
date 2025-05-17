import { PrivyClient } from '@privy-io/server-auth';
import { NextRequest, NextResponse } from 'next/server';

type AuthCacheEntry = {
  timestamp: number;
  isValid: boolean;
  userId?: string;
};

// Centralized CSP configuration object for easier maintenance
const cspConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://app.apiswop.co',
    'https://challenges.cloudflare.com',
    'https://swopme.app',
    'https://privy.swopme.app',
  ],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  childSrc: [
    'https://auth.privy.io',
    'https://verify.walletconnect.com',
    'https://verify.walletconnect.org',
  ],
  frameSrc: [
    'https://auth.privy.io',
    'https://verify.walletconnect.com',
    'https://verify.walletconnect.org',
    'https://challenges.cloudflare.com',
  ],
  connectSrc: [
    "'self'",
    'https://app.apiswop.co',
    'https://swopme.app',
    'https://privy.swopme.app',
    'https://auth.privy.io',
    'wss://relay.walletconnect.com',
    'wss://relay.walletconnect.org',
    'wss://www.walletlink.org',
    'https://*.rpc.privy.systems',
    'https://*.g.alchemy.com',
    'https://*.quiknode.pro',
    'https://mainnet.helius-rpc.com',
    'https://aura-mainnet.metaplex.com',
    'https://*.coinranking.com',
    'https://*.cloudinary.com',
    'https://*.metaplex.com',
    'https://*.jup.ag', // Added the Jupiter API domain
  ],
  workerSrc: ["'self'"],
  manifestSrc: ["'self'"],
};

// Function to generate the CSP header string from the config object
function generateCspHeader(config: Record<string, string[]>): string {
  return Object.entries(config)
    .map(([key, values]) => {
      // Convert camelCase to kebab-case for CSP directives
      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${directive} ${values.join(' ')};`;
    })
    .join(' ')
    .trim();
}

class AuthMiddleware {
  private authCache: Map<string, AuthCacheEntry>;
  private protectedRoutes: Set<string>;
  private readonly CACHE_DURATION: number;
  private readonly MAX_CACHE_SIZE: number;
  private readonly AUTH_ROUTES: Set<string>;
  private readonly PUBLIC_ROUTES: Set<string>; // Routes accessible to everyone

  constructor() {
    this.authCache = new Map();
    this.protectedRoutes = new Set([
      '/',
      '/feed',
      '/smartsite',
      '/qrcode',
      '/wallet',
      '/analytics',
      '/mint',
      '/order',
      '/content',
    ]);
    this.AUTH_ROUTES = new Set(['/login', '/onboard']);
    this.PUBLIC_ROUTES = new Set([
      '/api',
      '/api/proxy/solana-nft', // Add proxy endpoint for Solana NFT fetching
      '/_next',
      '/favicon.ico',
      '/static',
    ]);
    this.CACHE_DURATION = 1 * 24 * 60 * 60 * 1000; // 1 days
    this.MAX_CACHE_SIZE = 1000;
  }

  private isProtectedRoute(pathname: string): boolean {
    // Skip protection for feed item routes (e.g., /feed/68008dec662c752ca276fc8b)
    if (/^\/feed\/[a-f0-9]{24}$/i.test(pathname)) {
      return false;
    }

    // Check if exact route matches
    if (this.protectedRoutes.has(pathname)) {
      return true;
    }

    // Check for route prefixes
    for (const route of this.protectedRoutes) {
      if (pathname.startsWith(`${route}/`)) {
        return true;
      }
    }

    return false;
  }

  private isAuthRoute(pathname: string): boolean {
    return this.AUTH_ROUTES.has(pathname);
  }

  private isPublicRoute(pathname: string): boolean {
    for (const route of this.PUBLIC_ROUTES) {
      if (pathname.startsWith(route)) {
        return true;
      }
    }
    return false;
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredTime = now - this.CACHE_DURATION;

    // Delete expired entries
    for (const [key, entry] of this.authCache.entries()) {
      if (entry.timestamp < expiredTime) {
        this.authCache.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (this.authCache.size > this.MAX_CACHE_SIZE) {
      const entries = [...this.authCache.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      entries
        .slice(0, this.authCache.size - this.MAX_CACHE_SIZE)
        .forEach(([key]) => this.authCache.delete(key));
    }
  }

  private createRedirect(
    req: NextRequest,
    target: string
  ): NextResponse {
    // Prevent redirect loops by checking if we're already on the target
    if (req.nextUrl.pathname === target) {
      return NextResponse.next();
    }

    const response = NextResponse.redirect(new URL(target, req.url));

    if (target === '/login') {
      // Clear all authentication cookies
      const cookiesToClear = [
        'privy-token',
        'privy-id-token',
        'privy-refresh-token',
        'privy-session',
        'access-token',
        'user-id',
      ];

      cookiesToClear.forEach((cookie) => {
        response.cookies.delete(cookie);
      });
    }

    return response;
  }

  private isMobileDevice(userAgent: string): boolean {
    return /Mobi|Android/i.test(userAgent);
  }

  // Only redirect mobile if specifically configured
  private shouldRedirectMobile(): boolean {
    return process.env.ENABLE_MOBILE_REDIRECT === 'true';
  }

  private handleMobileRedirect(
    userAgent: string,
    pathname: string
  ): string | null {
    // Skip mobile redirect for specific paths
    if (pathname === '/login' || pathname === '/onboard') {
      return null;
    }

    if (
      !this.shouldRedirectMobile() ||
      !this.isMobileDevice(userAgent)
    ) {
      return null;
    }

    return userAgent.includes('Android')
      ? 'https://play.google.com/store/apps/details?id=com.travisheron.swop'
      : 'https://apps.apple.com/us/app/swopnew/id1593201322';
  }

  private validateEnvironment(): boolean {
    const requiredEnvVars = {
      NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      NEXT_PUBLIC_PRIVY_APP_SECRET:
        process.env.NEXT_PUBLIC_PRIVY_APP_SECRET,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error(
        `Missing required environment variables: ${missingVars.join(
          ', '
        )}`
      );
      return false;
    }

    return true;
  }

  public async authenticate(req: NextRequest): Promise<NextResponse> {
    const response = NextResponse.next();

    try {
      if (!this.validateEnvironment()) {
        // If environment validation fails, allow the request to continue
        // This will let the application handle the error properly
        return response;
      }

      const { pathname } = req.nextUrl;
      const userAgent = req.headers.get('user-agent') || '';

      // Skip middleware for public routes
      if (this.isPublicRoute(pathname)) {
        return response;
      }

      // Handle mobile redirects (only if enabled and not on auth routes)
      const mobileRedirect = this.handleMobileRedirect(
        userAgent,
        pathname
      );
      if (mobileRedirect) {
        return NextResponse.redirect(new URL(mobileRedirect));
      }

      const token = req.cookies.get('privy-token')?.value;
      const isAuthRoute = this.isAuthRoute(pathname);
      // Handle authenticated users
      if (token) {
        let isValidToken = false;
        let userId = '';

        try {
          // Check cache first
          this.cleanupCache();
          const cacheKey = token;
          const cachedResult = this.authCache.get(cacheKey);
          const now = Date.now();

          if (
            cachedResult &&
            now - cachedResult.timestamp < this.CACHE_DURATION
          ) {
            isValidToken = cachedResult.isValid;
            userId = cachedResult.userId || '';
          } else {
            // Verify token with Privy

            const privyServer = new PrivyClient(
              process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
              process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
            );

            const verifiedClaims = await privyServer.verifyAuthToken(
              token
            );

            isValidToken = Boolean(verifiedClaims.userId);
            userId = verifiedClaims.userId || '';
            // Update cache
            this.authCache.set(cacheKey, {
              timestamp: now,
              isValid: isValidToken,
              userId,
            });
          }

          if (isValidToken) {
            // Redirect authenticated users away from auth routes
            if (isAuthRoute) {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/getPrivyUser/${userId}`,
                {
                  headers: { 'Content-Type': 'application/json' },
                }
              );

              if (response.ok) {
                return this.createRedirect(req, '/');
              }
            }
            return response;
          }
        } catch (error) {
          console.error('Token verification error:', error);
          // Fall through to redirect to login below
        }
      }

      // Handle unauthenticated requests
      if (this.isProtectedRoute(pathname)) {
        return this.createRedirect(req, '/login');
      }

      // Generate CSP header from the config object
      const cspHeader = generateCspHeader(cspConfig);

      if (process.env.NODE_ENV === 'production') {
        response.headers.set('Content-Security-Policy', cspHeader);
      }

      return response;
    } catch (error) {
      console.error('Authentication middleware error:', {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : 'Unknown error',
        path: req.nextUrl.pathname,
      });

      // In case of error, allow the request to proceed if it's an auth route
      if (this.isAuthRoute(req.nextUrl.pathname)) {
        return NextResponse.next();
      }

      return this.createRedirect(req, '/login');
    }
  }
}

// Create a singleton instance
const authMiddleware = new AuthMiddleware();

export async function middleware(req: NextRequest) {
  return await authMiddleware.authenticate(req);
}

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
    '/guest-order/:path*',
  ],
};
