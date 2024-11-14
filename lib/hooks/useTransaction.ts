import { ethers } from 'ethers';
import { useQueries } from '@tanstack/react-query';

export interface Transaction {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  txreceipt_status?: string;
  contractAddress?: string;
  status?: string;
  tokenName?: string;
  tokenDecimal?: number;
  tokenSymbol?: string;
  network?: string;
}

// Constants
const CHAINS = {
  ETHEREUM: {
    baseUrl: 'https://api.etherscan.io',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    decimal: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  POLYGON: {
    baseUrl: 'https://api.polygonscan.com',
    accessToken: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY_TOKEN,
    decimal: 18,
    name: 'POL (ex-MATIC)',
    symbol: 'POL',
  },
  BASE: {
    baseUrl: 'https://api.basescan.org',
    accessToken: process.env.NEXT_PUBLIC_BASESCAN_API_KEY_TOKEN,
    decimal: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
} as const;

const fetchers = {
  async getNativeTransactions(
    chain: keyof typeof CHAINS,
    address: string
  ): Promise<Transaction[]> {
    try {
      const response = await fetch(
        `${CHAINS[chain].baseUrl}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${CHAINS[chain].accessToken}`
      );
      const data = await response.json();

      // Check for API errors
      if (
        data.status === '0' &&
        data.message === 'No transactions found'
      ) {
        return [];
      }
      if (data.status === '0') {
        throw new Error(
          data.message || 'Failed to fetch native transactions'
        );
      }

      return data.result || [];
    } catch (error) {
      console.error(
        `Error fetching native transactions for ${chain}:`,
        error
      );
      throw error;
    }
  },

  async getERC20Transactions(
    chain: keyof typeof CHAINS,
    address: string
  ): Promise<Transaction[]> {
    try {
      const response = await fetch(
        `${CHAINS[chain].baseUrl}/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${CHAINS[chain].accessToken}`
      );
      const data = await response.json();

      // Check for API errors
      if (
        data.status === '0' &&
        data.message === 'No transactions found'
      ) {
        return [];
      }
      if (data.status === '0') {
        throw new Error(
          data.message || 'Failed to fetch ERC20 transactions'
        );
      }

      return data.result || [];
    } catch (error) {
      console.error(
        `Error fetching ERC20 transactions for ${chain}:`,
        error
      );
      throw error;
    }
  },
};

const formatTransaction = (
  tx: Transaction,
  chain: keyof typeof CHAINS
): Transaction => {
  try {
    // Handle potential invalid value strings
    let formattedValue = '0';
    try {
      formattedValue = ethers.formatEther(tx.value || '0');
    } catch (error) {
      console.warn(
        `Error formatting transaction value: ${tx.value}`,
        error
      );
    }

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: formattedValue,
      timeStamp: tx.timeStamp,
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      status: tx.txreceipt_status,
      tokenName: tx.tokenName || CHAINS[chain].name,
      tokenDecimal: tx.tokenDecimal || CHAINS[chain].decimal,
      tokenSymbol: tx.tokenSymbol || CHAINS[chain].symbol,
      network: chain,
    };
  } catch (error) {
    console.error('Error formatting transaction:', error);
    throw error;
  }
};

export const useMultiChainTransactionData = (
  walletAddress?: string,
  chains: (keyof typeof CHAINS)[] = ['ETHEREUM'],
  options = { limit: 100, offset: 0 }
) => {
  // Fetch transaction lists for each chain
  const transactionQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: ['transactions', chain, walletAddress],
      queryFn: async () => {
        if (!walletAddress) return [];

        try {
          const [nativeTxs, erc20Txs] = await Promise.all([
            fetchers.getNativeTransactions(chain, walletAddress),
            fetchers.getERC20Transactions(chain, walletAddress),
          ]);

          return [...nativeTxs, ...erc20Txs]
            .sort(
              (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
            ) // Fixed parsing
            .map((data) => formatTransaction(data, chain));
        } catch (error) {
          console.error(
            `Error fetching transactions for ${chain}:`,
            error
          );
          throw error;
        }
      },
      enabled: !!walletAddress,
      retry: 2, // Add retry logic
    })),
  });

  // Process and paginate transactions
  const allTransactions = transactionQueries
    .filter((query) => query.data)
    .flatMap((query) => query.data as Transaction[])
    .sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp));

  const paginatedTransactions = allTransactions.slice(
    options.offset,
    options.offset + options.limit
  );

  const isLoading = transactionQueries.some((q) => q.isLoading);
  const error = transactionQueries.find((q) => q.error)?.error;

  return {
    transactions: paginatedTransactions,
    loading: isLoading,
    error,
    hasMore: allTransactions.length > options.offset + options.limit,
    totalCount: allTransactions.length,
    refetch: () => transactionQueries.forEach((q) => q.refetch()),
  };
};
