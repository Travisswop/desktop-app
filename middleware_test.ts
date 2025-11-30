import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest, NextResponse } from "next/server";

type AuthCacheEntry = {
  timestamp: number;
  isValid: boolean;
  userId?: string;
  lastVerified?: number;
};

// Constants
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const EXTENDED_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
const VERIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;
const MAX_RETRIES = 2;

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
  const expiredTime = now - EXTENDED_CACHE_DURATION;

  for (const [key, entry] of authCache.entries()) {
    if (entry.timestamp < expiredTime) {
      authCache.delete(key);
    }
  }

  if (authCache.size > MAX_CACHE_SIZE) {
    const entries = [...authCache.entries()].sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    entries
      .slice(0, authCache.size - MAX_CACHE_SIZE)
      .forEach(([key]) => authCache.delete(key));
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

      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return { isValid: false, userId: "" };
}

async function fetchWithTimeout(
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

function shouldReVerifyToken(
  cachedResult: AuthCacheEntry,
  now: number
): boolean {
  const lastVerified = cachedResult.lastVerified || cachedResult.timestamp;
  return now - lastVerified > VERIFICATION_INTERVAL;
}

async function backgroundTokenVerification(
  token: string,
  cacheKey: string
): Promise<void> {
  try {
    const privyServer = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
    );

    const verificationResult = await verifyTokenWithRetry(privyServer, token);
    const now = Date.now();

    const existingCache = authCache.get(cacheKey);
    if (existingCache) {
      authCache.set(cacheKey, {
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

async function checkUserInBackend(userId: string): Promise<{
  exists: boolean;
  status: number;
}> {
  try {
    const response = await fetchWithTimeout(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/getPrivyUser/${userId}`,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
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
  // Valid cached result within primary cache duration
  if (cachedResult && now - cachedResult.timestamp < CACHE_DURATION) {
    const isValid = cachedResult.isValid;
    const userId = cachedResult.userId || "";

    // Background re-verification if needed
    if (isValid && shouldReVerifyToken(cachedResult, now)) {
      backgroundTokenVerification(token, cacheKey);
    }

    return { isValid, userId };
  }

  // Extended cache with fresh verification attempt
  if (cachedResult && now - cachedResult.timestamp < EXTENDED_CACHE_DURATION) {
    try {
      const privyServer = new PrivyClient(
        process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
        process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
      );

      const verificationResult = await verifyTokenWithRetry(privyServer, token);

      authCache.set(cacheKey, {
        timestamp: now,
        isValid: verificationResult.isValid,
        userId: verificationResult.userId,
        lastVerified: now,
      });

      return verificationResult;
    } catch (tokenError) {
      console.error(
        "Token verification failed, using cached result:",
        tokenError
      );

      // Fallback to cached result
      authCache.set(cacheKey, {
        ...cachedResult,
        timestamp: now,
      });

      return {
        isValid: cachedResult.isValid,
        userId: cachedResult.userId || "",
      };
    }
  }

  // No cache or expired, fresh verification
  try {
    const privyServer = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.NEXT_PUBLIC_PRIVY_APP_SECRET!
    );

    const verificationResult = await verifyTokenWithRetry(privyServer, token);

    authCache.set(cacheKey, {
      timestamp: now,
      isValid: verificationResult.isValid,
      userId: verificationResult.userId,
      lastVerified: now,
    });

    return verificationResult;
  } catch (tokenError) {
    console.error("Token verification failed:", tokenError);

    authCache.set(cacheKey, {
      timestamp: now,
      isValid: false,
      userId: "",
      lastVerified: now,
    });

    return { isValid: false, userId: "" };
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

  // Handle /onboard route
  if (pathname === "/onboard") {
    try {
      const { exists, status } = await checkUserInBackend(userId);

      if (exists) {
        console.log(
          `API call succeeded for userId: ${userId}, redirecting to /`
        );
        return createRedirect(req, "/", false);
      } else if (status === 404) {
        return NextResponse.next();
      } else {
        console.warn(
          `API returned status ${status} for user ${userId}, allowing onboard access`
        );
        return NextResponse.next();
      }
    } catch (error) {
      console.error("Error checking user in backend:", error);
      return NextResponse.next();
    }
  }

  // Handle /login route
  if (pathname === "/login") {
    try {
      const { exists, status } = await checkUserInBackend(userId);

      if (exists) {
        console.log(
          `API call succeeded for userId: ${userId}, redirecting to /`
        );
        return createRedirect(req, "/", false);
      } else if (status === 404) {
        return createRedirect(req, "/onboard", false);
      } else {
        console.log(
          `API call failed for userId: ${userId}, status: ${status}, redirecting to /onboard`
        );
        return createRedirect(req, "/onboard", false);
      }
    } catch (error) {
      console.error("Error checking user in backend:", error);
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

    // Handle authenticated users
    if (token) {
      try {
        cleanupCache();
        const cacheKey = token;
        const cachedResult = authCache.get(cacheKey);
        const now = Date.now();

        const { isValid, userId } = await verifyAndCacheToken(
          token,
          cacheKey,
          cachedResult,
          now
        );

        if (isValid && userId) {
          const authRedirect = await handleAuthenticatedUser(
            req,
            pathname,
            userId
          );
          if (authRedirect) {
            return authRedirect;
          }

          // User is authenticated and not on auth route
          return response;
        }
      } catch (error) {
        console.error("Authentication error:", error);
      }
    }

    // Handle unauthenticated requests
    if (isProtectedRoute(pathname) && !token) {
      return createRedirect(req, "/login", true);
    } else if (isProtectedRoute(pathname) && token) {
      console.log(
        "Token present but invalid or not verified, allowing fallback check"
      );
      return NextResponse.next();
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

    if (isAuthRoute(req.nextUrl.pathname)) {
      return NextResponse.next();
    }

    return createRedirect(req, "/login", true);
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
