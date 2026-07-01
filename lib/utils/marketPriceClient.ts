import {
  extractPriceFromMarketResponse,
  getNativeMarketId,
  getTokenFallbackPrice,
  getTokenMarketAddress,
  getTokenMarketChain,
  isNativeMarketToken,
  parseMarketPrice,
} from "@/lib/utils/tokenMarketData";
import { apiFetch } from "@/lib/api/apiFetch";

type PriceCacheEntry = {
  snapshot?: TokenLivePriceSnapshot;
  expiresAt: number;
  promise?: Promise<TokenLivePriceSnapshot>;
};

type FetchTokenLivePriceOptions = {
  outputToken: any;
  apiUrl?: string;
  authToken?: string | null;
};

export type MarketPriceProviderFailure = {
  provider?: string;
  code?: string;
  reason?: string;
  retryable?: boolean;
};

export type TokenLivePriceSnapshot = {
  price: number | null;
  degraded: boolean;
  providerFailures: MarketPriceProviderFailure[];
};

const PRICE_CACHE_TTL_MS = 30_000;
const priceCache = new Map<string, PriceCacheEntry>();

function normalizeProviderFailures(
  value: unknown,
): MarketPriceProviderFailure[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const provider =
        typeof (entry as any).provider === "string"
          ? (entry as any).provider
          : undefined;
      const code =
        typeof (entry as any).code === "string" ? (entry as any).code : undefined;
      const reason =
        typeof (entry as any).reason === "string"
          ? (entry as any).reason
          : undefined;
      const retryable =
        typeof (entry as any).retryable === "boolean"
          ? (entry as any).retryable
          : undefined;

      if (!provider && !code && !reason && retryable === undefined) return null;

      return {
        provider,
        code,
        reason,
        retryable,
      };
    })
    .filter((entry): entry is MarketPriceProviderFailure => Boolean(entry));
}

function getSnapshotMetadata(payload: unknown) {
  const data = (payload as any)?.data ?? payload;
  const providerFailures = normalizeProviderFailures(data?.providerFailures);

  return {
    degraded: Boolean(data?.degraded || providerFailures.length > 0),
    providerFailures,
  };
}

function getPriceCacheKey(outputToken: any): string | null {
  const chain = getTokenMarketChain(outputToken);
  if (!chain) return null;

  if (isNativeMarketToken(outputToken)) {
    const tokenId = getNativeMarketId(chain);
    return tokenId ? `native:${chain}:${tokenId}` : null;
  }

  const address = getTokenMarketAddress(outputToken);
  return address ? `address:${chain}:${address.toLowerCase()}` : null;
}

export async function fetchTokenLivePriceSnapshot({
  outputToken,
  apiUrl,
  authToken,
}: FetchTokenLivePriceOptions): Promise<TokenLivePriceSnapshot> {
  const fallbackPrice = getTokenFallbackPrice(outputToken);
  const chain = getTokenMarketChain(outputToken);
  const baseUrl = apiUrl?.replace(/\/$/, "");
  const fallbackSnapshot: TokenLivePriceSnapshot = {
    price: fallbackPrice,
    degraded: false,
    providerFailures: [],
  };

  if (!chain || !baseUrl) return fallbackSnapshot;

  const cacheKey = getPriceCacheKey(outputToken);
  const now = Date.now();
  const cached = cacheKey ? priceCache.get(cacheKey) : undefined;

  if (cached?.snapshot && cached.expiresAt > now) {
    return cached.snapshot;
  }

  if (cached?.promise) {
    try {
      return await cached.promise;
    } catch {
      return fallbackSnapshot;
    }
  }

  const fetchPromise = (async () => {
    if (isNativeMarketToken(outputToken)) {
      const tokenId = getNativeMarketId(chain);
      if (!tokenId) return fallbackSnapshot;

      const res = await apiFetch(`${baseUrl}/api/v5/market/token/${tokenId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (!res.ok) throw new Error("Native price fetch failed");
      const json = await res.json();
      return {
        price: parseMarketPrice(json.data?.price) ?? fallbackPrice,
        ...getSnapshotMetadata(json),
      };
    }

    const address = getTokenMarketAddress(outputToken);
    if (!address) return fallbackSnapshot;

    const res = await apiFetch(`${baseUrl}/api/v5/market/prices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ tokens: [{ address, chain }] }),
    });

    if (!res.ok) throw new Error("Price fetch failed");
    const json = await res.json();
    return {
      price: extractPriceFromMarketResponse(json, address) ?? fallbackPrice,
      ...getSnapshotMetadata(json),
    };
  })();

  if (cacheKey) {
    priceCache.set(cacheKey, {
      snapshot: cached?.snapshot,
      expiresAt: cached?.expiresAt ?? 0,
      promise: fetchPromise,
    });
  }

  try {
    const snapshot = await fetchPromise;
    if (cacheKey && snapshot.price !== null) {
      priceCache.set(cacheKey, {
        snapshot,
        expiresAt: Date.now() + PRICE_CACHE_TTL_MS,
      });
    }
    return snapshot;
  } catch {
    if (cacheKey) priceCache.delete(cacheKey);
    return fallbackSnapshot;
  }
}

export async function fetchTokenLivePrice({
  outputToken,
  apiUrl,
  authToken,
}: FetchTokenLivePriceOptions): Promise<number | null> {
  const snapshot = await fetchTokenLivePriceSnapshot({
    outputToken,
    apiUrl,
    authToken,
  });

  return snapshot.price;
}

export function resetMarketPriceCacheForTests() {
  priceCache.clear();
}
