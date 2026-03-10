'use client';

import { useQuery } from '@tanstack/react-query';
import TokenCard, { TickerToken } from './TokenCard';
import { MarketService } from '@/services/market-service';
import { Loader2 } from 'lucide-react';
import styles from './TokenTicker.module.css';
import { useUser } from '@/lib/UserContext';

const COIN_IDS = [
  'swop-2',
  'solana',
  'ethereum',
  'bitcoin',
  'ripple',
  'binancecoin',
];

const fetchTokenTickerData = async (
  accessToken: string
): Promise<TickerToken[]> => {
  const { successful } = await MarketService.getBatchMarketData(
    COIN_IDS,
    accessToken || ''
  );

  const tokens = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (successful as any[]).map(async (token) => {
      try {
        const history = await MarketService.getHistoricalPrices(
          token.id,
          1,
          accessToken || ''
        );

        return {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          image: token.image ?? token.large ?? token.thumb,
          currentPrice: token.currentPrice ?? token.current_price ?? token.price,
          priceChangePercentage24h:
            token.priceChangePercentage24h ??
            token.price_change_percentage_24h ??
            token.priceChange24h,
          sparklineData: history?.prices?.map(
            (point: { price: number }) => point.price
          ),
        } as TickerToken;
      } catch {
        return {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          image: token.image ?? token.large ?? token.thumb,
          currentPrice: token.currentPrice ?? token.current_price ?? token.price,
          priceChangePercentage24h:
            token.priceChangePercentage24h ??
            token.price_change_percentage_24h ??
            token.priceChange24h,
        } as TickerToken;
      }
    })
  );

  return tokens;
};

export default function TokenTicker() {
  const { accessToken } = useUser();

  const { data: tokens = [], isLoading: loading } = useQuery({
    queryKey: ['tokenTicker'],
    queryFn: () => fetchTokenTickerData(accessToken || ''),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 bg-white rounded-xl">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={styles.tickerContainer}>
      <div className={styles.tickerTrack}>
        {tokens.map((token, index) => (
          <TokenCard key={`t1-${index}`} token={token} />
        ))}
        {tokens.map((token, index) => (
          <TokenCard key={`t2-${index}`} token={token} />
        ))}
        {tokens.map((token, index) => (
          <TokenCard key={`t3-${index}`} token={token} />
        ))}
      </div>
    </div>
  );
}
