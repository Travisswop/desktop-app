/**
 * Unified Wallet Service
 *
 * Simple frontend service for fetching all wallet tokens from the backend.
 * No logic for native vs contract tokens - the backend handles everything.
 */
import Cookies from 'js-cookie';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const WALLET_API_URL = `${API_BASE_URL}/api/v5/wallet`;

export interface TokenMarketData {
  price: string;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChange7d?: number;
  priceChange30d?: number;
  high24h?: number;
  low24h?: number;
  image?: string;
  lastUpdated?: string;
}

export interface Token {
  chain: string;
  address: string | null; // null for native tokens
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  isNative: boolean;
  marketData: TokenMarketData | null;
  logoURI?: string;
}

export interface WalletTokensResponse {
  tokens: Token[];
  totalValue: string;
  tokenCount: number;
}

export interface WalletInput {
  address: string;
  chain: 'ethereum' | 'polygon' | 'base' | 'solana';
}

export class WalletService {
  /**
   * Fetch all tokens for multiple wallets
   * Backend handles everything: native tokens, ERC-20, SPL, prices, market data
   *
   * @param wallets - Array of wallet addresses with their chains
   * @param accessToken - Optional Privy access token for authentication
   * @returns Unified token list with market data
   */
  static async getWalletTokens(
    wallets: WalletInput[],
    accessToken?: string
  ): Promise<WalletTokensResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${WALLET_API_URL}/tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ wallets }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch wallet tokens: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching wallet tokens:', error);
      throw error;
    }
  }

  /**
   * Convenience method for fetching tokens from a single wallet
   */
  static async getSingleWalletTokens(
    address: string,
    chain: 'ethereum' | 'polygon' | 'base' | 'solana',
    accessToken?: string
  ): Promise<WalletTokensResponse> {
    return this.getWalletTokens([{ address, chain }], accessToken);
  }

  /**
   * Convenience method for fetching all tokens for an EVM wallet
   * (Ethereum, Polygon, Base)
   */
  static async getEVMWalletTokens(
    address: string,
    accessToken?: string
  ): Promise<WalletTokensResponse> {
    return this.getWalletTokens(
      [
        { address, chain: 'ethereum' },
        { address, chain: 'polygon' },
        { address, chain: 'base' },
      ],
      accessToken
    );
  }

  /**
   * Convenience method for fetching tokens from EVM + Solana wallets
   */
  static async getAllWalletTokens(
    evmAddress?: string,
    solanaAddress?: string,
    accessToken?: string
  ): Promise<WalletTokensResponse> {
    const wallets: WalletInput[] = [];

    if (evmAddress) {
      wallets.push(
        { address: evmAddress, chain: 'ethereum' },
        { address: evmAddress, chain: 'polygon' },
        { address: evmAddress, chain: 'base' }
      );
    }

    if (solanaAddress) {
      wallets.push({ address: solanaAddress, chain: 'solana' });
    }

    if (wallets.length === 0) {
      return {
        tokens: [],
        totalValue: '0',
        tokenCount: 0,
      };
    }

    return this.getWalletTokens(wallets, accessToken);
  }
}

export default WalletService;
