import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest, NextResponse } from "next/server";

type AuthCacheEntry = {
  timestamp: number;
  isValid: boolean;
  userId?: string;
  lastVerified?: number;
};

// Constants - Proper session management
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes - cache validity period
const VERIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes - background refresh interval
const EXTENDED_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours - maximum cache lifetime
const MAX_CACHE_SIZE = 1000;
const MAX_RETRIES = 3;

const PROTECTED_ROUTES = new Set([
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

const AUTH_ROUTES = new Set(["/login", "/onboard"]);

const PUBLIC_ROUTES = new Set([
  "/api",
  "/api/proxy/solana-nft",
  "/_next",
  "/favicon.ico",
  "/static",
  "/sp",
]);

// CSP Configuration
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
    "https://swop-id-ens-gateway.swop.workers.dev",
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
    "https://privy.swopme.app",
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
    "https://swop-id-ens-gateway.swop.workers.dev",
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
    "https://*.li.fi",
    "https://li.quest",
  ],
  workerSrc: ["'self'"],
  manifestSrc: ["'self'"],
};

// In-memory cache
const authCache = new Map<string, AuthCacheEntry>();

// Helper Functions
function generateCspHeader(config: Record<string, string[]>): string {
  return Object.entries(config)
    .map(([key, values]) => {
      const directive = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${directive} ${values.join(" ")};`;
    })
    .join(" ")
    .trim();
}

function isProtectedRoute(pathname: string): boolean {
  // Skip protection for feed item routes
  if (/^\/feed\/[a-f0-9]{24}$/i.test(pathname)) {
    return false;
  }

  if (PROTECTED_ROUTES.has(pathname)) {
    return true;
  }

  for (const route of PROTECTED_ROUTES) {
    if (pathname.startsWith(`${route}/`)) {
      return true;
    }
  }

  return false;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

function isPublicRoute(pathname: string): boolean {
  if (pathname.startsWith("/sp/")) {
    return true;
  }
  for (const route of PUBLIC_ROUTES) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }
  return false;
}

function cleanupCache(): void {
  const now = Date.now();
  const entries = [...authCache.entries()];

  // Delete expired entries (older than EXTENDED_CACHE_DURATION)
  let deletedCount = 0;
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > EXTENDED_CACHE_DURATION) {
      authCache.delete(key);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} expired cache entries`);
  }

  // If still over capacity after cleanup, delete oldest entries
  if (authCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = [...authCache.entries()].sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    const toDelete = authCache.size - MAX_CACHE_SIZE;
    sortedEntries.slice(0, toDelete).forEach(([key]) => authCache.delete(key));

    console.log(`Cache over capacity, deleted ${toDelete} oldest entries`);
  }
}

