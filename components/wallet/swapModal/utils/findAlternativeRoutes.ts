import logger from '@/utils/logger';

/**
 * Alternative route finding strategies when Jupiter routing fails
 */
export interface RouteStrategy {
  name: string;
  description: string;
  params: Record<string, any>;
}

/**
 * Strategies to try when Jupiter routing fails due to insufficient liquidity
 */
export const ROUTE_STRATEGIES: RouteStrategy[] = [
  {
    name: 'Direct Routes Only',
    description:
      'Try single-hop routes only (no intermediate tokens)',
    params: {
      onlyDirectRoutes: true,
      restrictIntermediateTokens: false,
    },
  },
  {
    name: 'Restrict Intermediate Tokens',
    description: 'Use only high-liquidity intermediate tokens',
    params: {
      onlyDirectRoutes: false,
      restrictIntermediateTokens: true,
    },
  },
  {
    name: 'Direct + Restricted',
    description: 'Single-hop routes with high-liquidity tokens only',
    params: {
      onlyDirectRoutes: true,
      restrictIntermediateTokens: true,
    },
  },
  {
    name: 'Major DEXes Only',
    description: 'Use only major DEXes (Raydium, Orca, Meteora)',
    params: {
      onlyDirectRoutes: false,
      restrictIntermediateTokens: true,
      dexes: 'Raydium,Orca,Meteora',
    },
  },
];

/**
 * Tries to find an alternative route using different Jupiter parameters
 * @param inputMint Input token mint address
 * @param outputMint Output token mint address
 * @param amount Amount to swap (in smallest unit)
 * @param slippageBps Slippage in basis points
 * @param platformFeeBps Platform fee in basis points
 * @param strategies Strategies to try (defaults to all)
 * @returns Quote response if successful, null otherwise
 */
