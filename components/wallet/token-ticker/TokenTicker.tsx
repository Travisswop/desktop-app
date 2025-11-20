'use client';

import { useEffect, useState } from 'react';
import TokenCard from './TokenCard';
import {
  TokenAPIService,
  processSparklineData,
} from '@/services/token-service';
import { MarketData } from '@/types/token';
import { Loader2 } from 'lucide-react';
import { fetchPrice } from '@/components/wallet/tools/fetch_price';
import { PublicKey } from '@solana/web3.js';
import styles from './TokenTicker.module.css';

interface TokenInfo {
  symbol: string;
  name: string;
  logoUrl: string;
  uuid?: string;
  address?: string;
}

const TOKENS: TokenInfo[] = [
  {
    symbol: 'SWOP',
    name: 'Swop',
    logoUrl: '/assets/crypto-icons/SWOP.png',
    address: 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    logoUrl: '/assets/crypto-icons/SOL.png',
    uuid: 'zNZHO_Sjf',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logoUrl: '/assets/crypto-icons/ETH.png',
    uuid: 'razxDUgYGNAdQ',
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    logoUrl: '/assets/crypto-icons/BTC.png',
    uuid: 'Qwsogvtv82FCd',
  },
  {
    symbol: 'XRP',
    name: 'XRP',
    logoUrl: '/assets/crypto-icons/XRP.png',
    uuid: '-l8Mn2pVlRs-p',
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    logoUrl: '/assets/crypto-icons/BNB.png',
    uuid: 'WcwrkfNI4FUAe',
  },
];

interface TokenData {
  symbol: string;
  name: string;
  logoUrl: string;
  marketData: MarketData | null;
  sparklineData: number[];
}

export default function TokenTicker() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const tokenDataPromises = TOKENS.map(async (token) => {
          try {
            // For SWOP token, fetch price from Solana using the same method as token-service
            if (token.symbol === 'SWOP' && token.address) {
              try {
                const swopPrice = await fetchPrice(
                  new PublicKey(token.address)
                );

                return {
                  symbol: token.symbol,
                  name: token.name,
                  logoUrl: token.logoUrl,
                  marketData: {
                    price: swopPrice,
                    uuid: 'swop',
                    symbol: 'SWOP',
                    name: 'Swop',
                    color: '#000000',
                    marketCap: '0',
                    '24hVolume': '0',
                    iconUrl: token.logoUrl,
                    listedAt: 0,
                    tier: 0,
                    change: '0',
                    rank: 0,
                    sparkline: [],
                    lowVolume: false,
                    coinrankingUrl: '',
                    btcPrice: '0',
                    contractAddresses: [],
                  },
                  sparklineData: [],
                };
              } catch (error) {
                console.error('Error fetching SWOP price:', error);
                // Fallback to 0 price if fetch fails
                return {
                  symbol: token.symbol,
                  name: token.name,
                  logoUrl: token.logoUrl,
                  marketData: {
                    price: '0',
                    uuid: 'swop',
                    symbol: 'SWOP',
                    name: 'Swop',
                    color: '#000000',
                    marketCap: '0',
                    '24hVolume': '0',
                    iconUrl: token.logoUrl,
                    listedAt: 0,
                    tier: 0,
                    change: '0',
                    rank: 0,
                    sparkline: [],
                    lowVolume: false,
                    coinrankingUrl: '',
                    btcPrice: '0',
                    contractAddresses: [],
                  },
                  sparklineData: [],
                };
              }
            }

            const marketData = await TokenAPIService.getMarketData({
              uuid: token.uuid,
              address: token.address,
            });

            console.log('marketData', marketData);

            let sparklineData: number[] = [];
            if (marketData?.uuid) {
              const timeSeriesData =
                await TokenAPIService.getTimeSeriesData(
                  marketData.uuid,
                  '24h'
                );
              const processed = processSparklineData(timeSeriesData);
              sparklineData = processed.map(
                (point: any) => point.value
              );
            }

            return {
              symbol: token.symbol,
              name: token.name,
              logoUrl: token.logoUrl,
              marketData,
              sparklineData,
            };
          } catch (error) {
            console.error(
              `Error fetching data for ${token.symbol}:`,
              error
            );
            return {
              symbol: token.symbol,
              name: token.name,
              logoUrl: token.logoUrl,
              marketData: null,
              sparklineData: [],
            };
          }
        });

        const results = await Promise.all(tokenDataPromises);
        setTokens(results);
      } catch (error) {
        console.error('Error fetching token data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchTokenData, 30000);
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
          <TokenCard
            key={`token-1-${index}`}
            symbol={token.symbol}
            name={token.name}
            logoUrl={token.logoUrl}
            marketData={token.marketData}
            sparklineData={token.sparklineData}
          />
        ))}
        {/* Duplicate set for seamless loop */}
        {tokens.map((token, index) => (
          <TokenCard
            key={`token-2-${index}`}
            symbol={token.symbol}
            name={token.name}
            logoUrl={token.logoUrl}
            marketData={token.marketData}
            sparklineData={token.sparklineData}
          />
        ))}
        {/* Third set for smoother looping */}
        {tokens.map((token, index) => (
          <TokenCard
            key={`token-3-${index}`}
            symbol={token.symbol}
            name={token.name}
            logoUrl={token.logoUrl}
            marketData={token.marketData}
            sparklineData={token.sparklineData}
          />
        ))}
      </div>
    </div>
  );
}
