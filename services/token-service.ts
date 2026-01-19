import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {
  ChainType,
  EVMChain,
  MarketData,
  TimeSeriesDataPoint,
  SolanaTokenData,
} from '@/types/token';
import { CHAINS } from '@/types/config';
import logger from '../utils/logger';
import { MarketService } from './market-service';

interface TokenAccount {
  account: SolanaTokenData;
  pubkey: PublicKey;
}

const SWOP_TOKEN: any = {
  name: 'Swop',
  symbol: 'SWOP',
  address: 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
  decimals: 9,
  balance: '0',
  chain: 'SOLANA',
  logoURI: '/swop.png',
  marketData: {
    price: '0',
    uuid: 'swop',
    symbol: 'SWOP',
    name: 'Swop',
    color: '#000000',
    marketCap: '0',
    '24hVolume': '0',
    iconUrl: '/swop.png',
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
  timeSeriesData: {
    '1H': [],
    '1D': [],
    '1W': [],
    '1M': [],
    '1Y': [],
  },
  nativeTokenPrice: 0,
  isNative: false,
};

export class TokenAPIService {
  private static async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (!response.ok)
        throw new Error(`HTTP error!
        status: ${response.status}`);
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  static async getTokenBalances(chain: EVMChain, address: string) {
    const response = await this.fetchWithRetry(
      CHAINS[chain].rpcUrl!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address, 'erc20'],
          id: 42,
        }),
      }
    );
    const { result } = await response.json();

    return (
      result.tokenBalances?.filter(
        (token: { tokenBalance: string }) =>
          BigInt(token.tokenBalance) > 0
      ) || []
    );
  }

  static async getMarketData(params: {
    address?: string;
    uuid?: string;
    chain?: string;
  }): Promise<MarketData | null> {
    try {
      // If we have an address and chain, use the backend CoinGecko Pro API
      if (params.address && params.chain) {
        const marketData =
          await MarketService.getTokenMarketDataByAddress(
            params.address,
            params.chain
          );

        // Map CoinGecko response to CoinRanking-like format for backward compatibility
        return {
          uuid: marketData.id,
          symbol: marketData.symbol.toUpperCase(),
          name: marketData.name,
          price: marketData.currentPrice?.toString() || '0',
          marketCap: marketData.marketCap?.toString() || '0',
          '24hVolume': marketData.totalVolume?.toString() || '0',
          color: '#000000',
          iconUrl: marketData.image || '',
          listedAt: 0,
          tier: 0,
          change:
            marketData.priceChangePercentage24h?.toString() || '0',
          rank: marketData.marketCapRank || 0,
          sparkline: [],
          lowVolume: false,
          coinrankingUrl: '',
          btcPrice: '0',
          contractAddresses: [params.address],
        };
      }

      // If we have a uuid (CoinGecko ID), use the backend API
      if (params.uuid) {
        const marketData = await MarketService.getTokenMarketData(
          params.uuid
        );

        // Map CoinGecko response to CoinRanking-like format
        return {
          uuid: marketData.id,
          symbol: marketData.symbol.toUpperCase(),
          name: marketData.name,
          price: marketData.currentPrice?.toString() || '0',
          marketCap: marketData.marketCap?.toString() || '0',
          '24hVolume': marketData.totalVolume?.toString() || '0',
          color: '#000000',
          iconUrl: marketData.image || '',
          listedAt: 0,
          tier: 0,
          change:
            marketData.priceChangePercentage24h?.toString() || '0',
          rank: marketData.marketCapRank || 0,
          sparkline: [],
          lowVolume: false,
          coinrankingUrl: '',
          btcPrice: '0',
          contractAddresses: [],
        };
      }

      logger.error(
        'getMarketData called without address+chain or uuid'
      );
      return null;
    } catch (error) {
      logger.error('Error fetching market data from backend:', error);
      return null;
    }
  }

  static async getTimeSeriesData(uuid: string, period = '1h') {
    try {
      // Map period to days for CoinGecko API
      const periodToDaysMap: Record<string, number | 'max'> = {
        '1h': 1,
        '3h': 1,
        '12h': 1,
        '24h': 1,
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '3m': 90,
        '1y': 365,
        '3y': 1095,
        '5y': 1825,
      };

      const days = periodToDaysMap[period] || 7;

      // Use backend CoinGecko Pro API for historical data
      const historicalData = await MarketService.getHistoricalPrices(
        uuid,
        days
      );

      // Map CoinGecko response to CoinRanking-like format for backward compatibility
      return {
        change: '0', // Calculate from price data if needed
        history: historicalData.prices.map((pricePoint) => ({
          price: pricePoint.price.toString(),
          timestamp: Math.floor(pricePoint.timestamp / 1000), // Convert to seconds
        })),
      };
    } catch (error) {
      logger.error(
        'Error fetching time series data from backend:',
        error
      );
      return {
        change: '0',
        history: [],
      };
    }
  }
}

