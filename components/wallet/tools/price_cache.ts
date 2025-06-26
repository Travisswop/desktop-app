import { PublicKey } from '@solana/web3.js';

interface CachedPrice {
  price: string;
  timestamp: number;
  source: string;
}

class PriceCache {
  private cache: Map<string, CachedPrice> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cached items

  /**
   * Get cached price if it's still valid
   */
  get(tokenAddress: string): CachedPrice | null {
    const cached = this.cache.get(tokenAddress);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      // Cache expired, remove it
      this.cache.delete(tokenAddress);
      return null;
    }

    return cached;
  }

  /**
   * Set price in cache
   */
  set(tokenAddress: string, price: string, source: string): void {
    // Clean up old entries if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup();
    }

    this.cache.set(tokenAddress, {
      price,
      timestamp: Date.now(),
      source,
    });
  }

  /**
   * Clear expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    }

    // Remove oldest entries if still too large
    if (this.cache.size - expiredKeys.length >= this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      const toRemove =
        this.cache.size - this.MAX_CACHE_SIZE + expiredKeys.length;
      for (let i = 0; i < toRemove; i++) {
        expiredKeys.push(sortedEntries[i][0]);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}

// Global cache instance
const priceCache = new PriceCache();

/**
 * Get cached price or fetch new one
 */
export async function getCachedPrice(
  tokenAddress: PublicKey,
  fetchFunction: (address: PublicKey) => Promise<string>
): Promise<string> {
  const addressStr = tokenAddress.toBase58();

  // Check cache first
  const cached = priceCache.get(addressStr);
  if (cached) {
    console.log(
      `Using cached price for ${addressStr}: ${cached.price} (from ${cached.source})`
    );
    return cached.price;
  }

  // Fetch new price
  const price = await fetchFunction(tokenAddress);

  // Cache the result (even if it's 0, to avoid repeated failed requests)
  priceCache.set(addressStr, price, 'API');

  return price;
}

/**
 * Prefetch prices for multiple tokens
 */
export async function prefetchPrices(
  tokenAddresses: PublicKey[],
  fetchFunction: (address: PublicKey) => Promise<string>
): Promise<void> {
  const promises = tokenAddresses.map(async (address) => {
    const addressStr = address.toBase58();
    const cached = priceCache.get(addressStr);

    if (!cached) {
      try {
        const price = await fetchFunction(address);
        priceCache.set(addressStr, price, 'Prefetch');
      } catch (error) {
        console.warn(
          `Failed to prefetch price for ${addressStr}:`,
          error
        );
      }
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return priceCache.getStats();
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

export default priceCache;
