/**
 * Unified Wallet Service
 *
 * Simple frontend service for fetching all wallet tokens from the backend.
 * No logic for native vs contract tokens - the backend handles everything.
 */

import { apiFetch } from '@/lib/api/apiFetch';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { isNetworkFetchError } from '@/lib/api/fetchErrors';

export interface TokenMarketData {
  id?: string;
  symbol?: string;
  name?: string;
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
  walletAddress?: string;
  address: string | null; // null for native tokens
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  value?: number;
  isNative: boolean;
  marketData: TokenMarketData | null;
  logoURI?: string;
}

export interface WalletTokensResponse {
  tokens: Token[];
  totalValue: string;
  tokenCount: number;
  degraded?: boolean;
  errors?: WalletTokenFetchIssue[];
  failedWalletCount?: number;
  fetchedWalletCount?: number;
}

export interface WalletTokenFetchIssue {
  address?: string;
  chain?: string;
  source?: string;
  message?: string;
}

export interface WalletInput {
  address: string;
  chain: 'ethereum' | 'polygon' | 'base' | 'solana' | 'arbitrum';
}

export type CoinbaseOnrampNetwork =
  | 'ethereum'
  | 'polygon'
  | 'base'
  | 'arbitrum'
  | 'optimism'
  | 'solana';

export interface CoinbaseOnrampSessionRequest {
  network: CoinbaseOnrampNetwork;
  walletAddress?: string;
  purchaseCurrency?: string;
  paymentCurrency?: string;
  paymentAmount?: string;
  redirectUrl?: string;
}

export interface CoinbaseOnrampSessionResponse {
  onrampUrl: string;
  quote: any | null;
  destinationAddress: string;
  destinationNetwork: CoinbaseOnrampNetwork;
  purchaseCurrency: string;
  paymentCurrency: string;
  paymentAmount: string;
}

export type CoinbaseOnrampPaymentMethod =
  | 'GUEST_CHECKOUT_APPLE_PAY'
  | 'GUEST_CHECKOUT_GOOGLE_PAY';

export interface CoinbaseOnrampOrderRequest {
  network: CoinbaseOnrampNetwork;
  walletAddress?: string;
  purchaseCurrency?: string;
  paymentCurrency?: string;
  paymentAmount?: string;
  purchaseAmount?: string;
  paymentMethod?: CoinbaseOnrampPaymentMethod;
  email?: string;
  phoneNumber?: string;
  phoneNumberVerifiedAt?: string;
  agreementAcceptedAt: string;
  domain?: string;
  isQuote?: boolean;
}

export interface CoinbaseOnrampOrderResponse {
  order: any | null;
  paymentLink: {
    url: string;
    paymentLinkType?: string;
  } | null;
  destinationAddress: string;
  destinationNetwork: CoinbaseOnrampNetwork;
  purchaseCurrency: string;
  paymentCurrency: string;
  paymentAmount: string | null;
  paymentMethod: CoinbaseOnrampPaymentMethod;
  sandbox?: boolean;
}

export class WalletService {
  private static async requestWalletTokens(
    url: string,
    wallets: WalletInput[],
    accessToken?: string
  ): Promise<WalletTokensResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await apiFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ wallets }),
      credentials: url.startsWith('/') ? 'include' : undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch wallet tokens: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

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
      if (!accessToken) {
        return await this.requestWalletTokens('/api/wallet/tokens', wallets);
      }

      try {
        return await this.requestWalletTokens(
          buildSwopApiUrl('/api/v5/wallet/tokens'),
          wallets,
          accessToken
        );
      } catch (error) {
        if (!isNetworkFetchError(error)) {
          throw error;
        }

        return await this.requestWalletTokens(
          '/api/wallet/tokens',
          wallets,
          accessToken
        );
      }
    } catch (error) {
      console.warn('Wallet tokens unavailable:', error);
      throw error;
    }
  }

  static async createCoinbaseOnrampSession(
    payload: CoinbaseOnrampSessionRequest,
    accessToken?: string | null
  ): Promise<CoinbaseOnrampSessionResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await apiFetch(
      buildSwopApiUrl('/api/v5/wallet/onramp/coinbase/session'),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      }
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Unable to start Coinbase funding.'
      );
    }

    return result.data;
  }

  static async createCoinbaseOnrampOrder(
    payload: CoinbaseOnrampOrderRequest,
    accessToken?: string | null
  ): Promise<CoinbaseOnrampOrderResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await apiFetch(
      buildSwopApiUrl('/api/v5/wallet/onramp/coinbase/order'),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      }
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Unable to start embedded Coinbase funding.'
      );
    }

    return result.data;
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
   * (Ethereum, Polygon, Base, Arbitrum)
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
        { address, chain: 'arbitrum' },
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
        { address: evmAddress, chain: 'base' },
        { address: evmAddress, chain: 'arbitrum' }
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
