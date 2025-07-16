import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest, NextResponse } from "next/server";

type AuthCacheEntry = {
  timestamp: number;
  isValid: boolean;
  userId?: string;
  lastVerified?: number; // Track when token was last successfully verified
};

// Centralized CSP configuration object for easier maintenance
const cspConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://app.apiswop.co",
    "https://challenges.cloudflare.com",
    "https://swopme.app",
    "https://privy.swopme.app",
  ],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  childSrc: [
    "https://auth.privy.io",
    "https://verify.walletconnect.com",
    "https://verify.walletconnect.org",
  ],
  frameSrc: [
    "https://auth.privy.io",
    "https://verify.walletconnect.com",
    "https://verify.walletconnect.org",
    "https://challenges.cloudflare.com",
  ],
  connectSrc: [
    "'self'",
    "https://app.apiswop.co",
    "https://swopme.app",
    "https://privy.swopme.app",
    "https://auth.privy.io",
    "wss://relay.walletconnect.com",
    "wss://relay.walletconnect.org",
    "wss://www.walletlink.org",
    "https://*.rpc.privy.systems",
    "https://*.g.alchemy.com",
    "https://*.quiknode.pro",
    "https://mainnet.helius-rpc.com",
    "https://aura-mainnet.metaplex.com",
    "https://*.coinranking.com",
    "https://*.cloudinary.com",
    "https://*.metaplex.com",
    "https://*.jup.ag",
  ],
  workerSrc: ["'self'"],
  manifestSrc: ["'self'"],
};