function createRedirect(
  req: NextRequest,
  target: string,
  clearCookies: boolean
): NextResponse {
  if (req.nextUrl.pathname === target) {
    return NextResponse.next();
  }

  const response = NextResponse.redirect(new URL(target, req.url));

  if (target === "/login" && clearCookies) {
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

function isMobileDevice(userAgent: string): boolean {
  return /Mobi|Android/i.test(userAgent);
}

function shouldRedirectMobile(): boolean {
  return process.env.ENABLE_MOBILE_REDIRECT === "true";
}

function handleMobileRedirect(
  userAgent: string,
  pathname: string
): string | null {
  if (pathname === "/login" || pathname === "/onboard") {
    return null;
  }

  if (!shouldRedirectMobile() || !isMobileDevice(userAgent)) {
    return null;
  }

  return userAgent.includes("Android")
    ? "https://play.google.com/store/apps/details?id=com.travisheron.swop"
    : "https://apps.apple.com/us/app/swopnew/id1593201322";
}

function validateEnvironment(): boolean {
  const requiredEnvVars = {
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
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

async function verifyTokenWithRetry(
  privyServer: PrivyClient,
  token: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ isValid: boolean; userId: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const verifiedClaims = await privyServer.verifyAuthToken(token);
      return {
        isValid: Boolean(verifiedClaims.userId),
        userId: verifiedClaims.userId || "",
      };
    } catch (error) {
      console.error(`Token verification attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { isValid: false, userId: "" };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

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

async function backgroundTokenVerification(
  token: string,
  cacheKey: string
): Promise<void> {
  try {
    const privyServer = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );

    const verificationResult = await verifyTokenWithRetry(privyServer, token);
    const now = Date.now();

    const existingCache = authCache.get(cacheKey);
    if (existingCache) {
      // Update cache with actual verification result
      authCache.set(cacheKey, {
        timestamp: now,
        isValid: verificationResult.isValid,
        userId: verificationResult.isValid
          ? verificationResult.userId
          : existingCache.userId,
        lastVerified: now,
      });

      if (verificationResult.isValid) {
        console.log("Background verification successful, cache updated");
      } else {
        console.warn("Background verification failed, cache marked invalid");
      }
    }
  } catch (error) {
    console.error("Background token verification error:", error);

    // Mark cache as invalid on error
    const existingCache = authCache.get(cacheKey);
    if (existingCache) {
      authCache.set(cacheKey, {
        ...existingCache,
        timestamp: Date.now(),
        isValid: false,
        lastVerified: Date.now(),
      });
    }
  }
}

async function checkUserInBackend(userId: string): Promise<{
  exists: boolean;
  status: number;
}> {
  try {
    const response = await fetchWithTimeout(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/getPrivyUser/${userId}`,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    return {
      exists: response.ok,
      status: response.status,
    };
  } catch (error) {
    console.error("Error checking user in backend:", error);
    throw error;
  }
}

async function verifyAndCacheToken(
  token: string,
  cacheKey: string,
  cachedResult: AuthCacheEntry | undefined,
  now: number
): Promise<{ isValid: boolean; userId: string }> {
  // Check if we have a valid cached result within TTL
  if (cachedResult) {
    const age = now - cachedResult.timestamp;
    const cacheAge = Math.floor(age / 60000);

    console.log(
      `Cache hit: age=${cacheAge} minutes, valid=${cachedResult.isValid}`
    );

    // Only trust cache if it's within TTL and was previously valid
    if (age < CACHE_TTL && cachedResult.isValid) {
      console.log("Returning valid cached result");

      // Trigger background verification if needed (non-blocking)
      if (age > VERIFICATION_INTERVAL) {
        console.log("Triggering background verification");
        backgroundTokenVerification(token, cacheKey).catch(() => {
          // Log but don't throw
        });
      }

      return {
        isValid: true,
        userId: cachedResult.userId || "",
      };
    }

    // Cache expired or invalid - need to re-verify
    console.log("Cache expired or invalid, re-verifying token");
  }

  // No cache or expired - verify token with Privy
  console.log("Verifying token with Privy");

  try {
    const privyServer = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );

    const verificationResult = await verifyTokenWithRetry(privyServer, token);

    console.log("Token verification result:", verificationResult.isValid);

    // Cache the ACTUAL verification result
    authCache.set(cacheKey, {
      timestamp: now,
      isValid: verificationResult.isValid,
      userId: verificationResult.userId || "",
      lastVerified: now,
    });

    // Return the actual verification result
    return verificationResult;
  } catch (error) {
    console.error("Token verification failed:", error);

    // Cache the failure to prevent repeated verification attempts
    authCache.set(cacheKey, {
      timestamp: now,
      isValid: false,
      userId: "",
      lastVerified: now,
    });

    // Return actual failure
    return {
      isValid: false,
      userId: "",
    };
  }
}

async function handleAuthenticatedUser(
  req: NextRequest,
  pathname: string,
  userId: string
): Promise<NextResponse | null> {
  if (!isAuthRoute(pathname)) {
    return null; // Continue with normal flow
  }

  // If userId is empty (from failed verification), skip backend check
  if (!userId) {
    // On /login, go to onboard
    if (pathname === "/login") {
      return createRedirect(req, "/onboard", false);
    }
    // On /onboard, let them stay
    return NextResponse.next();
  }

  // Handle /onboard route
  if (pathname === "/onboard") {
    try {
      const { exists, status } = await checkUserInBackend(userId);

      if (exists) {
        console.log(`User exists, redirecting to /`);
        return createRedirect(req, "/", false);
      } else if (status === 404) {
        return NextResponse.next();
      } else {
        console.warn(`API returned status ${status}, allowing onboard access`);
        return NextResponse.next();
      }
    } catch (error) {
      console.error(
        "Error checking user in backend (allowing onboard):",
        error
      );
      return NextResponse.next();
    }
  }

  // Handle /login route
  if (pathname === "/login") {
    try {
      const { exists, status } = await checkUserInBackend(userId);

      if (exists) {
        console.log(`User exists, redirecting to /`);
        return createRedirect(req, "/", false);
      } else {
        console.log(`User doesn't exist, redirecting to /onboard`);
        return createRedirect(req, "/onboard", false);
      }
    } catch (error) {
      console.error(
        "Error checking user in backend (redirecting to onboard):",
        error
      );
      return createRedirect(req, "/onboard", false);
    }
  }

  return null;
}

// Main Middleware Function
export async function middleware(req: NextRequest) {
  const response = NextResponse.next();

  try {
    if (!validateEnvironment()) {
      return response;
    }

    const { pathname } = req.nextUrl;
    const userAgent = req.headers.get("user-agent") || "";

    // Skip middleware for public routes
    if (isPublicRoute(pathname)) {
      return response;
    }

    // Handle mobile redirects
    const mobileRedirect = handleMobileRedirect(userAgent, pathname);
    if (mobileRedirect) {
      return NextResponse.redirect(new URL(mobileRedirect));
    }

    const token = req.cookies.get("privy-token")?.value;
    const accessToken = req.cookies.get("access-token")?.value;

    // If token cookie exists, validate it before allowing access
    if (token || accessToken) {
      console.log(`[AUTH] Token found for path: ${pathname}`, {
        hasPrivyToken: !!token,
        hasAccessToken: !!accessToken,
      });

      try {
        // Use privy-token if available, fallback to access-token
        const authToken = token || accessToken;
        if (!authToken) {
          console.error(
            "[AUTH] Both tokens are undefined, this should not happen"
          );
          return response;
        }

        cleanupCache();
        const cacheKey = authToken;
        const cachedResult = authCache.get(cacheKey);
        const now = Date.now();

        console.log(`[AUTH] Cache status:`, {
          hasCached: !!cachedResult,
          cacheAge: cachedResult
            ? Math.floor((now - cachedResult.timestamp) / 60000)
            : null,
        });

        const { isValid, userId } = await verifyAndCacheToken(
          authToken,
          cacheKey,
          cachedResult,
          now
        );

        console.log(`[AUTH] Verification result:`, {
          isValid,
          hasUserId: !!userId,
        });

        // Token is valid - allow access
        if (isValid) {
          const authRedirect = await handleAuthenticatedUser(
            req,
            pathname,
            userId
          );
          if (authRedirect) {
            console.log(`[AUTH] Redirecting authenticated user`);
            return authRedirect;
          }

          console.log(`[AUTH] Allowing authenticated access to: ${pathname}`);
          return response;
        }

        // Token is invalid - clear cookies and redirect to login if accessing protected route
        console.warn("[AUTH] Token validation failed, clearing session");

        if (isProtectedRoute(pathname)) {
          return createRedirect(req, "/login", true);
        }

        // For non-protected routes, clear cookies but allow access
        const responseWithClearedCookies = NextResponse.next();
        responseWithClearedCookies.cookies.delete("privy-token");
        responseWithClearedCookies.cookies.delete("access-token");
        responseWithClearedCookies.cookies.delete("privy-id-token");
        responseWithClearedCookies.cookies.delete("privy-refresh-token");
        return responseWithClearedCookies;
      } catch (error) {
        console.error("[AUTH] Error during authentication:", error);

        // On authentication error, redirect to login for protected routes
        if (isProtectedRoute(pathname)) {
          return createRedirect(req, "/login", true);
        }

        return response;
      }
    }

    console.log(`[AUTH] No token found for path: ${pathname}`);

    // NO TOKEN: Only redirect to login if accessing protected route
    if (isProtectedRoute(pathname)) {
      console.log(`[AUTH] Protected route without token, redirecting to login`);
      return createRedirect(req, "/login", false);
    }

    // Add CSP headers in production
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

    // On any error, check if token exists
    const token = req.cookies.get("privy-token")?.value;
    const accessToken = req.cookies.get("access-token")?.value;

    // If either token exists, ALWAYS let them through
    if (token || accessToken) {
      console.log("Error occurred but token exists, allowing access");
      return NextResponse.next();
    }

    // Only redirect if genuinely no token AND on protected route
    if (isProtectedRoute(req.nextUrl.pathname)) {
      return createRedirect(req, "/login", false);
    }

    return NextResponse.next();
  }
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
