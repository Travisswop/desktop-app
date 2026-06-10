(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/[root-of-the-server]__321faba0._.js", {

"[project]/shims/buffer.js [middleware-edge] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
'use strict';
// Next.js Turbopack (and some dependencies) may resolve `buffer` to the npm
// `buffer` polyfill package. That package does not export `constants`, but some
// Node-oriented deps (e.g. `thread-stream`) expect `require('buffer').constants`.
//
// This shim keeps the polyfill behavior while providing a compatible
// `constants.MAX_STRING_LENGTH` export.
const buffer = __turbopack_context__.f({
    "buffer": {
        id: ()=>"[project]/node_modules/buffer/index.js [middleware-edge] (ecmascript)",
        module: ()=>__turbopack_context__.r("[project]/node_modules/buffer/index.js [middleware-edge] (ecmascript)")
    },
    "buffer/": {
        id: ()=>"[project]/node_modules/buffer/index.js [middleware-edge] (ecmascript)",
        module: ()=>__turbopack_context__.r("[project]/node_modules/buffer/index.js [middleware-edge] (ecmascript)")
    }
})('buffer/');
// Node 20+ `buffer.constants.MAX_STRING_LENGTH` is ~536,870,888.
// For browsers/polyfills we just need a safe upper bound for string sizing.
const DEFAULT_MAX_STRING_LENGTH = 0x1fffffe8; // 536870888
if (!buffer.constants) buffer.constants = {};
if (!buffer.constants.MAX_LENGTH && typeof buffer.kMaxLength === 'number') {
    buffer.constants.MAX_LENGTH = buffer.kMaxLength;
}
if (!buffer.constants.MAX_STRING_LENGTH) {
    buffer.constants.MAX_STRING_LENGTH = DEFAULT_MAX_STRING_LENGTH;
}
module.exports = buffer;
}}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}}),
"[project]/middleware.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "config": (()=>config),
    "middleware": (()=>middleware)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$privy$2d$io$2f$node$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/@privy-io/node/index.mjs [middleware-edge] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$privy$2d$io$2f$node$2f$public$2d$api$2f$PrivyClient$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@privy-io/node/public-api/PrivyClient.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
