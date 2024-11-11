export interface MarketData {
  uuid: string;
  symbol: string;
  name: string;
  color: string;
  iconUrl: string;
  marketCap: string;
  price: string;
  listedAt: number;
  tier: number;
  change: string;
  rank: number;
  sparkline: Array<{ timestamp: number; value: number }>;
  lowVolume: boolean;
  coinrankingUrl: string;
  '24hVolume': string;
  btcPrice: string;
  contractAddresses: string[];
}

export interface TimeSeriesData {
  '1H': Array<{ timestamp: number; value: number }>;
  '1D': Array<{ timestamp: number; value: number }>;
  '1W': Array<{ timestamp: number; value: number }>;
  '1M': Array<{ timestamp: number; value: number }>;
  '1Y': Array<{ timestamp: number; value: number }>;
}

export interface TokenData {
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  chainId?: number;
  address: string;
  logoURI: string;
  chain: 'evm' | 'solana';
  marketData: MarketData;
  timeSeriesData: {
    '1H': Array<{ timestamp: number; value: number }>;
    '1D': Array<{ timestamp: number; value: number }>;
    '1W': Array<{ timestamp: number; value: number }>;
    '1M': Array<{ timestamp: number; value: number }>;
    '1Y': Array<{ timestamp: number; value: number }>;
  };
}
