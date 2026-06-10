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
  price?: number;
  expiresAt: number;
  promise?: Promise<number | null>;
};

type FetchTokenLivePriceOptions = {
  outputToken: any;
  apiUrl?: string;
  authToken?: string | null;
};

const PRICE_CACHE_TTL_MS = 30_000;
const priceCache = new Map<string, PriceCacheEntry>();

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

export async function fetchTokenLivePrice({
  outputToken,
  apiUrl,
  authToken,
}: FetchTokenLivePriceOptions): Promise<number | null> {
  const fallbackPrice = getTokenFallbackPrice(outputToken);
  const chain = getTokenMarketChain(outputToken);
  const baseUrl = apiUrl?.replace(/\/$/, "");

  if (!chain || !baseUrl) return fallbackPrice;

  const cacheKey = getPriceCacheKey(outputToken);
  const now = Date.now();
  const cached = cacheKey ? priceCache.get(cacheKey) : undefined;

  if (cached?.price && cached.expiresAt > now) {
    return cached.price;
  }

  if (cached?.promise) {
    return (await cached.promise) ?? fallbackPrice;
  }

  const fetchPromise = (async () => {
    if (isNativeMarketToken(outputToken)) {
      const tokenId = getNativeMarketId(chain);
      if (!tokenId) return fallbackPrice;

      const res = await apiFetch(`${baseUrl}/api/v5/market/token/${tokenId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (!res.ok) throw new Error("Native price fetch failed");
      const json = await res.json();
      return parseMarketPrice(json.data?.price) ?? fallbackPrice;
    }

    const address = getTokenMarketAddress(outputToken);
    if (!address) return fallbackPrice;

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
    return extractPriceFromMarketResponse(json, address) ?? fallbackPrice;
  })();

  if (cacheKey) {
    priceCache.set(cacheKey, {
      price: cached?.price,
      expiresAt: cached?.expiresAt ?? 0,
      promise: fetchPromise,
    });
  }

  try {
    const price = await fetchPromise;
    if (cacheKey && price) {
      priceCache.set(cacheKey, {
        price,
        expiresAt: Date.now() + PRICE_CACHE_TTL_MS,
      });
    }
    return price;
  } catch {
    if (cacheKey) priceCache.delete(cacheKey);
    return fallbackPrice;
  }
}
