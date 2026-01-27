'use client';

import { useQuery } from '@tanstack/react-query';
import TokenCard from './TokenCard';
import { MarketService } from '@/services/market-service';
import { MarketData } from '@/types/token';
import { Loader2 } from 'lucide-react';
import styles from './TokenTicker.module.css';
import { useUser } from '@/lib/UserContext';

const CHAIN_TO_COIN_GECKO_ID = [
  'swop-2',
  'solana',
  'ethereum',
  'bitcoin',
  'ripple',
  'binancecoin',
];

const fetchTokenTickerData = async (accessToken: string): Promise<MarketData[]> => {
  const { successful } = await MarketService.getBatchMarketData(
    CHAIN_TO_COIN_GECKO_ID as string[],
    accessToken || ''
  );

  const tokensWithSparkline = await Promise.all(
    successful.map(async (token) => {
      try {
        const history = await MarketService.getHistoricalPrices(
          token.id,
          1,
          accessToken || ''
        );

        return {
          ...token,
          sparklineData: history?.prices?.map(
            (point: { price: number }) => point.price
          ),
        } as unknown as MarketData;
      } catch (error) {
        console.error(
          `Error fetching 1H historical data for token ${token.id}:`,
          error
        );
        return token as unknown as MarketData;
      }
    })
  );

  return tokensWithSparkline as unknown as MarketData[];
};

export default function TokenTicker() {
  const { accessToken } = useUser();

  const { data: tokens = [], isLoading: loading } = useQuery({
    queryKey: ['tokenTicker'],
    queryFn: () => fetchTokenTickerData(accessToken || ''),
    staleTime: 60 * 1000, // Data stays fresh for 60 seconds
    gcTime: 5 * 60 * 1000, // Cache persists for 5 minutes
    refetchInterval: 60 * 1000, // Refresh every 60 seconds
    refetchOnWindowFocus: false,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 bg-gray-50 rounded-xl">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={styles.tickerContainer}>
      <div className={styles.tickerTrack}>
        {/* First set of tokens */}
        {tokens.map((token, index) => (
          <TokenCard key={`token-1-${index}`} token={token} />
        ))}
        {/* Duplicate set for seamless loop */}
        {tokens.map((token, index) => (
          <TokenCard key={`token-2-${index}`} token={token} />
        ))}
        {/* Third set for smoother looping */}
        {tokens.map((token, index) => (
          <TokenCard key={`token-3-${index}`} token={token} />
        ))}
      </div>
    </div>
  );
}
