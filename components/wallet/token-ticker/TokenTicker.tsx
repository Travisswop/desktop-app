'use client';

import { useEffect, useState } from 'react';
import TokenCard from './TokenCard';
import { MarketService } from '@/services/market-service';
import { MarketData } from '@/types/token';
import { Loader2 } from 'lucide-react';
import styles from './TokenTicker.module.css';

const CHAIN_TO_COIN_GECKO_ID = [
  'solana',
  'ethereum',
  'bitcoin',
  'ripple',
  'binancecoin',
];

export default function TokenTicker() {
  const [tokens, setTokens] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const { successful } = await MarketService.getBatchMarketData(
          CHAIN_TO_COIN_GECKO_ID as string[]
        );

        const tokensWithSparkline = await Promise.all(
          successful.map(async (token) => {
            try {
              const history = await MarketService.getHistoricalPrices(
                token.id,
                1
              );

              return {
                ...token,
                sparklineData: history?.prices?.map(
                  (point: { price: number }) => point.price
                ),
              } as MarketData;
            } catch (error) {
              console.error(
                `Error fetching 1H historical data for token ${token.id}:`,
                error
              );
              return token as MarketData;
            }
          })
        );

        setTokens(tokensWithSparkline as MarketData[]);
      } catch (error) {
        console.error('Error fetching token data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
    // Refresh data every 60 seconds
    const interval = setInterval(fetchTokenData, 60000);
    return () => clearInterval(interval);
  }, []);

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
