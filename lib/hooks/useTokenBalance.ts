'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

const RATE_LIMIT_DELAY = 1000; // 1000ms between requests
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface MarketData {
  timestamp: number;
  value: number;
}

interface TimeSeriesData {
  '1H': MarketData[];
  '1D': MarketData[];
  '1W': MarketData[];
  '1M': MarketData[];
  '1Y': MarketData[];
}

interface TokenOverview {
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number;
}

export interface TokenData {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  chainId?: number;
  address: string;
  logoURI: string;
  price: number;
  value?: number;
  chain: 'evm' | 'solana';
  color?: string;
  marketData: TimeSeriesData;
  overview: TokenOverview;
  coingeckoId: string;
}

// Cache for token data
const tokenCache = new Map<string, TokenData>();
const lastFetchTime = new Map<string, number>();
const marketDataCache = new Map<
  string,
  { data: any; timestamp: number }
>();

// Helper function to get CoinGecko ID for a token
async function getCoinGeckoId(
  tokenAddress: string,
  chain: 'evm' | 'solana'
): Promise<string | null> {
  try {
    const platform = chain === 'evm' ? 'ethereum' : 'solana';
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/token_price/${platform}?contract_addresses=${tokenAddress}&vs_currencies=usd`
    );
    const data = await response.json();
    return Object.keys(data)[0] || null;
  } catch (error) {
    console.error('Error fetching CoinGecko ID:', error);
    return null;
  }
}

// Fetch market data fro CoinGecko
async function fetchCoinGeckoMarketData(coingeckoId: string) {
  const cacheKey = `market-${coingeckoId}`;
  const cachedData = marketDataCache.get(cacheKey);

  if (
    cachedData &&
    Date.now() - cachedData.timestamp < CACHE_DURATION
  ) {
    return cachedData.data;
  }

  try {
    // Fetch current price and overview data
    const overviewResponse = await fetch(
      `${COINGECKO_API_BASE}/coins/${coingeckoId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
    const overviewData = await overviewResponse.json();

    // Fetch historical data for different time periods
    const [
      hourlyData,
      dailyData,
      weeklyData,
      monthlyData,
      yearlyData,
    ] = await Promise.all([
      fetch(
        `${COINGECKO_API_BASE}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=1&interval=minute`
      ),
      fetch(
        `${COINGECKO_API_BASE}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=1`
      ),
      fetch(
        `${COINGECKO_API_BASE}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=7`
      ),
      fetch(
        `${COINGECKO_API_BASE}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=30`
      ),
      fetch(
        `${COINGECKO_API_BASE}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=365`
      ),
    ]).then((responses) =>
      Promise.all(responses.map((r) => r.json()))
    );

    const marketData = {
      overview: {
        currentPrice: overviewData.market_data.current_price.usd,
        priceChange24h: overviewData.market_data.price_change_24h,
        priceChangePercentage24h:
          overviewData.market_data.price_change_percentage_24h,
        marketCap: overviewData.market_data.market_cap.usd,
        totalVolume: overviewData.market_data.total_volume.usd,
        circulatingSupply:
          overviewData.market_data.circulating_supply,
        totalSupply: overviewData.market_data.total_supply,
      },
      marketData: {
        '1H': hourlyData.prices
          .slice(-60)
          .map(([timestamp, price]: [number, number]) => ({
            timestamp,
            price,
          })),
        '1D': dailyData.prices.map(
          ([timestamp, price]: [number, number]) => ({
            timestamp,
            price,
          })
        ),
        '1W': weeklyData.prices.map(
          ([timestamp, price]: [number, number]) => ({
            timestamp,
            price,
          })
        ),
        '1M': monthlyData.prices.map(
          ([timestamp, price]: [number, number]) => ({
            timestamp,
            price,
          })
        ),
        '1Y': yearlyData.prices.map(
          ([timestamp, price]: [number, number]) => ({
            timestamp,
            price,
          })
        ),
      },
    };

    marketDataCache.set(cacheKey, {
      data: marketData,
      timestamp: Date.now(),
    });
    return marketData;
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
}
// Helper function to generate fake market data for demonstration
const generateMarketData = (period: string): MarketData[] => {
  const now = Date.now();
  const dataPoints = {
    '1H': 60, // 1 point per minute
    '1D': 24, // 1 point per hour
    '1W': 7, // 1 point per day
    '1M': 30, // 1 point per day
    '1Y': 365, // 1 point per day
  };

  const points = dataPoints[period as keyof typeof dataPoints];
  const interval = {
    '1H': 60 * 1000, // 1 minute
    '1D': 60 * 60 * 1000, // 1 hour
    '1W': 24 * 60 * 60 * 1000, // 1 day
    '1M': 24 * 60 * 60 * 1000, // 1 day
    '1Y': 24 * 60 * 60 * 1000, // 1 day
  };

  return Array.from({ length: points }, (_, i) => ({
    timestamp:
      now - (points - i) * interval[period as keyof typeof interval],
    value: 2 + Math.sin(i / (points / (2 * Math.PI))) * 0.2,
  }));
};

// Generate overview data for a token
const generateOverviewData = (basePrice: number) => ({
  currentPrice: basePrice,
  priceChange24h: basePrice * 0.05 * (Math.random() > 0.5 ? 1 : -1),
  priceChangePercentage24h: 5 * (Math.random() > 0.5 ? 1 : -1),
  marketCap: basePrice * 1000000000,
  totalVolume: basePrice * 100000000,
  circulatingSupply: 1000000000,
  totalSupply: 1000000000,
});

const fetchTokenWithRetry = async (
  contract: ethers.Contract,
  walletAddress: string,
  tokenAddress: string,
  retries = 3
): Promise<TokenData | null> => {
  const cacheKey = `${walletAddress}-${tokenAddress}`;

  try {
    if (
      tokenCache.has(cacheKey) &&
      Date.now() - (lastFetchTime.get(cacheKey) || 0) < CACHE_DURATION
    ) {
      return tokenCache.get(cacheKey)!;
    }

    if (retries < 3) {
      await new Promise((resolve) =>
        setTimeout(resolve, RATE_LIMIT_DELAY * (3 - retries))
      );
    }

    const [balance, decimals, symbol, name] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.decimals(),
      contract.symbol(),
      contract.name(),
    ]);

    // Get CoinGecko ID for the token
    const coingeckoId = await getCoinGeckoId(tokenAddress, 'evm');
    let marketData = null;

    if (coingeckoId) {
      marketData = await fetchCoinGeckoMarketData(coingeckoId);
    }

    const tokenData: TokenData = {
      symbol,
      name,
      balance: ethers.utils.formatUnits(balance, decimals),
      decimals,
      address: tokenAddress,
      chain: 'evm',
      color: '#00BCD4',
      price: marketData?.overview.currentPrice || 0,
      logoURI: `/assets/crypto-icons/${symbol}.png?height=32&width=32`,
      coingeckoId: coingeckoId || '',
      marketData: marketData?.marketData || {
        '1H': [],
        '1D': [],
        '1W': [],
        '1M': [],
        '1Y': [],
      },
      overview: marketData?.overview || {
        currentPrice: 0,
        priceChange24h: 0,
        priceChangePercentage24h: 0,
        marketCap: 0,
        totalVolume: 0,
        circulatingSupply: 0,
        totalSupply: 0,
      },
    };

    tokenCache.set(cacheKey, tokenData);
    lastFetchTime.set(cacheKey, Date.now());

    return tokenData;
  } catch (err) {
    if (retries > 0) {
      return fetchTokenWithRetry(
        contract,
        walletAddress,
        tokenAddress,
        retries - 1
      );
    }
    console.error(`Failed to fetch token ${tokenAddress}:`, err);
    return null;
  }
};

