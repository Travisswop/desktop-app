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
  return (
    !address ||
    address === 'null' ||
    address === '0x0' ||
    address === '0x0000000000000000000000000000000000000000'
  );
}

/**
 * Fetch chart data from backend CoinGecko API
 */
async function fetchChartData(
  tokenAddress: string | null,
  chain: string,
  period: string,
  accessToken: string
): Promise<ChartData> {
  // Step 1: Determine token ID
  let tokenId: string | null = null;

  // Check if it's a native token (no contract address)
  if (isNativeToken(tokenAddress)) {
    // For native tokens, map directly to CoinGecko ID
    const chainUpper = chain.toUpperCase();
    tokenId = NATIVE_TOKEN_MAP[chainUpper];

    if (!tokenId) {
      throw new Error(
        `Native token mapping not found for chain: ${chain}`
      );
    }
  } else {
    // For contract tokens, resolve address to CoinGecko ID via backend

    tokenId = await MarketService.resolveTokenAddress(
      tokenAddress || '',
      chain.toLowerCase(),
      accessToken || '' // If accessToken is undefined, use an empty string
    );

    if (!tokenId) {
      throw new Error(
        `Could not resolve token address ${tokenAddress} on ${chain}`
      );
    }

  }

  // Step 2: Fetch historical data for the period
  const days = periodToDays(period);
  const historicalData = await MarketService.getHistoricalPrices(
    tokenId,
    days,
    accessToken
  );

  // Step 3: Transform data to chart format
  // Note: CoinGecko returns timestamps in milliseconds
  const sparklineData: ChartDataPoint[] = historicalData.prices.map(
    (pricePoint) => ({
      timestamp: pricePoint.timestamp, // Keep in milliseconds for proper chart rendering
      value: pricePoint.price,
    })
  );

  // Debug: Check for flat data (all same values)
  const uniqueValues = new Set(sparklineData.map((d) => d.value));
  if (uniqueValues.size === 1) {
    console.warn(
      `[useTokenChartData] Flat line detected for ${tokenId} - all values are ${sparklineData[0]?.value}`
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
  accessToken: string
): UseQueryResult<ChartData, unknown> {
  // Create a unique query key that works for both native and contract tokens
  const queryKey = isNativeToken(tokenAddress)
    ? ['tokenChartData', 'native', chain, period]
    : ['tokenChartData', tokenAddress, chain, period];

  return useQuery({
    queryKey,
    queryFn: () =>
      fetchChartData(tokenAddress, chain, period, accessToken),
    enabled: enabled && !!chain && !!period, // Only require chain and period, address can be null for native
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