export class TokenContractService {
  private static getContract(
    address: string,
    provider: ethers.JsonRpcProvider
  ) {
    return new ethers.Contract(
      address,
      [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)',
      ],
      provider
    );
  }

  static async getTokenDetails(
    address: string,
    walletAddress: string,
    provider: ethers.JsonRpcProvider
  ) {
    try {
      const contract = this.getContract(address, provider);
      // Check if the contract is deployed and has the expected methods
      const isContract = (await provider.getCode(address)) !== '0x';
      if (!isContract) {
        logger.error('Address is not a contract:', address);
        return null;
      }

      // Check if the contract has the required methods before calling them
      const balanceCall = contract.balanceOf(walletAddress);
      const decimalsCall = contract.decimals();
      const symbolCall = contract.symbol();
      const nameCall = contract.name();

      const [balance, decimals, symbol, name] = await Promise.all([
        balanceCall.catch(() => null), // Handle potential errors
        decimalsCall.catch(() => null),
        symbolCall.catch(() => null),
        nameCall.catch(() => null),
      ]);

      if (
        balance === null ||
        decimals === null ||
        symbol === null ||
        name === null
      ) {
        logger.error(
          'One or more token details could not be fetched:',
          {
            balance,
            decimals,
            symbol,
            name,
          }
        );
        return null;
      }

      return {
        balance: ethers.formatUnits(balance, decimals),
        decimals,
        symbol,
        name,
      };
    } catch (error) {
      logger.error('Error fetching token details:', error);
      return null;
    }
  }

  static async getNativeTokens(chain: ChainType) {
    if (!chain) return null;

    try {
      const nativeToken = await this.formatNativeToken(chain);
      return nativeToken;
    } catch (error) {
      logger.error('Error fetching Solana tokens:', error);
      return null;
    }
  }

  private static async formatNativeToken(chain: ChainType) {
    const nativeToken = CHAINS[chain as keyof typeof CHAINS].nativeToken;
    const marketData = await TokenAPIService.getMarketData({
      uuid: nativeToken.uuid,
    });

    const timeSeriesData = await TokenAPIService.getTimeSeriesData(
      nativeToken.uuid
    );

    return {
      symbol: nativeToken.symbol,
      name: nativeToken.name,
      decimals: nativeToken.decimals,
      address: null,
      chain,
      logoURI: `/assets/crypto-icons/$
      {nativeToken.symbol}.png`,
      marketData: marketData,
      sparklineData: processSparklineData(timeSeriesData),
      isNative: true,
    };
  }
}

export class SolanaService {
  static async getSplTokens(walletAddress: string) {
    logger.info('Starting getSplTokens for wallet:', walletAddress);

    if (!walletAddress) {
      logger.warn('No wallet address provided to getSplTokens');
      return [];
    }

    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
        'confirmed'
      );
      logger.info('Solana connection established');

      // const connection = new Connection(clusterApiUrl('devnet'));
      const publicKey = new PublicKey(walletAddress);

      // Validate the public key
      if (!publicKey) {
        logger.error('Invalid wallet address:', walletAddress);
        return [];
      }
      logger.info('Valid public key created:', publicKey.toString());

