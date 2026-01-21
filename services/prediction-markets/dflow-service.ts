/**
 * DFlow Pond API Service
 *
 * Service layer for interacting with DFlow's Prediction Markets API (Pond).
 * Handles market discovery, trading, positions, and redemptions.
 */

import { Connection, PublicKey, Transaction, VersionedTransaction, TransactionSignature } from '@solana/web3.js';
import {
  Market,
  MarketDetails,
  MarketFilters,
  Quote,
  TradeParams,
  Position,
  PortfolioSummary,
  MarketTransaction,
  ApiResponse,
  PaginatedResponse,
} from '@/types/prediction-markets';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// DFlow API configuration
const DFLOW_API_BASE = process.env.NEXT_PUBLIC_DFLOW_API_URL || 'https://api.dflow.net';
const DFLOW_API_KEY = process.env.NEXT_PUBLIC_DFLOW_API_KEY || '';

// USDC mint address on Solana
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * DFlow Prediction Markets Service
 */
export class DFlowService {
  /**
   * Get common headers for DFlow API requests
   */
  private static getHeaders(accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  /**
   * Market Discovery - Get list of markets with filters
   */
  static async getMarkets(
    filters?: MarketFilters,
    accessToken?: string
  ): Promise<PaginatedResponse<Market>> {
    try {
      const queryParams = new URLSearchParams();

      if (filters) {
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.minVolume) queryParams.append('minVolume', filters.minVolume.toString());
        if (filters.maxVolume) queryParams.append('maxVolume', filters.maxVolume.toString());
        if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
        if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
        if (filters.limit) queryParams.append('limit', filters.limit.toString());
        if (filters.offset) queryParams.append('offset', filters.offset.toString());
      }

      // Use backend proxy to avoid CORS and rate limiting issues
      const response = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/markets?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.status}`);
      }

      const result: ApiResponse<PaginatedResponse<Market>> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch markets');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching markets:', error);
      throw error;
    }
  }

  /**
   * Get market details by ID
   */
  static async getMarketById(
    marketId: string,
    accessToken?: string
  ): Promise<MarketDetails> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/markets/${marketId}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch market details: ${response.status}`);
      }

      const result: ApiResponse<MarketDetails> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch market details');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching market details:', error);
      throw error;
    }
  }

  /**
   * Get quote for buying/selling outcome tokens
   */
  static async getQuote(
    marketId: string,
    outcomeId: string,
    amount: number,
    side: 'buy' | 'sell',
    accessToken?: string
  ): Promise<Quote> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/quote`,
        {
          method: 'POST',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify({
            marketId,
            outcomeId,
            amount,
            side,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get quote: ${response.status}`);
      }

      const result: ApiResponse<Quote> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get quote');
      }

      return result.data;
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  /**
   * Execute a trade (buy/sell outcome tokens)
   * Uses the new API flow: quote → order → sign → swap
   * Returns the transaction signature
   */
  static async executeTrade(
    tradeParams: TradeParams,
    wallet: any, // Privy Solana wallet
    connection: Connection,
    accessToken?: string
  ): Promise<TransactionSignature> {
    try {
      // Step 1: Get a quote for the trade to get the outcome mint
      const quote = await this.getQuote(
        tradeParams.marketId,
        tradeParams.outcomeId,
        tradeParams.amount,
        tradeParams.side,
        accessToken
      );

      // Get the outcome mint from quote response
      // The quote endpoint returns outcomeMint which is the token mint for the selected outcome
      const outcomeMint = quote.outcomeMint;

      if (!outcomeMint) {
        throw new Error('Quote missing outcome mint address');
      }

      // Determine input and output mints based on trade side
      // Buy: USDC → Outcome tokens (user pays USDC, receives outcome tokens)
      // Sell: Outcome tokens → USDC (user pays outcome tokens, receives USDC)
      const inputMint = tradeParams.side === 'buy' ? USDC_MINT : outcomeMint;
      const outputMint = tradeParams.side === 'buy' ? outcomeMint : USDC_MINT;

      // Calculate amount in smallest units (6 decimals for USDC and outcome tokens)
      const amountInSmallestUnits = Math.floor(tradeParams.amount * 1_000_000).toString();

      // Step 2: Get the unsigned transaction from order endpoint
      const orderParams = new URLSearchParams({
        userPublicKey: tradeParams.walletAddress,
        inputMint,
        outputMint,
        amount: amountInSmallestUnits,
      });

      console.log('[DFlow] Getting order with params:', {
        userPublicKey: tradeParams.walletAddress,
        inputMint,
        outputMint,
        amount: amountInSmallestUnits,
        side: tradeParams.side,
      });

      const orderResponse = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/order?${orderParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('[DFlow] Order endpoint error:', errorText);
        throw new Error(`Failed to get order transaction: ${orderResponse.status}`);
      }

      const orderResult: ApiResponse<{ transaction: string }> = await orderResponse.json();

      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to get order transaction');
      }

      // Step 3: Deserialize and sign the transaction
      // DFlow returns versioned transactions (V0), so try versioned first, then fall back to legacy
      const transactionBuffer = Buffer.from(orderResult.data.transaction, 'base64');
      // Convert to Uint8Array for browser compatibility
      const transactionBytes = new Uint8Array(transactionBuffer);

      let signedTxBase64: string;

      try {
        // Try to deserialize as versioned transaction first (DFlow uses V0 transactions)
        const versionedTransaction = VersionedTransaction.deserialize(transactionBytes);
        console.log('[DFlow] Deserialized as versioned transaction');

        // Sign the versioned transaction using the wallet
        const signedTransaction = await wallet.signTransaction(versionedTransaction);
        const serializedTransaction = signedTransaction.serialize();
        signedTxBase64 = Buffer.from(serializedTransaction).toString('base64');
      } catch (versionedError) {
        console.log('[DFlow] Not a versioned transaction, trying legacy format:', versionedError);

        // Fallback to legacy transaction
        const transaction = Transaction.from(transactionBytes);

        // Sign the transaction using the wallet
        const signedTransaction = await wallet.signTransaction(transaction);
        const serializedTransaction = signedTransaction.serialize();
        signedTxBase64 = Buffer.from(serializedTransaction).toString('base64');
      }

      console.log('[DFlow] Transaction signed successfully, submitting to swap endpoint');

      // Step 4: Submit the signed transaction to swap endpoint
      const swapResponse = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/swap`,
        {
          method: 'POST',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify({
            signedTransaction: signedTxBase64,
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!swapResponse.ok) {
        const errorText = await swapResponse.text();
        console.error('[DFlow] Swap endpoint error:', errorText);
        throw new Error(`Failed to submit swap: ${swapResponse.status}`);
      }

      const swapResult: ApiResponse<{ signature: string }> = await swapResponse.json();

      if (!swapResult.success) {
        throw new Error(swapResult.error || 'Failed to submit swap');
      }

      const signature = swapResult.data.signature;

      // Step 5: Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Error executing trade:', error);
      throw error;
    }
  }

  /**
   * Get user positions across all markets
   */
  static async getUserPositions(
    walletAddress: string,
    accessToken?: string
  ): Promise<Position[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/positions/${walletAddress}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status}`);
      }

      const result: ApiResponse<Position[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch positions');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Get portfolio summary for a user
   */
  static async getPortfolioSummary(
    walletAddress: string,
    accessToken?: string
  ): Promise<PortfolioSummary> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/portfolio/${walletAddress}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio summary: ${response.status}`);
      }

      const result: ApiResponse<PortfolioSummary> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch portfolio summary');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
      throw error;
    }
  }

  /**
   * Redeem winnings from a settled market position
   */
  static async redeemPosition(
    positionId: string,
    walletAddress: string,
    wallet: any, // Privy Solana wallet
    connection: Connection,
    accessToken?: string
  ): Promise<TransactionSignature> {
    try {
      // Step 1: Get the unsigned redemption transaction from backend
      const response = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/redeem`,
        {
          method: 'POST',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify({
            positionId,
            walletAddress,
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create redemption transaction: ${response.status}`);
      }

      const result: ApiResponse<{ transaction: string }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create redemption transaction');
      }

      // Step 2: Deserialize the transaction
      const transactionBuffer = Buffer.from(result.data.transaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      // Step 3: Sign and send via Privy wallet
      const signature = await wallet.sendTransaction(transaction, connection);

      // Step 4: Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Error redeeming position:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a wallet
   */
  static async getTransactionHistory(
    walletAddress: string,
    limit: number = 50,
    offset: number = 0,
    accessToken?: string
  ): Promise<PaginatedResponse<MarketTransaction>> {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/v5/prediction-markets/transactions/${walletAddress}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction history: ${response.status}`);
      }

      const result: ApiResponse<PaginatedResponse<MarketTransaction>> =
        await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transaction history');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Search markets by text query
   */
  static async searchMarkets(
    query: string,
    limit: number = 20,
    accessToken?: string
  ): Promise<Market[]> {
    try {
      const filters: MarketFilters = {
        search: query,
        limit,
        sortBy: 'volume',
        sortOrder: 'desc',
      };

      const response = await this.getMarkets(filters, accessToken);
      return response.items;
    } catch (error) {
      console.error('Error searching markets:', error);
      throw error;
    }
  }

  /**
   * Get trending markets (high volume, active)
   */
  static async getTrendingMarkets(
    limit: number = 10,
    accessToken?: string
  ): Promise<Market[]> {
    try {
      const filters: MarketFilters = {
        status: 'active' as any,
        sortBy: 'volume',
        sortOrder: 'desc',
        limit,
      };

      const response = await this.getMarkets(filters, accessToken);
      return response.items;
    } catch (error) {
      console.error('Error fetching trending markets:', error);
      throw error;
    }
  }
}

export default DFlowService;
