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

/**
 * Map native tokens (no contract address) to CoinGecko IDs
 */
const NATIVE_TOKEN_MAP: Record<string, string> = {
  SOLANA: 'solana',
  ETHEREUM: 'ethereum',
  POLYGON: 'matic-network',
  BASE: 'ethereum', // Base chain uses ETH as native token
  ARBITRUM: 'ethereum', // Arbitrum uses ETH as native token
  SEPOLIA: 'ethereum', // Testnet uses ETH
};

/**
 * Map period to days for the backend API
 */
function periodToDays(period: string): number {
  const periodMap: Record<string, number> = {
    '1D': 1,
    '1W': 7,
    '1M': 30,
    '1Y': 365,
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

/**
 * Fetch chart data from backend. Uses the unified chart-by-address endpoint
 * for contract tokens so the backend can transparently fall back to Jupiter
 * + GeckoTerminal when a Solana token isn't listed on CoinGecko.
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

  if (marketId) {
    chartLabel = marketId;
    const historical = await MarketService.getHistoricalPrices(
      marketId,
      days,
      accessToken
    );
    prices = historical.prices;
  } else if (isNativeToken(tokenAddress)) {
    const tokenId = NATIVE_TOKEN_MAP[chain.toUpperCase()];
    if (!tokenId) {
      throw new Error(`Native token mapping not found for chain: ${chain}`);
    }
    chartLabel = tokenId;
    const historical = await MarketService.getHistoricalPrices(
      tokenId,
      days,
      accessToken
    );
    prices = historical.prices;
  } else {
    const result = await MarketService.getChartByAddress(
      tokenAddress || '',
      chain.toLowerCase(),
      days,
      accessToken || ''
    );

    if (!result || !result.historical) {
      throw new Error(
        `Could not load chart for ${tokenAddress} on ${chain}`
      );
    }
    prices = result.historical.prices;
  }

  const sparklineData: ChartDataPoint[] = prices.map((p) => ({
    timestamp: p.timestamp,
    value: p.price,
  }));

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
    ? ['tokenChartData', 'market', marketId, period]
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