;
;
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
    "/products",
    "/order",
    "/content",
    "/account-deletion"
]);
const AUTH_ROUTES = new Set([
    "/login",
    "/onboard"
]);
const PUBLIC_ROUTES = new Set([
    "/api",
    "/api/proxy/solana-nft",
    "/_next",
    "/favicon.ico",
    "/static",
    "/sp"
]);
// CSP Configuration
const cspConfig = {
    defaultSrc: [
        "'self'"
    ],
    scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://app.apiswop.co",
        "https://challenges.cloudflare.com",
        "https://swopme.app",
        "https://privy.swopme.app",
        "https://swop-id-ens-gateway.swop.workers.dev",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com"
    ],
    styleSrc: [
        "'self'",
        "'unsafe-inline'"
    ],
    imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "http:"
    ],
    fontSrc: [
        "'self'"
    ],
    objectSrc: [
        "'none'"
    ],
    baseUri: [
        "'self'"
    ],
    formAction: [
        "'self'"
    ],
    frameAncestors: [
        "'none'"
    ],
    childSrc: [
        "https://auth.privy.io",
        "https://verify.walletconnect.com",
        "https://verify.walletconnect.org"
    ],
    frameSrc: [
        "https://auth.privy.io",
        "https://privy.swopme.app",
        "https://verify.walletconnect.com",
        "https://verify.walletconnect.org",
        "https://challenges.cloudflare.com"
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
        "https://explorer-api.walletconnect.com",
        "https://polymarket.apiswop.co",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com"
    ],
    workerSrc: [
        "'self'"
    ],
    manifestSrc: [
        "'self'"
    ]
};
// In-memory cache
const authCache = new Map();
// Helper Functions
function generateCspHeader(config) {
    return Object.entries(config).map(([key, values])=>{
        const directive = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        return `${directive} ${values.join(" ")};`;
    }).join(" ").trim();
}
function isProtectedRoute(pathname) {
    // Feed post detail — public
    if (/^\/feed\/[a-f0-9]{24}$/i.test(pathname)) {
        return false;
    }
    // Feed comment detail — public
    if (/^\/feed\/comment\/[a-f0-9]{24}$/i.test(pathname)) {
        return false;
    }
    if (PROTECTED_ROUTES.has(pathname)) {
        return true;
    }
    for (const route of PROTECTED_ROUTES){
        if (pathname.startsWith(`${route}/`)) {
            return true;
        }
    }
    return false;
}
function isAuthRoute(pathname) {
    return AUTH_ROUTES.has(pathname);
}
function isPublicRoute(pathname) {
    if (pathname.startsWith("/sp/")) {
        return true;
    }
    for (const route of PUBLIC_ROUTES){
        if (pathname.startsWith(route)) {
            return true;
        }
    }
    return false;
}
function cleanupCache() {
    if (authCache.size > MAX_CACHE_SIZE) {
        const now = Date.now();
        const entries = [
            ...authCache.entries()
        ].sort((a, b)=>a[1].timestamp - b[1].timestamp);
        const entriesToDelete = entries.filter(([, entry])=>now - entry.timestamp > EXTENDED_CACHE_DURATION);
        if (entriesToDelete.length > 0) {
            entriesToDelete.forEach(([key])=>{
                console.log("Deleting truly stale cache entry");
                authCache.delete(key);
            });
        } else if (authCache.size > MAX_CACHE_SIZE * 1.5) {
            const toDelete = Math.floor(authCache.size * 0.1);
            entries.slice(0, toDelete).forEach(([key])=>authCache.delete(key));
            console.log(`Cache over capacity, deleted ${toDelete} oldest entries`);
        }
    }
}
function createRedirect(req, target, clearCookies) {
    if (req.nextUrl.pathname === target) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(target, req.url));
    // if (target === "/login" && clearCookies) {
    //   const cookiesToClear = [
    //     "privy-token",
    //     "privy-id-token",
    //     "privy-refresh-token",
    //     "privy-session",
    //     "access-token",
    //     "user-id",
    //   ];
    //   cookiesToClear.forEach((cookie) => {
    //     response.cookies.delete(cookie);
    //   });
    // }
    return response;
}
function isMobileDevice(userAgent) {
    return /Mobi|Android/i.test(userAgent);
}
function shouldRedirectMobile() {
    return process.env.ENABLE_MOBILE_REDIRECT === "true";
}
function handleMobileRedirect(userAgent, pathname) {
    if (pathname === "/login" || pathname === "/onboard") {
        return null;
    }
    if (!shouldRedirectMobile() || !isMobileDevice(userAgent)) {
        return null;
    }
    return userAgent.includes("Android") ? "https://play.google.com/store/apps/details?id=com.travisheron.swop" : "https://apps.apple.com/us/app/swopnew/id1593201322";
}
function validateEnvironment() {
    const requiredEnvVars = {
        NEXT_PUBLIC_PRIVY_APP_ID: ("TURBOPACK compile-time value", "cm9i37jxp00qfjs0mb2gz63ot"),
        PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET
    };
    const missingVars = Object.entries(requiredEnvVars).filter(([, value])=>!value).map(([key])=>key);
    if (missingVars.length > 0) {
        console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
        return false;
    }
    return true;
}
async function verifyTokenWithRetry(newPrivy, token, maxRetries = MAX_RETRIES) {
    for(let attempt = 0; attempt <= maxRetries; attempt++){
        try {
            // Add timeout to each verification attempt
            const verificationPromise = newPrivy.utils().auth().verifyAccessToken(token);
            const timeoutPromise = new Promise((_, reject)=>setTimeout(()=>reject(new Error("Verification timeout")), VERIFICATION_TIMEOUT));
            const verifiedClaims = await Promise.race([
                verificationPromise,
                timeoutPromise
            ]);
            return {
                isValid: Boolean(verifiedClaims.user_id),
                userId: verifiedClaims.user_id || ""
            };
        } catch (error) {
            console.error(`Token verification attempt ${attempt + 1} failed:`, error);
            if (attempt === maxRetries) {
                // On final failure, just trust the cookie exists
                console.log("Max retries reached, trusting cookie existence");
                return {
                    isValid: true,
                    userId: ""
                };
            }
            // Faster exponential backoff
            const delay = Math.pow(2, attempt) * INITIAL_RETRY_DELAY + Math.random() * 500;
            await new Promise((resolve)=>setTimeout(resolve, delay));
        }
    }
    return {
        isValid: true,
        userId: ""
    }; // Always succeed if cookie exists
}
async function fetchWithTimeout(url, options = {}) {
    const { timeout = 5000, ...fetchOptions } = options; // Reduced from 10000
    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
function shouldReVerifyToken(cachedResult, now) {
    const lastVerified = cachedResult.lastVerified || cachedResult.timestamp;
    return now - lastVerified > VERIFICATION_INTERVAL;
}
async function backgroundTokenVerification(token, cacheKey) {
    try {
        const newPrivy = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$privy$2d$io$2f$node$2f$public$2d$api$2f$PrivyClient$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PrivyClient"]({
            appId: ("TURBOPACK compile-time value", "cm9i37jxp00qfjs0mb2gz63ot"),
            appSecret: process.env.PRIVY_APP_SECRET
        });
        const verificationResult = await verifyTokenWithRetry(newPrivy, token, 1); // Only 1 retry in background
        const now = Date.now();
        const existingCache = authCache.get(cacheKey);
        if (existingCache && verificationResult.isValid) {
            authCache.set(cacheKey, {
                ...existingCache,
                isValid: true,
                userId: verificationResult.userId,
                lastVerified: now
            });
            console.log("Background verification successful, cache updated");
        } else if (existingCache) {
            authCache.set(cacheKey, {
                ...existingCache,
                lastVerified: now
            });
            console.warn("Background verification failed, but keeping user logged in");
        }
    } catch (error) {
        console.error("Background token verification error (ignored):", error);
    }
}
async function checkUserInBackend(userId) {
    try {
        const response = await fetchWithTimeout(`${("TURBOPACK compile-time value", "http://localhost:4000")}/api/v2/desktop/user/getPrivyUser/${userId}`, {
            headers: {
                "Content-Type": "application/json"
            },
            timeout: 5000
        });
        return {
            exists: response.ok,
            status: response.status
        };
    } catch (error) {
        console.error("Error checking user in backend:", error);
        throw error;
    }
}
async function verifyAndCacheToken(token, cacheKey, cachedResult, now, isFirstLogin = false) {
    // CRITICAL: If we have ANY cached result, always return it as valid
    if (cachedResult) {
        const age = now - cachedResult.timestamp;
        console.log(`Cache hit: age=${Math.floor(age / 60000)} minutes`);
        // Refresh timestamp to prevent expiration
        authCache.set(cacheKey, {
            ...cachedResult,
            timestamp: now
        });
        // Optionally trigger background verification (non-blocking, non-critical)
        if (age > VERIFICATION_INTERVAL && !isFirstLogin) {
            console.log("Triggering background verification");
            backgroundTokenVerification(token, cacheKey).catch(()=>{});
        }
        return {
            isValid: true,
            userId: cachedResult.userId || ""
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
            lastVerified: now
        });
        // Try verification in background, but don't wait
        (async ()=>{
            try {
                const newPrivy = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$privy$2d$io$2f$node$2f$public$2d$api$2f$PrivyClient$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PrivyClient"]({
                    appId: ("TURBOPACK compile-time value", "cm9i37jxp00qfjs0mb2gz63ot"),
                    appSecret: process.env.PRIVY_APP_SECRET
                });
                const verificationResult = await verifyTokenWithRetry(newPrivy, token, 1);
                if (verificationResult.userId) {
                    authCache.set(cacheKey, {
                        timestamp: now,
                        isValid: true,
                        userId: verificationResult.userId,
                        lastVerified: now
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
            userId: ""
        };
    }
    // Regular flow (not first login)
    try {
        const newPrivy = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$privy$2d$io$2f$node$2f$public$2d$api$2f$PrivyClient$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PrivyClient"]({
            appId: ("TURBOPACK compile-time value", "cm9i37jxp00qfjs0mb2gz63ot"),
            appSecret: process.env.PRIVY_APP_SECRET
        });
        const verificationResult = await verifyTokenWithRetry(newPrivy, token);
        console.log("First verification result:", verificationResult.isValid);
        authCache.set(cacheKey, {
            timestamp: now,
            isValid: true,
            userId: verificationResult.userId || "",
            lastVerified: now
        });
        return {
            isValid: true,
            userId: verificationResult.userId || ""
        };
    } catch (error) {
        console.error("First verification failed, but allowing access anyway:", error);
        authCache.set(cacheKey, {
            timestamp: now,
            isValid: true,
            userId: "",
            lastVerified: now
        });
        return {
            isValid: true,
            userId: ""
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
async function handleAuthenticatedUser(req, pathname, userId) {
    if (!isAuthRoute(pathname)) {
        return null;
    }
    // If userId is empty (from failed verification), skip backend check
    if (!userId) {
        if (pathname === "/login") {
            return createRedirect(req, "/onboard", false);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Handle /onboard route
    if (pathname === "/onboard") {
        if (req.nextUrl.searchParams.get("step") === "swop-id") {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
        }
        try {
            const { exists, status } = await checkUserInBackend(userId);
            if (exists) {
                console.log(`User exists, redirecting to /`);
                return createRedirect(req, "/", false);
            } else if (status === 404) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
            } else {
                console.warn(`API returned status ${status}, allowing onboard access`);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
            }
        } catch (error) {
            console.error("Error checking user in backend (allowing onboard):", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
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
                // // User doesn't exist - clear cookies and allow login page access
                // console.log(
                //   `User doesn't exist, clearing cookies and staying on login`,
                // );
                const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
                // const cookiesToClear = [
                //   "privy-token",
                //   "privy-id-token",
                //   "privy-refresh-token",
                //   "privy-session",
                //   "access-token",
                //   "user-id",
                // ];
                // cookiesToClear.forEach((cookie) => {
                //   response.cookies.delete(cookie);
                // });
                return response;
            }
        } catch (error) {
            console.error("Error checking user in backend (clearing cookies and staying on login):", error);
            // On error, also clear cookies and allow login
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
            // const cookiesToClear = [
            //   "privy-token",
            //   "privy-id-token",
            //   "privy-refresh-token",
            //   "privy-session",
            //   "access-token",
            //   "user-id",
            // ];
            // cookiesToClear.forEach((cookie) => {
            //   response.cookies.delete(cookie);
            // });
            return response;
        }
    }
    return null;
}
async function middleware(req) {
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
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
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(mobileRedirect));
        }
        const token = req.cookies.get("privy-token")?.value;
        const accessToken = req.cookies.get("access-token")?.value;
        const userId = req.cookies.get("user-id")?.value;
        // THE KEY RULE: If either token cookie exists, user is logged in
        if (token || accessToken) {
            console.log(`[AUTH] Token found for path: ${pathname}`, {
                hasPrivyToken: !!token,
                hasAccessToken: !!accessToken,
                hasUserId: !!userId
            });
            try {
                // IMPORTANT: Privy verification must only run on a Privy-issued token.
                // If we only have our backend `access-token`, skip Privy verification to avoid
                // spamming "Failed to verify authentication token" and misleading logs.
                const authToken = token;
                if (!authToken) {
                    console.warn("[AUTH] Access token present without privy-token; skipping Privy verification");
                    const authRedirect = await handleAuthenticatedUser(req, pathname, userId || "");
                    if (authRedirect) {
                        console.log(`[AUTH] Redirecting authenticated user`);
                        return authRedirect;
                    }
                    console.log(`[AUTH] Allowing authenticated access to: ${pathname}`);
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
                    cacheAge: cachedResult ? Math.floor((now - cachedResult.timestamp) / 60000) : null,
                    isFirstLogin
                });
                const { isValid, userId: verifiedUserId } = await verifyAndCacheToken(authToken, cacheKey, cachedResult, now, isFirstLogin);
                console.log(`[AUTH] Verification result:`, {
                    isValid,
                    hasUserId: !!(verifiedUserId || userId)
                });
                if (isValid) {
                    // Use the cookie userId if verification didn't return one
                    const finalUserId = verifiedUserId || userId || "";
                    const authRedirect = await handleAuthenticatedUser(req, pathname, finalUserId);
                    if (authRedirect) {
                        console.log(`[AUTH] Redirecting authenticated user`);
                        return authRedirect;
                    }
                    console.log(`[AUTH] Allowing authenticated access to: ${pathname}`);
                    return response;
                }
                console.error("[AUTH] WARNING: Token marked invalid despite cookie existing!");
                console.log("[AUTH] Allowing access anyway due to cookie presence");
                return response;
            } catch (error) {
                console.error("[AUTH] Error during authentication (allowing access):", error);
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
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
        return response;
    } catch (error) {
        console.error("Authentication middleware error:", {
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : "Unknown error",
            path: req.nextUrl.pathname
        });
        const token = req.cookies.get("privy-token")?.value;
        const accessToken = req.cookies.get("access-token")?.value;
        if (token || accessToken) {
            console.log("Error occurred but token exists, allowing access");
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
        }
        if (isProtectedRoute(req.nextUrl.pathname)) {
            return createRedirect(req, "/login", false);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
}
const config = {
    matcher: [
        "/",
        "/feed/:path*",
        "/dashboard/:path*",
        "/smartsite/:path*",
        "/qr-code/:path*",
        "/wallet/:path*",
        "/analytics/:path*",
        "/products/:path*",
        "/order/:path*",
        "/content/:path*",
        "/login",
        "/onboard",
        "/guest-order/:path*"
    ]
};
}}),
}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__321faba0._.js.map