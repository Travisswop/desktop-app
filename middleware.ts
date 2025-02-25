import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest, NextResponse } from "next/server";

type AuthCacheEntry = {
  timestamp: number;
  isValid: boolean;
  userId?: string;
};

class AuthMiddleware {
  private authCache: Map<string, AuthCacheEntry>;
  private protectedRoutes: Set<string>; // Changed to Set for O(1) lookup
  private readonly CACHE_DURATION: number;
  private readonly MAX_CACHE_SIZE: number;
  private readonly AUTH_ROUTES: Set<string>; // New: Routes only for non-authenticated users

  constructor() {
    this.authCache = new Map();
    this.protectedRoutes = new Set([
      "/",
      "/feed",
      "/smartsite",
      "/qrcode",
      "/wallet",
      "/analytics",
      "/mint",
      "/order",
      "/content",
    ]);
    this.AUTH_ROUTES = new Set(["/login", "/onboard"]); // New: Authentication routes
    this.CACHE_DURATION = 2 * 24 * 60 * 60 * 1000; // 2 days
    this.MAX_CACHE_SIZE = 1000;
  }

  private isProtectedRoute(pathname: string): boolean {
    return (
      this.protectedRoutes.has(pathname) ||
      [...this.protectedRoutes].some((route) =>
        pathname.startsWith(`${route}/`)
      )
    );
  }

  private isAuthRoute(pathname: string): boolean {
    return this.AUTH_ROUTES.has(pathname);
  }

  // Clean up the authentication cache
  private cleanupCache(): void {
    const now = Date.now();
    const expiredTime = now - this.CACHE_DURATION;

    // Single iteration to find both expired and excess entries
    const entries = [...this.authCache.entries()].sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    // Remove expired entries
    entries.forEach(([key, value]) => {
      if (value.timestamp < expiredTime) {
        this.authCache.delete(key);
      }
    });

    // Remove oldest entries if cache is too large
    if (this.authCache.size > this.MAX_CACHE_SIZE) {
      entries
        .slice(0, this.authCache.size - this.MAX_CACHE_SIZE)
        .forEach(([key]) => this.authCache.delete(key));
    }
  }

  private createRedirect(req: NextRequest, target: string): NextResponse {
    const response = NextResponse.redirect(new URL(target, req.url));

    if (target === "/login") {
      const cookiesToClear = new Set([
        "privy-token",
        "privy-id-token",
        "privy-refresh-token",
        "privy-session",
        "access-token",
        "user-id",
      ]);

      cookiesToClear.forEach((cookie) => response.cookies.delete(cookie));
    }

    return response;
  }

  private isMobileDevice(userAgent: string): boolean {
    return /Mobi|Android/i.test(userAgent);
  }

  private validateEnvironment(): void {
    const requiredEnvVars = {
      NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      NEXT_PUBLIC_PRIVY_APP_SECRET: process.env.NEXT_PUBLIC_PRIVY_APP_SECRET,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }
  }

  private handleMobileRedirect(userAgent: string): string | null {
    if (!this.isMobileDevice(userAgent)) return null;

    return userAgent.includes("Android")
      ? "https://play.google.com/store/apps/details?id=com.travisheron.swop"
      : "https://apps.apple.com/us/app/swopnew/id1593201322";
  }

  public async authenticate(req: NextRequest): Promise<NextResponse> {
    try {
      this.validateEnvironment();

      const { pathname } = req.nextUrl;
      const userAgent = req.headers.get("user-agent") || "";

      // Handle mobile redirects
      const mobileRedirect = this.handleMobileRedirect(userAgent);
      if (mobileRedirect) {
        return NextResponse.redirect(new URL(mobileRedirect, req.url));
      }

      // Skip API routes
      if (pathname.startsWith("/api")) {
        return NextResponse.next();
      }

      const token = req.cookies.get("privy-token")?.value;
      const isAuthRoute = this.isAuthRoute(pathname);

      // Handle authentication state
      if (token) {
        try {
          // Check cache first
          this.cleanupCache();
          const cacheKey = token;
          const cachedResult = this.authCache.get(cacheKey);
          const now = Date.now();

          let isValidToken = false;

          if (
            cachedResult &&
            now - cachedResult.timestamp < this.CACHE_DURATION
          ) {
            isValidToken = cachedResult.isValid;
          } else {
            // Verify token with Privy
            const privyServer = new PrivyClient(
              process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
              process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
            );

            const verifiedClaims = await privyServer.verifyAuthToken(token);
            isValidToken = Boolean(verifiedClaims.userId);

            // Update cache
            this.authCache.set(cacheKey, {
              timestamp: now,
              isValid: isValidToken,
              userId: verifiedClaims.userId,
            });
          }

          if (isValidToken) {
            // Redirect authenticated users away from auth routes
            if (isAuthRoute) {
              return this.createRedirect(req, "/");
            }
            return NextResponse.next();
          }
        } catch (error) {
          // Invalid token, clear it and redirect to login
          return this.createRedirect(req, "/login");
        }
      }

      // Handle unauthenticated requests
      if (this.isProtectedRoute(pathname)) {
        return this.createRedirect(req, "/login");
      }

      return NextResponse.next();
    } catch (error) {
      console.error("Authentication middleware error:", {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : "Unknown error",
        path: req.nextUrl.pathname,
      });

      return this.createRedirect(req, "/login");
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
    "/",
    "/feed/:path*",
    "/smartsite/:path*",
    "/qrcode/:path*",
    "/wallet/:path*",
    "/analytics/:path*",
    "/mint/:path*",
    "/order/:path*",
    "/content/:path*",
    "/login",
    "/onboard",
  ],
};