export async function findAlternativeRoute(
  inputMint: string,
  outputMint: string,
  amount: string | number,
  slippageBps: number = 200,
  platformFeeBps: number = 100,
  strategies: RouteStrategy[] = ROUTE_STRATEGIES
): Promise<any | null> {
  const baseUrl = 'https://quote-api.jup.ag/v6/quote';

  for (const strategy of strategies) {
    try {
      logger.log(`Trying route strategy: ${strategy.name}`);
      logger.log(`Strategy description: ${strategy.description}`);

      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        platformFeeBps: platformFeeBps.toString(),
        ...Object.fromEntries(
          Object.entries(strategy.params).map(([key, value]) => [
            key,
            value.toString(),
          ])
        ),
      });

      const url = `${baseUrl}?${params.toString()}`;
      logger.log(`Fetching quote with URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.log(
          `Strategy "${strategy.name}" failed: ${response.status} - ${errorText}`
        );
        continue;
      }

      const quote = await response.json();

      // Check if quote has valid route
      if (quote && quote.routePlan && quote.routePlan.length > 0) {
        logger.log(
          `✅ Successfully found route using strategy: ${strategy.name}`
        );
        logger.log(
          `Route details:`,
          JSON.stringify(quote.routePlan, null, 2)
        );
        return quote;
      }

      logger.log(`Strategy "${strategy.name}" returned empty route`);
    } catch (error) {
      logger.error(
        `Error trying strategy "${strategy.name}":`,
        error
      );
      continue;
    }
  }

  logger.log('❌ All route strategies failed');
  return null;
}

/**
 * Tries to find a route with reduced amount
 * @param inputMint Input token mint address
 * @param outputMint Output token mint address
 * @param originalAmount Original amount to swap
 * @param slippageBps Slippage in basis points
 * @param platformFeeBps Platform fee in basis points
 * @param reductionPercent Percentage to reduce by (default 50%)
 * @returns Quote response if successful, null otherwise
 */
export async function findRouteWithReducedAmount(
  inputMint: string,
  outputMint: string,
  originalAmount: string | number,
  slippageBps: number = 200,
  platformFeeBps: number = 100,
  reductionPercent: number = 50
): Promise<{ quote: any; reducedAmount: number } | null> {
  const originalAmountNum =
    typeof originalAmount === 'string'
      ? parseFloat(originalAmount)
      : originalAmount;
  const reducedAmount = Math.floor(
    (originalAmountNum * (100 - reductionPercent)) / 100
  );

  logger.log(
    `Trying reduced amount: ${reducedAmount} (${reductionPercent}% reduction)`
  );

  const quote = await findAlternativeRoute(
    inputMint,
    outputMint,
    reducedAmount,
    slippageBps,
    platformFeeBps,
    ROUTE_STRATEGIES.slice(0, 2) // Try first 2 strategies with reduced amount
  );

  if (quote) {
    return { quote, reducedAmount };
  }

  return null;
}

/**
 * Gets available DEXes from Jupiter API
 * @returns Array of available DEX labels
 */
export async function getAvailableDexes(): Promise<string[]> {
  try {
    const response = await fetch(
      'https://public.jupiterapi.com/program-id-to-label'
    );
    if (!response.ok) {
      logger.error('Failed to fetch available DEXes');
      return [];
    }

    const data = await response.json();
    // Extract unique DEX labels
    const dexes = new Set<string>();
    if (data && typeof data === 'object') {
      Object.values(data).forEach((label: any) => {
        if (typeof label === 'string' && label) {
          dexes.add(label);
        }
      });
    }

    return Array.from(dexes);
  } catch (error) {
    logger.error('Error fetching available DEXes:', error);
    return [];
  }
}

/**
 * Checks if a specific DEX has liquidity for a token pair
 * @param inputMint Input token mint address
 * @param outputMint Output token mint address
 * @param amount Amount to swap
 * @param dexName Name of the DEX to check (e.g., 'Raydium', 'Orca')
 * @param slippageBps Slippage in basis points
 * @returns Quote response if DEX has liquidity, null otherwise
 */
export async function checkDexLiquidity(
  inputMint: string,
  outputMint: string,
  amount: string | number,
  dexName: string,
  slippageBps: number = 200
): Promise<any | null> {
  try {
    const baseUrl = 'https://quote-api.jup.ag/v6/quote';
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      dexes: dexName,
      onlyDirectRoutes: 'true',
    });

    const url = `${baseUrl}?${params.toString()}`;
    logger.log(`Checking ${dexName} liquidity: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const quote = await response.json();

    if (quote && quote.routePlan && quote.routePlan.length > 0) {
      logger.log(`✅ ${dexName} has liquidity for this pair`);
      return quote;
    }

    return null;
  } catch (error) {
    logger.error(`Error checking ${dexName} liquidity:`, error);
    return null;
  }
}

/**
 * Finds all DEXes that have sufficient liquidity for a token pair
 * @param inputMint Input token mint address
 * @param outputMint Output token mint address
 * @param amount Amount to swap
 * @param slippageBps Slippage in basis points
 * @returns Array of DEX names that have liquidity
 */
export async function findDexesWithLiquidity(
  inputMint: string,
  outputMint: string,
  amount: string | number,
  slippageBps: number = 200
): Promise<string[]> {
  const majorDexes = [
    'Raydium',
    'Orca',
    'Meteora',
    'Lifinity V2',
    'Raydium CLMM',
    'Phoenix',
    'Meteora DLMM',
  ];

  logger.log(
    `Checking liquidity across ${majorDexes.length} major DEXes...`
  );

  const dexesWithLiquidity: string[] = [];

  // Check each DEX in parallel
  const checks = majorDexes.map(async (dexName) => {
    const quote = await checkDexLiquidity(
      inputMint,
      outputMint,
      amount,
      dexName,
      slippageBps
    );
    if (quote) {
      return dexName;
    }
    return null;
  });

  const results = await Promise.all(checks);
  results.forEach((dexName) => {
    if (dexName) {
      dexesWithLiquidity.push(dexName);
    }
  });

  logger.log(
    `Found ${dexesWithLiquidity.length} DEXes with liquidity:`,
    dexesWithLiquidity
  );

  return dexesWithLiquidity;
}