// Function to generate the CSP header string from the config object
function generateCspHeader(config: Record<string, string[]>): string {
  return Object.entries(config)
    .map(([key, values]) => {
      // Convert camelCase to kebab-case for CSP directives
      const directive = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${directive} ${values.join(" ")};`;
    })
    .join(" ")
    .trim();
}

class AuthMiddleware {
  private authCache: Map<string, AuthCacheEntry>;
  private protectedRoutes: Set<string>;
  private readonly CACHE_DURATION: number;
  private readonly EXTENDED_CACHE_DURATION: number;
  private readonly VERIFICATION_INTERVAL: number;
  private readonly MAX_CACHE_SIZE: number;
  private readonly AUTH_ROUTES: Set<string>;
  private readonly PUBLIC_ROUTES: Set<string>;
  private readonly MAX_RETRIES: number;

  constructor() {
    this.authCache = new Map();
    this.protectedRoutes = new Set([
      "/",
      "/feed",
      "/dashboard",
      "/smartsite",
      "/qr-code",
      "/wallet",
      "/analytics",
      "/mint",
      "/order",
      "/content",
    ]);
    this.AUTH_ROUTES = new Set(["/login", "/onboard"]);
    this.PUBLIC_ROUTES = new Set([
      "/api",
      "/api/proxy/solana-nft",
      "/_next",
      "/favicon.ico",
      "/static",
      "/sp",
    ]);
    this.CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
    this.EXTENDED_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for fallback
    this.VERIFICATION_INTERVAL = 5 * 60 * 1000; // Re-verify every 5 minutes
    this.MAX_CACHE_SIZE = 1000;
    this.MAX_RETRIES = 2;
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
    if (pathname.startsWith("/sp/")) {
      return true;
    }
    for (const route of this.PUBLIC_ROUTES) {
      if (pathname.startsWith(route)) {
        return true;
      }
    }
    return false;
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredTime = now - this.EXTENDED_CACHE_DURATION;

    // Delete entries that are beyond extended cache duration
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

  private createRedirect(req: NextRequest, target: string): NextResponse {
    // Prevent redirect loops by checking if we're already on the target
    if (req.nextUrl.pathname === target) {
      return NextResponse.next();
    }

    const response = NextResponse.redirect(new URL(target, req.url));

    if (target === "/login") {
      // Clear all authentication cookies
      const cookiesToClear = [
        "privy-token",
        "privy-id-token",
        "privy-refresh-token",
        "privy-session",
        "access-token",
        "user-id",
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

  private shouldRedirectMobile(): boolean {
    return process.env.ENABLE_MOBILE_REDIRECT === "true";
  }

  private handleMobileRedirect(
    userAgent: string,
    pathname: string
  ): string | null {
    // Skip mobile redirect for specific paths
    if (pathname === "/login" || pathname === "/onboard") {
      return null;
    }

    if (!this.shouldRedirectMobile() || !this.isMobileDevice(userAgent)) {
      return null;
    }

    return userAgent.includes("Android")
      ? "https://play.google.com/store/apps/details?id=com.travisheron.swop"
      : "https://apps.apple.com/us/app/swopnew/id1593201322";
  }

  private validateEnvironment(): boolean {
    const requiredEnvVars = {
      NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      NEXT_PUBLIC_PRIVY_APP_SECRET: process.env.NEXT_PUBLIC_PRIVY_APP_SECRET,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
      return false;
    }

    return true;
  }

  private async verifyTokenWithRetry(
    privyServer: PrivyClient,
    token: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<{ isValid: boolean; userId: string }> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const verifiedClaims = await privyServer.verifyAuthToken(token);
        return {
          isValid: Boolean(verifiedClaims.userId),
          userId: verifiedClaims.userId || "",
        };
      } catch (error) {
        console.error(
          `Token verification attempt ${attempt + 1} failed:`,
          error
        );

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    return { isValid: false, userId: "" };
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<Response> {
    const { timeout = 5000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private shouldReVerifyToken(
    cachedResult: AuthCacheEntry,
    now: number
  ): boolean {
    const lastVerified = cachedResult.lastVerified || cachedResult.timestamp;
    return now - lastVerified > this.VERIFICATION_INTERVAL;
  }

  public async authenticate(req: NextRequest): Promise<NextResponse> {
    const response = NextResponse.next();

    try {
      if (!this.validateEnvironment()) {
        return response;
      }

      const { pathname } = req.nextUrl;
      const userAgent = req.headers.get("user-agent") || "";

      // Skip middleware for public routes
      if (this.isPublicRoute(pathname)) {
        return response;
      }

      // Handle mobile redirects
      const mobileRedirect = this.handleMobileRedirect(userAgent, pathname);
      if (mobileRedirect) {
        return NextResponse.redirect(new URL(mobileRedirect));
      }

      const token = req.cookies.get("privy-token")?.value;
      const isAuthRoute = this.isAuthRoute(pathname);

      // Handle authenticated users
      if (token) {
        let isValidToken = false;
        let userId = "";

        try {
          // Check cache first
          this.cleanupCache();
          const cacheKey = token;
          const cachedResult = this.authCache.get(cacheKey);
          const now = Date.now();

          // Check if we have a valid cached result
          if (
            cachedResult &&
            now - cachedResult.timestamp < this.CACHE_DURATION
          ) {
            isValidToken = cachedResult.isValid;
            userId = cachedResult.userId || "";

            // If token is valid but hasn't been verified recently, re-verify in background
            if (isValidToken && this.shouldReVerifyToken(cachedResult, now)) {
              // Background verification - don't await
              this.backgroundTokenVerification(token, cacheKey);
            }
          }
          // Check if we have an extended cache result for fallback
          else if (
            cachedResult &&
            now - cachedResult.timestamp < this.EXTENDED_CACHE_DURATION
          ) {
            try {
              // Try to verify the token
              const privyServer = new PrivyClient(
                process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
                process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
              );

              const verificationResult = await this.verifyTokenWithRetry(
                privyServer,
                token
              );
              isValidToken = verificationResult.isValid;
              userId = verificationResult.userId;

              // Update cache with fresh verification
              this.authCache.set(cacheKey, {
                timestamp: now,
                isValid: isValidToken,
                userId,
                lastVerified: now,
              });
            } catch (tokenError) {
              console.error(
                "Token verification failed, using cached result:",
                tokenError
              );

              // Use cached result as fallback
              isValidToken = cachedResult.isValid;
              userId = cachedResult.userId || "";

              // Update timestamp but keep old verification time
              this.authCache.set(cacheKey, {
                ...cachedResult,
                timestamp: now,
              });
            }
          }
          // No cache or expired, verify token
          else {
            try {
              const privyServer = new PrivyClient(
                process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
                process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
              );

              const verificationResult = await this.verifyTokenWithRetry(
                privyServer,
                token
              );
              isValidToken = verificationResult.isValid;
              userId = verificationResult.userId;

              // Update cache with successful verification
              this.authCache.set(cacheKey, {
                timestamp: now,
                isValid: isValidToken,
                userId,
                lastVerified: now,
              });
            } catch (tokenError) {
              console.error("Token verification failed:", tokenError);

              isValidToken = false;
              userId = "";

              // Cache the failure to avoid repeated verification attempts
              this.authCache.set(cacheKey, {
                timestamp: now,
                isValid: false,
                userId: "",
                lastVerified: now,
              });
            }
          }

          console.log("isValidToken - Rayhan xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", isValidToken, userId);

          if (isValidToken && userId) {
            // Redirect authenticated users away from auth routes
            if (isAuthRoute) {
              // For onboard route, check if user exists in backend
              if (pathname === "/onboard") {
                try {
                  const response = await this.fetchWithTimeout(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/getPrivyUser/${userId}`,
                    {
                      headers: { "Content-Type": "application/json" },
                      timeout: 5000,
                    }
                  );

                  if (response.ok) {
                    return this.createRedirect(req, "/");
                  } else if (response.status === 404) {
                    return NextResponse.next();
                  } else {
                    console.warn(
                      `API returned status ${response.status} for user ${userId}, allowing onboard access`
                    );
                    return NextResponse.next();
                  }
                } catch (error) {
                  console.error("Error checking user in backend:", error);
                  return NextResponse.next();
                }
              }
              // For login route
              else if (pathname === "/login") {
                try {
                  const response = await this.fetchWithTimeout(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/getPrivyUser/${userId}`,
                    {
                      headers: { "Content-Type": "application/json" },
                      timeout: 5000,
                    }
                  );

                  if (response.ok) {
                    return this.createRedirect(req, "/");
                  } else if (response.status === 404) {
                    return this.createRedirect(req, "/onboard");
                  } else {
                    return this.createRedirect(req, "/onboard");
                  }
                } catch (error) {
                  console.error("Error checking user in backend:", error);
                  return this.createRedirect(req, "/onboard");
                }
              }
            }

            // User is authenticated and not on auth route, allow access
            return response;
          }
        } catch (error) {
          console.error("Authentication error:", error);
          // Don't immediately redirect on error - let it fall through
        }
      }

      // Handle unauthenticated requests
      if (this.isProtectedRoute(pathname)) {
        return this.createRedirect(req, "/login");
      }

      // Generate CSP header from the config object
      const cspHeader = generateCspHeader(cspConfig);

      if (process.env.NODE_ENV === "production") {
        response.headers.set("Content-Security-Policy", cspHeader);
      }

      return response;
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

      // In case of error, allow the request to proceed if it's an auth route
      if (this.isAuthRoute(req.nextUrl.pathname)) {
        return NextResponse.next();
      }

      return this.createRedirect(req, "/login");
    }
  }

  private async backgroundTokenVerification(
    token: string,
    cacheKey: string
  ): Promise<void> {
    try {
      const privyServer = new PrivyClient(
        process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
        process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
      );

      const verificationResult = await this.verifyTokenWithRetry(
        privyServer,
        token
      );
      const now = Date.now();

      // Update cache with background verification result
      const existingCache = this.authCache.get(cacheKey);
      if (existingCache) {
        this.authCache.set(cacheKey, {
          ...existingCache,
          isValid: verificationResult.isValid,
          userId: verificationResult.userId,
          lastVerified: now,
        });
      }
    } catch (error) {
      console.error("Background token verification failed:", error);
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
    "/dashboard/:path*",
    "/smartsite/:path*",
    "/qr-code/:path*",
    "/wallet/:path*",
    "/analytics/:path*",
    "/mint/:path*",
    "/order/:path*",
    "/content/:path*",
    "/login",
    "/onboard",
    "/guest-order/:path*",
  ],
};
