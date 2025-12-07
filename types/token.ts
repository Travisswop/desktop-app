export type ChainType =
  | 'ETHEREUM'
  | 'POLYGON'
  | 'BASE'
  | 'SOLANA'
  | 'SEPOLIA';
export type EVMChain = Exclude<ChainType, 'SOLANA'>;

export interface MarketData {
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChangePercentage24h: number;
  sparklineData?: number[];
  // Additional properties for token details view
  price?: string; // Current price as string
  change?: string; // Price change percentage
  color?: string; // Color for chart styling
  uuid?: string; // Legacy CoinRanking ID (optional)
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
  value?: number; // Total value in USD (balance × price), calculated by backend
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
