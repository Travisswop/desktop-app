/**
 * Market Data Service
 *
 * This service interfaces with the backend CoinGecko API integration
 * to fetch real-time token prices, market data, and historical charts.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const MARKET_API_URL = `${API_BASE_URL}/api/v5/market`;

interface TokenPrice {
  price: number;
  marketCap?: number;
  volume24h?: number;
  priceChange24h?: number;
  lastUpdated?: number;
}

interface MarketData {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  currentPrice?: number;
  marketCap?: number;
  marketCapRank?: number;
  totalVolume?: number;
  priceChange24h?: number;
  priceChangePercentage24h?: number;
  priceChangePercentage7d?: number;
  priceChangePercentage30d?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  ath?: number;
  athDate?: string;
  atl?: number;
  atlDate?: string;
}

interface HistoricalData {
  tokenId: string;
  days: number | string;
  prices: Array<{
    timestamp: number;
    date: string;
    price: number;
  }>;
  marketCaps: Array<{
    timestamp: number;
    date: string;
    marketCap: number;
  }>;
  totalVolumes: Array<{
    timestamp: number;
    date: string;
    volume: number;
  }>;
}

interface PortfolioHolding {
  address: string;
  chain: string;
  balance: number;
}

interface PortfolioValue {
  totalValue: number;
  tokenCount: number;
  tokens: Array<{
    address: string;
    chain: string;
    balance: number;
    price: number | null;
    value: number;
    priceChange24h: number | null;
    marketCap?: number;
    volume24h?: number;
  }>;
  lastUpdated: string;
}

export class MarketService {
  /**
   * Get token market data by CoinGecko ID
   */
  static async getTokenMarketData(
    tokenId: string
  ): Promise<MarketData> {
    try {
      const response = await fetch(
        `${MARKET_API_URL}/token/${tokenId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch market data: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching token market data:', error);
      throw error;
    }
  }

  /**
   * Get historical price data for a token
   */
  static async getHistoricalPrices(
    tokenId: string,
    days: number | 'max' = 7
  ): Promise<HistoricalData> {
    try {
      const response = await fetch(
        `${MARKET_API_URL}/history/${tokenId}?days=${days}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch historical data: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      throw error;
    }
  }

  /**
   * Get current prices for multiple token addresses
   */
  static async getPricesByAddresses(
    tokens: Array<{ address: string; chain: string }>
  ): Promise<Record<string, TokenPrice>> {
    try {
      const response = await fetch(`${MARKET_API_URL}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }

      const result = await response.json();
      return result.data.prices;
    } catch (error) {
      console.error('Error fetching prices by addresses:', error);
      throw error;
    }
  }

  /**
   * Get single token price by address (convenience method)
   */
  static async getTokenPriceByAddress(
    address: string,
    chain: string
  ): Promise<TokenPrice | null> {
    try {
      const prices = await this.getPricesByAddresses([
        { address, chain },
      ]);
      return prices[address.toLowerCase()] || null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  /**
   * Calculate portfolio value from token holdings
   */
  static async getPortfolioValue(
    holdings: PortfolioHolding[]
  ): Promise<PortfolioValue> {
    try {
      const response = await fetch(`${MARKET_API_URL}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to calculate portfolio value: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      throw error;
    }
  }

  /**
   * Resolve token address to CoinGecko ID
   */
  static async resolveTokenAddress(
    address: string,
    chain: string
  ): Promise<string | null> {
    try {
      const response = await fetch(`${MARKET_API_URL}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Token not found
        }
        throw new Error(
          `Failed to resolve token address: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data.tokenId;
    } catch (error) {
      console.error('Error resolving token address:', error);
      return null;
    }
  }

  /**
   * Search for tokens by name or symbol
   */
  static async searchTokens(query: string): Promise<
    Array<{
      id: string;
      name: string;
      symbol: string;
      marketCapRank: number;
      thumb: string;
      large: string;
    }>
  > {
    try {
      const response = await fetch(
        `${MARKET_API_URL}/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to search tokens: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data.results;
    } catch (error) {
      console.error('Error searching tokens:', error);
      return [];
    }
  }

  /**
   * Get full market data for a token by its address (combines resolve + market data)
   */
  static async getTokenMarketDataByAddress(
    address: string,
    chain: string
  ): Promise<MarketData & { address: string; chain: string }> {
    try {
      const response = await fetch(
        `${MARKET_API_URL}/token-by-address`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, chain }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch market data by address: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching market data by address:', error);
      throw error;
    }
  }

  /**
   * Batch get market data for multiple tokens by CoinGecko IDs
   */
  static async getBatchMarketData(tokenIds: string[]): Promise<{
    successful: MarketData[];
    failed: Array<{ tokenId: string; error: string }>;
  }> {
    try {
      const response = await fetch(`${MARKET_API_URL}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch batch market data: ${response.status}`
        );
      }

      const result = await response.json();
      return {
        successful: result.data.successful,
        failed: result.data.failed,
      };
    } catch (error) {
      console.error('Error fetching batch market data:', error);
      throw error;
    }
  }

  /**
   * Batch get prices for Solana tokens (convenience method)
   */
  static async getSolanaBatchPrices(
    addresses: string[]
  ): Promise<Record<string, TokenPrice>> {
    const tokens = addresses.map((address) => ({
      address,
      chain: 'solana',
    }));
    return this.getPricesByAddresses(tokens);
  }

  /**
   * Batch get prices for EVM tokens (convenience method)
   */
  static async getEVMBatchPrices(
    addresses: string[],
    chain: 'ethereum' | 'polygon' | 'base'
  ): Promise<Record<string, TokenPrice>> {
    const tokens = addresses.map((address) => ({
      address,
      chain,
    }));
    return this.getPricesByAddresses(tokens);
  }
}

export default MarketService;
