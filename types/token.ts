export type ChainType = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA' | 'SEPOLIA';
export type EVMChain = Exclude<ChainType, 'SOLANA'>;

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

export interface  TokenData {
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  chainId?: number;
  address: string | null;
  logoURI: string;
  chain: 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';
  marketData: MarketData;
  sparklineData: Array<{ timestamp: number; value: number }>;
  timeSeriesData: {
    '1H': Array<{ timestamp: number; value: number }>;
    '1D': Array<{ timestamp: number; value: number }>;
    '1W': Array<{ timestamp: number; value: number }>;
    '1M': Array<{ timestamp: number; value: number }>;
    '1Y': Array<{ timestamp: number; value: number }>;
  };
  isNative?: boolean;
  nativeTokenPrice?: number;
}

export interface SolanaTokenData {
  data: {
    parsed: {
      info: {
        mint: string;
        tokenAmount: {
          amount: string;
          decimals: number;
          uiAmount: number;
          uiAmountString: string;
        };
      };
    };
  };
}

export interface TimeSeriesDataPoint {
  price: string | null;
  timestamp: number;
}

export interface TokenMetadata {
  chain: ChainType;
  address: string | null;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  marketData: MarketData;
  sparklineData: Array<{ timestamp: number; value: number }>;
}