export const useTokenBalance = (
  walletAddress: string | undefined,
  isEVM: boolean,
  provider?: ethers.providers.JsonRpcProvider
) => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!walletAddress || fetchingRef.current) return;

    const fetchTokens = async () => {
      if (!isMounted.current) return;
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        if (isEVM && provider) {
          const tokenAddresses = await fetchTokenAddresses(
            walletAddress
          );
          const tokenPromises = tokenAddresses.map(
            async (address: string) => {
              const contract = new ethers.Contract(
                address,
                ERC20_ABI,
                provider
              );
              return fetchTokenWithRetry(
                contract,
                walletAddress,
                address
              );
            }
          );

          const results = await Promise.all(tokenPromises);
          const validTokens = results.filter(
            (t): t is TokenData => t !== null
          );
          console.log('🚀 ~ validTokens ~ results:', validTokens);
          setTokens(validTokens);
          setLoading(false);
        } else {
          // Solana tokens fetch logic
          const connection = new Connection(
            'https://api.mainnet-beta.solana.com'
          );
          const pubKey = new PublicKey(walletAddress);
          const balance = await connection.getBalance(pubKey);
          const solanaMarketData = await fetchCoinGeckoMarketData(
            'solana'
          );
          if (isMounted.current) {
            setTokens([
              {
                symbol: 'SOL',
                name: 'Solana',
                balance: (balance / 1e9).toString(),
                decimals: 9,
                address: 'SOL',
                chain: 'solana',
                price: solanaMarketData?.overview.currentPrice || 0,
                logoURI:
                  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
                coingeckoId: 'solana',
                marketData: solanaMarketData?.marketData || {
                  '1H': [],
                  '1D': [],
                  '1W': [],
                  '1M': [],
                  '1Y': [],
                },
                overview: solanaMarketData?.overview || {
                  currentPrice: 0,
                  priceChange24h: 0,
                  priceChangePercentage24h: 0,
                  marketCap: 0,
                  totalVolume: 0,
                  circulatingSupply: 0,
                  totalSupply: 0,
                },
              },
            ]);
          }
        }
      } catch (err) {
        if (isMounted.current) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to fetch tokens')
          );
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    };

    fetchTokens();

    return () => {
      isMounted.current = false;
    };
  }, [walletAddress, isEVM, provider]);

  return { tokens, loading, error };
};

const fetchTokenAddresses = async (walletAddress: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL || '';
  const data = JSON.stringify({
    jsonrpc: '2.0',
    method: 'alchemy_getTokenBalances',
    headers: {
      'Content-Type': 'application/json',
    },
    params: [`${walletAddress}`],
    id: 42,
  });

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data,
  };

  try {
    const response = await fetch(apiUrl, options);
    if (!response.ok) {
      console.error('Backend API error:', await response.json());
      return [];
    }

    const { result } = await response.json();
    return (
      result.tokenBalances?.map(
        (token: { contractAddress: string }) => token.contractAddress
      ) || []
    );
  } catch (error) {
    console.error('Error fetching token addresses:', error);
    return [];
  }
};
