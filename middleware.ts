import { PrivyClient as NewPrivyClient } from "@privy-io/node";
import { NextRequest, NextResponse } from "next/server";

type AuthCacheEntry = {
  timestamp: number;
  isValid: boolean;
  userId?: string;
  lastVerified?: number;
};

// Constants - Optimized for faster login
const VERIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes
const EXTENDED_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_CACHE_SIZE = 1000;
const MAX_RETRIES = 2; // Reduced from 3
const INITIAL_RETRY_DELAY = 500; // Reduced from 1000ms
const VERIFICATION_TIMEOUT = 5000; // 5 seconds max per attempt

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
  "/feed/:path*",
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
  if (pathname.startsWith("/feed/")) {
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
  if (authCache.size > MAX_CACHE_SIZE) {
    const now = Date.now();
    const entries = [...authCache.entries()].sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    const entriesToDelete = entries.filter(
      ([, entry]) => now - entry.timestamp > EXTENDED_CACHE_DURATION,
    );

    if (entriesToDelete.length > 0) {
      entriesToDelete.forEach(([key]) => {
        console.log("Deleting truly stale cache entry");
        authCache.delete(key);
      });
    } else if (authCache.size > MAX_CACHE_SIZE * 1.5) {
      const toDelete = Math.floor(authCache.size * 0.1);
      entries.slice(0, toDelete).forEach(([key]) => authCache.delete(key));
      console.log(`Cache over capacity, deleted ${toDelete} oldest entries`);
    }
  }
}

function createRedirect(
  req: NextRequest,
  target: string,
  clearCookies: boolean,
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
  pathname: string,
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
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
    return false;
  }

  return true;
}

