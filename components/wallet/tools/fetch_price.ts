import { PublicKey } from '@solana/web3.js';
import { getCachedPrice } from './price_cache';
import logger from '../../../utils/logger';

/**
 * Fetch the price of a given token quoted in USD with multiple fallback methods
 * @param tokenAddress The token mint address
 * @returns The price of the token in USD
 */

interface PriceResponse {
  price: string;
  source: string;
  success: boolean;
}

// Primary Jupiter API
async function fetchFromJupiter(
  tokenAddress: PublicKey
): Promise<PriceResponse> {
  try {
    const response = await fetch(
      `https://lite-api.jup.ag/price/v2?ids=${tokenAddress.toBase58()}`,
      {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.data[tokenAddress.toBase58()]?.price;

    if (!price || price === '0') {
      throw new Error('No price data from Jupiter');
    }

    return { price, source: 'Jupiter', success: true };
  } catch (error) {
    logger.warn('Jupiter API failed:', error);
    return { price: '0', source: 'Jupiter', success: false };
  }
}

// Birdeye API fallback
async function fetchFromBirdeye(
  tokenAddress: PublicKey
): Promise<PriceResponse> {
  try {
    const response = await fetch(
      `https://public-api.birdeye.so/public/price?address=${tokenAddress.toBase58()}`,
      {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`Birdeye API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.data?.value;

    if (!price || price === 0) {
      throw new Error('No price data from Birdeye');
    }

    return {
      price: price.toString(),
      source: 'Birdeye',
      success: true,
    };
  } catch (error) {
    logger.warn('Birdeye API failed:', error);
    return { price: '0', source: 'Birdeye', success: false };
  }
}

// DexScreener API fallback
async function fetchFromDexScreener(
  tokenAddress: PublicKey
): Promise<PriceResponse> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress.toBase58()}`,
      {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const data = await response.json();
    const pairs = data.pairs;

    if (!pairs || pairs.length === 0) {
      throw new Error('No pairs found on DexScreener');
    }

    // Get the first pair with price data
    const pair = pairs.find(
      (p: any) => p.priceUsd && p.priceUsd !== '0'
    );
    if (!pair) {
      throw new Error('No valid price found on DexScreener');
    }

    return {
      price: pair.priceUsd,
      source: 'DexScreener',
      success: true,
    };
  } catch (error) {
    logger.warn('DexScreener API failed:', error);
    return { price: '0', source: 'DexScreener', success: false };
  }
}

// CoinGecko API fallback (for major tokens)
async function fetchFromCoinGecko(
  tokenAddress: PublicKey
): Promise<PriceResponse> {
  try {
    // First try to get token info from CoinGecko
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${tokenAddress.toBase58()}&vs_currencies=usd`,
      {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data[tokenAddress.toBase58()]?.usd;

    if (!price || price === 0) {
      throw new Error('No price data from CoinGecko');
    }

    return {
      price: price.toString(),
      source: 'CoinGecko',
      success: true,
    };
  } catch (error) {
    logger.warn('CoinGecko API failed:', error);
    return { price: '0', source: 'CoinGecko', success: false };
  }
}

// Pyth Network API fallback (for supported tokens)
async function fetchFromPyth(
  tokenAddress: PublicKey
): Promise<PriceResponse> {
  try {
    const response = await fetch(
      `https://api.pyth.network/price_feeds/latest?ids[]=${tokenAddress.toBase58()}`,
      {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.status}`);
    }

    const data = await response.json();
    const priceFeed = data[tokenAddress.toBase58()];

    if (!priceFeed || !priceFeed.price) {
      throw new Error('No price data from Pyth');
    }

    const price = (
      priceFeed.price.price / Math.pow(10, priceFeed.price.expo)
    ).toString();

    return { price, source: 'Pyth', success: true };
  } catch (error) {
    logger.warn('Pyth API failed:', error);
    return { price: '0', source: 'Pyth', success: false };
  }
}

export async function fetchPrice(
  tokenAddress: PublicKey
): Promise<string> {
  return getCachedPrice(tokenAddress, async (address) => {
    const tokenAddressStr = address.toBase58();

    // Try APIs in order of preference
    const apis = [
      fetchFromJupiter,
      fetchFromBirdeye,
      fetchFromDexScreener,
      fetchFromCoinGecko,
      fetchFromPyth,
    ];

    for (const api of apis) {
      try {
        const result = await api(address);
        if (result.success && result.price !== '0') {
          logger.info(
            `Price fetched from ${result.source} for ${tokenAddressStr}: ${result.price}`
          );
          return result.price;
        }
      } catch (error) {
        logger.warn(
          `API ${api.name} failed for ${tokenAddressStr}:`,
          error
        );
        continue;
      }
    }

    logger.error(
      `All price APIs failed for token: ${tokenAddressStr}`
    );
    return '0';
  });
}

// Enhanced version that returns more information
export async function fetchPriceWithDetails(
  tokenAddress: PublicKey
): Promise<{
  price: string;
  source: string;
  success: boolean;
  error?: string;
}> {
  const tokenAddressStr = tokenAddress.toBase58();

  const apis = [
    { name: 'Jupiter', fn: fetchFromJupiter },
    { name: 'Birdeye', fn: fetchFromBirdeye },
    { name: 'DexScreener', fn: fetchFromDexScreener },
    { name: 'CoinGecko', fn: fetchFromCoinGecko },
    { name: 'Pyth', fn: fetchFromPyth },
  ];

  for (const api of apis) {
    try {
      const result = await api.fn(tokenAddress);
      if (result.success && result.price !== '0') {
        return {
          price: result.price,
          source: result.source,
          success: true,
        };
      }
    } catch (error) {
      logger.warn(
        `${api.name} API failed for ${tokenAddressStr}:`,
        error
      );
      continue;
    }
  }

  return {
    price: '0',
    source: 'None',
    success: false,
    error: 'All price APIs failed',
  };
}

// Batch price fetching for multiple tokens
export async function fetchBatchPrices(
  tokenAddresses: PublicKey[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // Use Jupiter's batch API if available
  try {
    const addresses = tokenAddresses.map((addr) => addr.toBase58());
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${addresses.join(',')}`,
      {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (response.ok) {
      const data = await response.json();
      for (const address of addresses) {
        const price = data.data[address]?.price;
        results[address] = price || '0';
      }

      // Check if we got all prices
      const missingPrices = addresses.filter(
        (addr) => results[addr] === '0'
      );
      if (missingPrices.length === 0) {
        return results;
      }
    }
  } catch (error) {
    logger.warn('Jupiter batch API failed:', error);
  }

  // Fallback to individual fetching for missing prices
  const promises = tokenAddresses.map(async (tokenAddress) => {
    const address = tokenAddress.toBase58();
    if (results[address] === '0' || !results[address]) {
      results[address] = await fetchPrice(tokenAddress);
    }
  });

  await Promise.all(promises);
  return results;
}
