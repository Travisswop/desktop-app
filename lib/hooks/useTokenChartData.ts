import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { MarketService } from '@/services/market-service';

interface ChartDataPoint {
  timestamp: number;
  value: number;
}

interface ChartData {
  change: string;
  sparklineData: ChartDataPoint[];
}

type ChartDays = number | 'max';

/**
 * Map native tokens (no contract address) to CoinGecko IDs
 */
const NATIVE_TOKEN_MAP: Record<string, string> = {
  SOLANA: 'solana',
  ETHEREUM: 'ethereum',
  POLYGON: 'polygon-ecosystem-token',
  BASE: 'ethereum', // Base chain uses ETH as native token
  ARBITRUM: 'ethereum', // Arbitrum uses ETH as native token
  SEPOLIA: 'ethereum', // Testnet uses ETH
};

/**
 * Map period to days for the backend API
 */
function periodToDays(period: string): ChartDays {
  const periodMap: Record<string, ChartDays> = {
    '1D': 1,
    '1W': 7,
    '1M': 30,
    '1Y': 365,
    ALL: 'max',
  };
  return periodMap[period] || 1;
}

/**
 * Check if a token is a native token (no contract address)
 */
function isNativeToken(address: string | null): boolean {
  const normalized = address?.toLowerCase();
  return (
    !normalized ||
    normalized === 'null' ||
    normalized === 'native' ||
    normalized === '0x0' ||
    normalized === '0x0000000000000000000000000000000000000000'
  );
}

function looksLikeAddress(value: string): boolean {
  return (
    value.startsWith('0x') ||
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
  );
}

function looksLikeProviderSpecificMarketId(
  marketId: string,
  tokenAddress?: string | null
): boolean {
  const normalizedId = marketId.toLowerCase();
  const normalizedAddress = String(tokenAddress || '').toLowerCase();

  return (
    looksLikeAddress(marketId) ||
    normalizedId.includes(':') ||
    normalizedId.startsWith('jupiter') ||
    normalizedId.includes('://') ||
    normalizedId.includes('0x') ||
    (!!normalizedAddress && normalizedId.includes(normalizedAddress))
  );
}

function normalizeCoinGeckoMarketId(
  marketId?: string | null,
  tokenAddress?: string | null
): string | null {
  const normalized = String(marketId || '').trim();
  if (!normalized) return null;
  return looksLikeProviderSpecificMarketId(normalized, tokenAddress)
    ? null
    : normalized;
}

function hasUsablePrices(
  historical:
    | { prices?: Array<{ timestamp: number; price: number }> }
    | null
    | undefined
): historical is { prices: Array<{ timestamp: number; price: number }> } {
  const validPrices = historical?.prices?.filter(
    (point) =>
      Number.isFinite(Number(point.timestamp)) &&
      Number.isFinite(Number(point.price))
  );
  return Boolean(validPrices && validPrices.length >= 2);
}

/**
 * Fetch chart data from backend. Uses the unified chart-by-address endpoint
 * for contract tokens first, then falls back to a clean CoinGecko market id
 * when the address-based/free providers cannot return a usable history.
 */
async function fetchChartData(
  tokenAddress: string | null,
  chain: string,
  period: string,
  accessToken: string,
  marketId?: string | null
): Promise<ChartData> {
  const days = periodToDays(period);
  let prices: Array<{ timestamp: number; price: number }> = [];
  let chartLabel = `${chain}:${tokenAddress || 'native'}`;
  const normalizedMarketId = normalizeCoinGeckoMarketId(
    marketId,
    tokenAddress
  );
  const nativeTokenId = isNativeToken(tokenAddress)
    ? NATIVE_TOKEN_MAP[chain.toUpperCase()]
    : null;
  const coinGeckoTokenId = nativeTokenId || normalizedMarketId;
  let lastError: unknown = null;

  if (nativeTokenId) {
    chartLabel = nativeTokenId;
    const historical = await MarketService.getHistoricalPrices(
      nativeTokenId,
      days,
      accessToken
    );
    prices = historical.prices;
  } else if (isNativeToken(tokenAddress)) {
    if (!nativeTokenId) {
      throw new Error(`Native token mapping not found for chain: ${chain}`);
    }
  } else {
    if (tokenAddress) {
      try {
        const result = await MarketService.getChartByAddress(
          tokenAddress,
          chain.toLowerCase(),
          days,
          accessToken || ''
        );

        if (hasUsablePrices(result?.historical)) {
          prices = result.historical.prices;
          chartLabel = result.tokenId || chartLabel;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!hasUsablePrices({ prices }) && coinGeckoTokenId) {
      try {
        chartLabel = coinGeckoTokenId;
        const historical = await MarketService.getHistoricalPrices(
          coinGeckoTokenId,
          days,
          accessToken
        );
        if (hasUsablePrices(historical)) {
          prices = historical.prices;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!hasUsablePrices({ prices })) {
      throw new Error(
        lastError instanceof Error
          ? lastError.message
          : `Could not load chart for ${tokenAddress || marketId} on ${chain}`
      );
    }
  }

  const sparklineData: ChartDataPoint[] = prices
    .map((p) => ({
      timestamp: Number(p.timestamp),
      value: Number(p.price),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.timestamp) && Number.isFinite(point.value)
    );

  // Debug: Check for flat data (all same values)
  const uniqueValues = new Set(sparklineData.map((d) => d.value));
  if (uniqueValues.size === 1) {
    console.warn(
      `[useTokenChartData] Flat line detected for ${chartLabel} - all values are ${sparklineData[0]?.value}`
    );
  }

  // Step 4: Calculate price change percentage
  let change = '0';
  if (sparklineData.length >= 2) {
    const firstPrice = sparklineData[0].value;
    const lastPrice = sparklineData[sparklineData.length - 1].value;
    const changePercent =
      ((lastPrice - firstPrice) / firstPrice) * 100;
    change = changePercent.toFixed(2).toString();
  }

  return {
    change,
    sparklineData,
  };
}

/**
 * Hook to fetch token chart data for a specific period
 * Uses backend API for CoinGecko integration
 * Supports both native tokens (SOL, ETH, MATIC) and contract tokens
 */
export function useTokenChartData(
  tokenAddress: string | null,
  chain: string,
  period: string,
  enabled: boolean = true,
  accessToken: string,
  marketId?: string | null
): UseQueryResult<ChartData, unknown> {
  // Create a unique query key that works for both native and contract tokens
  const queryKey = marketId
    ? [
        'tokenChartData',
        'market',
        normalizeCoinGeckoMarketId(marketId, tokenAddress) || marketId,
        tokenAddress,
        chain,
        period,
      ]
    : isNativeToken(tokenAddress)
    ? ['tokenChartData', 'native', chain, period]
    : ['tokenChartData', tokenAddress, chain, period];

  return useQuery({
    queryKey,
    queryFn: () =>
      fetchChartData(tokenAddress, chain, period, accessToken, marketId),
    enabled: enabled && !!chain && !!period, // Only require chain and period, address can be null for native
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