async function verifyTokenWithRetry(
  newPrivy: NewPrivyClient,
  token: string,
  maxRetries: number = MAX_RETRIES,
): Promise<{ isValid: boolean; userId: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout to each verification attempt
      const verificationPromise = newPrivy
        .utils()
        .auth()
        .verifyAccessToken(token);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Verification timeout")),
          VERIFICATION_TIMEOUT,
        ),
      );

      const verifiedClaims = (await Promise.race([
        verificationPromise,
        timeoutPromise,
      ])) as any;

      return {
        isValid: Boolean(verifiedClaims.user_id),
        userId: verifiedClaims.user_id || "",
      };
    } catch (error) {
      console.error(`Token verification attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries) {
        // On final failure, just trust the cookie exists
        console.log("Max retries reached, trusting cookie existence");
        return { isValid: true, userId: "" };
      }

      // Faster exponential backoff
      const delay =
        Math.pow(2, attempt) * INITIAL_RETRY_DELAY + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { isValid: true, userId: "" }; // Always succeed if cookie exists
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options; // Reduced from 10000

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
  now: number,
): boolean {
  const lastVerified = cachedResult.lastVerified || cachedResult.timestamp;
  return now - lastVerified > VERIFICATION_INTERVAL;
}

async function backgroundTokenVerification(
  token: string,
  cacheKey: string,
): Promise<void> {
  try {
    const newPrivy = new NewPrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });

    const verificationResult = await verifyTokenWithRetry(newPrivy, token, 1); // Only 1 retry in background
    const now = Date.now();

    const existingCache = authCache.get(cacheKey);
    if (existingCache && verificationResult.isValid) {
      authCache.set(cacheKey, {
        ...existingCache,
        isValid: true,
        userId: verificationResult.userId,
        lastVerified: now,
      });
      console.log("Background verification successful, cache updated");
    } else if (existingCache) {
      authCache.set(cacheKey, {
        ...existingCache,
        lastVerified: now,
      });
      console.warn(
        "Background verification failed, but keeping user logged in",
      );
    }
  } catch (error) {
    console.error("Background token verification error (ignored):", error);
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
        timeout: 5000, // Reduced timeout
      },
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
  now: number,
  isFirstLogin: boolean = false,
): Promise<{ isValid: boolean; userId: string }> {
  // CRITICAL: If we have ANY cached result, always return it as valid
  if (cachedResult) {
    const age = now - cachedResult.timestamp;
    console.log(`Cache hit: age=${Math.floor(age / 60000)} minutes`);

    // Refresh timestamp to prevent expiration
    authCache.set(cacheKey, {
      ...cachedResult,
      timestamp: now,
    });

    // Optionally trigger background verification (non-blocking, non-critical)
    if (age > VERIFICATION_INTERVAL && !isFirstLogin) {
      console.log("Triggering background verification");
      backgroundTokenVerification(token, cacheKey).catch(() => {});
    }

    return {
      isValid: true,
      userId: cachedResult.userId || "",
    };
  }

  // No cache - attempt first verification
  console.log("No cache found, attempting first verification");

  // OPTIMIZATION: For first login (redirect from login page), be more lenient
  if (isFirstLogin) {
    console.log("First login detected, creating optimistic cache entry");

    // Create optimistic cache entry immediately
    authCache.set(cacheKey, {
      timestamp: now,
      isValid: true,
      userId: "",
      lastVerified: now,
    });

    // Try verification in background, but don't wait
    (async () => {
      try {
        const newPrivy = new NewPrivyClient({
          appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
          appSecret: process.env.PRIVY_APP_SECRET!,
        });

        const verificationResult = await verifyTokenWithRetry(
          newPrivy,
          token,
          1,
        );

        if (verificationResult.userId) {
          authCache.set(cacheKey, {
            timestamp: now,
            isValid: true,
            userId: verificationResult.userId,
            lastVerified: now,
          });
          console.log("Background verification completed with userId");
        }
      } catch (error) {
        console.log("Background verification failed (ignored):", error);
      }
    })();

    // Return immediately
    return {
      isValid: true,
      userId: "",
    };
  }

  // Regular flow (not first login)
  try {
    const newPrivy = new NewPrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });

    const verificationResult = await verifyTokenWithRetry(newPrivy, token);

    console.log("First verification result:", verificationResult.isValid);

    authCache.set(cacheKey, {
      timestamp: now,
      isValid: true,
      userId: verificationResult.userId || "",
      lastVerified: now,
    });

    return {
      isValid: true,
      userId: verificationResult.userId || "",
    };
  } catch (error) {
    console.error(
      "First verification failed, but allowing access anyway:",
      error,
    );

    authCache.set(cacheKey, {
      timestamp: now,
      isValid: true,
      userId: "",
      lastVerified: now,
    });

    return {
      isValid: true,
      userId: "",
    };
  }
}

// async function handleAuthenticatedUser(
//   req: NextRequest,
//   pathname: string,
//   userId: string,
// ): Promise<NextResponse | null> {
//   if (!isAuthRoute(pathname)) {
//     return null;
//   }

//   // If userId is empty (from failed verification), skip backend check
//   if (!userId) {
//     if (pathname === "/login") {
//       return createRedirect(req, "/onboard", false);
//     }
//     return NextResponse.next();
//   }

//   // Handle /onboard route
//   if (pathname === "/onboard") {
//     try {
//       const { exists, status } = await checkUserInBackend(userId);

//       if (exists) {
//         console.log(`User exists, redirecting to /`);
//         return createRedirect(req, "/", false);
//       } else if (status === 404) {
//         return NextResponse.next();
//       } else {
//         console.warn(`API returned status ${status}, allowing onboard access`);
//         return NextResponse.next();
//       }
//     } catch (error) {
//       console.error(
//         "Error checking user in backend (allowing onboard):",
//         error,
//       );
//       return NextResponse.next();
//     }
//   }

//   // Handle /login route
//   if (pathname === "/login") {
//     try {
//       const { exists, status } = await checkUserInBackend(userId);

//       if (exists) {
//         console.log(`User exists, redirecting to /`);
//         return createRedirect(req, "/", false);
//       } else {
//         console.log(`User doesn't exist, redirecting to /onboard`);
//         return createRedirect(req, "/onboard", false);
//       }
//     } catch (error) {
//       console.error(
//         "Error checking user in backend (redirecting to onboard):",
//         error,
//       );
//       return createRedirect(req, "/onboard", false);
//     }
//   }

//   return null;
// }

async function handleAuthenticatedUser(
  req: NextRequest,
  pathname: string,
  userId: string,
): Promise<NextResponse | null> {
  if (!isAuthRoute(pathname)) {
    return null;
  }

  // If userId is empty (from failed verification), skip backend check
  if (!userId) {
    if (pathname === "/login") {
      return createRedirect(req, "/onboard", false);
    }
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
        error,
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
        // User doesn't exist - clear cookies and allow login page access
        console.log(
          `User doesn't exist, clearing cookies and staying on login`,
        );
        const response = NextResponse.next();

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

        return response;
      }
    } catch (error) {
      console.error(
        "Error checking user in backend (clearing cookies and staying on login):",
        error,
      );

      // On error, also clear cookies and allow login
      const response = NextResponse.next();
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

      return response;
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
    const userId = req.cookies.get("user-id")?.value;

    // THE KEY RULE: If either token cookie exists, user is logged in
    if (token || accessToken) {
      console.log(`[AUTH] Token found for path: ${pathname}`, {
        hasPrivyToken: !!token,
        hasAccessToken: !!accessToken,
        hasUserId: !!userId,
      });

      try {
        const authToken = token || accessToken;
        if (!authToken) {
          console.error("[AUTH] Both tokens are undefined");
          return response;
        }

        cleanupCache();
        const cacheKey = authToken;
        const cachedResult = authCache.get(cacheKey);
        const now = Date.now();

        // Detect if this is likely a fresh login (user-id cookie just set)
        const isFirstLogin = !!userId && !cachedResult;

        console.log(`[AUTH] Cache status:`, {
          hasCached: !!cachedResult,
          cacheAge: cachedResult
            ? Math.floor((now - cachedResult.timestamp) / 60000)
            : null,
          isFirstLogin,
        });

        const { isValid, userId: verifiedUserId } = await verifyAndCacheToken(
          authToken,
          cacheKey,
          cachedResult,
          now,
          isFirstLogin,
        );

        console.log(`[AUTH] Verification result:`, {
          isValid,
          hasUserId: !!(verifiedUserId || userId),
        });

        if (isValid) {
          // Use the cookie userId if verification didn't return one
          const finalUserId = verifiedUserId || userId || "";

          const authRedirect = await handleAuthenticatedUser(
            req,
            pathname,
            finalUserId,
          );

          if (authRedirect) {
            console.log(`[AUTH] Redirecting authenticated user`);
            return authRedirect;
          }

          console.log(`[AUTH] Allowing authenticated access to: ${pathname}`);
          return response;
        }

        console.error(
          "[AUTH] WARNING: Token marked invalid despite cookie existing!",
        );
        console.log("[AUTH] Allowing access anyway due to cookie presence");
        return response;
      } catch (error) {
        console.error(
          "[AUTH] Error during authentication (allowing access):",
          error,
        );
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

    const token = req.cookies.get("privy-token")?.value;
    const accessToken = req.cookies.get("access-token")?.value;

    if (token || accessToken) {
      console.log("Error occurred but token exists, allowing access");
      return NextResponse.next();
    }

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