      const [balance, tokenAccounts, token2022Accounts] =
        await Promise.all([
          connection.getBalance(publicKey),
          connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: TOKEN_PROGRAM_ID,
          }),
          connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: TOKEN_2022_PROGRAM_ID,
          }),
        ]);

      logger.info('Raw SOL balance:', balance);
      logger.info(
        'Number of regular token accounts found:',
        tokenAccounts.value.length
      );
      logger.info(
        'Number of Token-2022 accounts found:',
        token2022Accounts.value.length
      );

      // Check if tokenAccounts is in the expected format
      if (!Array.isArray(tokenAccounts.value)) {
        logger.error(
          'Unexpected token accounts format:',
          tokenAccounts
        );
        return [];
      }

      // Check if token2022Accounts is in the expected format
      if (!Array.isArray(token2022Accounts.value)) {
        logger.error(
          'Unexpected Token-2022 accounts format:',
          token2022Accounts
        );
        return [];
      }

      let solToken;
      if (balance > 0) {
        logger.info(
          'Processing native SOL token with balance:',
          balance
        );
        const nativeToken = await this.getNativeSolToken();
        solToken = {
          ...nativeToken,
          balance: (balance / Math.pow(10, 9)).toString(),
          address: '',
        };
        logger.info('Native SOL token processed:', {
          symbol: solToken.symbol,
          balance: solToken.balance,
          name: solToken.name,
        });
      } else {
        logger.info('No SOL balance found, skipping native token');
      }

      // Process regular token accounts
      const regularTokenData = await this.getTokenAccountsData(
        tokenAccounts.value,
        'regular'
      );

      // Process Token-2022 accounts
      const token2022Data = await this.getTokenAccountsData(
        token2022Accounts.value,
        'token2022'
      );

      logger.info(
        'Regular token accounts data processed, valid tokens:',
        regularTokenData.filter((token) => token !== null).length
      );
      logger.info(
        'Token-2022 accounts data processed, valid tokens:',
        token2022Data.filter((token) => token !== null).length
      );

      const validRegularTokenData = regularTokenData.filter(
        (token) => token !== null
      );
      const validToken2022Data = token2022Data.filter(
        (token) => token !== null
      );

      const tokens = [
        ...validRegularTokenData,
        ...validToken2022Data,
      ];

      // Handle SWOP token separately using backend CoinGecko API
      // (filtered out from getTokenAccountsData to prevent duplicates)
      logger.info(
        'Processing SWOP token separately with backend CoinGecko API'
      );
      const swopTokenBalance = await this.getSwopTokenBalance(
        walletAddress
      );

      // Fetch SWOP token market data from backend CoinGecko API
      const swopMarketData = await TokenAPIService.getMarketData({
        address: SWOP_TOKEN.address,
        chain: 'solana',
      });

      logger.info('SWOP token details from backend:', {
        balance: swopTokenBalance,
        price: swopMarketData?.price || '0',
        address: SWOP_TOKEN.address,
      });

      const swopTokenMarketData = swopMarketData || {
        ...SWOP_TOKEN.marketData,
        price: '0',
      };

      const finalTokens = [
        {
          ...SWOP_TOKEN,
          balance: (
            Number(swopTokenBalance) /
            Math.pow(10, SWOP_TOKEN.decimals)
          ).toString(),
          marketData: swopTokenMarketData,
        },
        solToken,
        ...tokens,
      ].filter(Boolean); // Remove any null/undefined tokens

      logger.info('Final tokens array assembled:', {
        totalTokens: finalTokens.length,
        tokenSymbols: finalTokens.map(
          (token) => token?.symbol || 'unknown'
        ),
        tokenBalances: finalTokens.map(
          (token) => token?.balance || '0'
        ),
      });

      return finalTokens;
    } catch (error) {
      logger.error('Error fetching Solana tokens:', error);
      return [];
    }
  }

  private static async getNativeSolToken() {
    try {
      const nativeSol = CHAINS.SOLANA.nativeToken;

      const marketData = await TokenAPIService.getMarketData({
        uuid: nativeSol.uuid,
      });

      if (!marketData) {
        logger.error('Failed to fetch SOL market data');
        return null;
      }

      const timeSeriesData = await TokenAPIService.getTimeSeriesData(
        marketData.uuid || ''
      );

      const nativeToken = {
        symbol: nativeSol.symbol,
        name: nativeSol.name,
        decimals: nativeSol.decimals,
        address: null,
        chain: 'SOLANA',
        marketData,
        sparklineData: processSparklineData(timeSeriesData),
        isNative: true,
      };

      return nativeToken;
    } catch (error) {
      logger.error('Error fetching native SOL token:', error);
      return null;
    }
  }

  private static async getTokenAccountsData(
    tokenAccounts: TokenAccount[],
    tokenType: 'regular' | 'token2022' = 'regular'
  ) {
    logger.info(
      `Starting getTokenAccountsData for ${tokenType} tokens with`,
      tokenAccounts.length,
      'token accounts'
    );

    try {
      const tokens = tokenAccounts
        .map((token: TokenAccount, index: number) => {
          try {
            const { tokenAmount, mint } =
              token.account.data.parsed.info;

            logger.info(
              `Processing ${tokenType} token account ${index + 1}:`,
              {
                mint,
                decimals: tokenAmount.decimals,
                balance: tokenAmount.uiAmountString,
                pubkey: token.pubkey.toString(),
                tokenType,
              }
            );

            return {
              decimals: tokenAmount.decimals,
              balance: tokenAmount.uiAmountString,
              address: mint,
            };
          } catch (error) {
            logger.error(
              `Error parsing ${tokenType} token account ${
                index + 1
              }:`,
              error
            );
            return null;
          }
        })
        .filter(Boolean)
        // Filter out SWOP token to prevent duplicate processing
        .filter((token) => {
          const isSwopToken = token?.address === SWOP_TOKEN.address;
          if (isSwopToken) {
            logger.info(
              'Filtering out SWOP token to prevent duplicate processing'
            );
          }
          return !isSwopToken;
        });

      logger.info('Parsed tokens after filtering:', tokens.length);

      const tokenDataPromises = tokens.map(async (token, index) => {
        if (!token) return null;

        logger.info(
          `Fetching market data for ${tokenType} token ${index + 1}:`,
          {
            address: token.address,
            balance: token.balance,
            decimals: token.decimals,
            tokenType,
          }
        );

        try {
          const marketData = await TokenAPIService.getMarketData({
            address: token.address,
            chain: 'solana', // Add chain parameter for backend CoinGecko Pro API
          });

          // If no market data from CoinGecko backend, skip this token
          if (!marketData || !marketData.price) {
            logger.warn(
              `No market data found for token from CoinGecko backend: ${token.address}`
            );
            return null;
          }

          let timeSeriesData = null;
          // Only fetch time series data if we have a valid UUID from the API
          if (
            marketData &&
            marketData.uuid &&
            !marketData.uuid.startsWith('direct-')
          ) {
            timeSeriesData = await TokenAPIService.getTimeSeriesData(
              marketData.uuid || ''
            );
          }

          const processedToken = {
            ...token,
            chain: 'SOLANA',
            name: marketData?.name || 'Unknown Token',
            symbol: marketData?.symbol || 'UNKNOWN',
            marketData,
            sparklineData: timeSeriesData
              ? processSparklineData(timeSeriesData)
              : [],
            isNative: false,
          };

          logger.info(
            `${tokenType} token ${index + 1} processed successfully:`,
            {
              symbol: processedToken.symbol,
              name: processedToken.name,
              balance: processedToken.balance,
              price: processedToken.marketData?.price,
              tokenType,
            }
          );

          return processedToken;
        } catch (error) {
          logger.error(
            `Error fetching ${tokenType} token data for ${token.address}:`,
            error
          );
          return null;
        }
      });

      const results = await Promise.all(tokenDataPromises);
      const validResults = results.filter(Boolean);

      logger.info(
        `${tokenType} token accounts data processing complete:`,
        {
          totalProcessed: tokens.length,
          successfulTokens: validResults.length,
          failedTokens: tokens.length - validResults.length,
          tokenType,
        }
      );

      return validResults;
    } catch (error) {
      logger.error('Error processing token accounts:', error);
      return [];
    }
  }

  private static async getSwopTokenBalance(walletAddress: string) {
    logger.info(
      'Starting getSwopTokenBalance for wallet:',
      walletAddress
    );

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
      'confirmed'
    );
    const publicKey = new PublicKey(walletAddress);
    const swopToken = new PublicKey(SWOP_TOKEN.address || '');

    logger.info('SWOP token details:', {
      swopTokenAddress: swopToken.toString(),
      walletAddress: publicKey.toString(),
    });

    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        swopToken,
        publicKey
      );

      logger.info(
        'Associated token address calculated:',
        associatedTokenAddress.toString()
      );

      // Check if the associated token address is valid
      if (!associatedTokenAddress) {
        logger.error(
          'Associated token address not found for SWOP token'
        );
        return null;
      }

      const tokenAccount = await getAccount(
        connection,
        associatedTokenAddress
      );

      // Check if the token account is valid
      if (!tokenAccount) {
        logger.warn(
          'Token account not found for associated address:',
          associatedTokenAddress.toString()
        );
        return '0'; // Return 0 instead of null for consistency
      }

      logger.info('SWOP token account found:', {
        amount: tokenAccount.amount,
        mint: tokenAccount.mint.toString(),
      });

      return tokenAccount.amount;
    } catch (error) {
      logger.error('Error fetching SWOP token balance:', error);
      return '0'; // Return 0 instead of null for consistency
    }
  }
}

// Utility function
export const processSparklineData = (timeSeriesData: {
  change: string;
  history: TimeSeriesDataPoint[];
}) => {
  if (!timeSeriesData?.history) return [];

  return timeSeriesData.history
    .map((data: TimeSeriesDataPoint) => {
      const price =
        data.price !== null ? parseFloat(data.price) : null;
      return price !== null
        ? { timestamp: data.timestamp, value: price }
        : null;
    })
    .filter(Boolean);
};
