import { ethers } from 'ethers';
import { useQueries } from '@tanstack/react-query';

// Types
export interface Transaction {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  networkFee: string;
  txreceipt_status?: string;
  contractAddress?: string;
  status?: string;
  tokenName?: string;
  tokenDecimal?: number;
  tokenSymbol?: string;
  network?: string;
  isSwapped?: boolean;
  isRedeemable?: boolean;
  redeemLink?: string;
  isClaimed?: boolean;
  tokenPrice?: number;
  swapped?: {
    from: TokenSwapInfo;
    to: TokenSwapInfo;
  };
  currentPrice: number;
  nativeTokenPrice: number;
}

interface TokenSwapInfo {
  symbol: string;
  decimal: number;
  value: string;
  price: number;
}

interface SolanaTransfer {
  source: string;
  destination: string;
  amount: number;
}

interface TokenBalance {
  token: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface ParsedInstruction {
  programId: string;
  type: string;
  extra?: {
    sourceOwner: string;
    destinationOwner: string;
    amount: number;
  };
}

interface SolTxDetails {
  blockTime: number;
  slot: number;
  txHash: string;
  fee: number;
  status: string;
  parsedInstruction: ParsedInstruction[];
  logMessage: string[];
  solTransfers: SolanaTransfer[];
  tokenBalances?: TokenBalance[];
}

interface ChainConfig {
  baseUrl: string;
  accessToken: string | undefined;
  alchemyUrl: string | undefined;
  decimal: number;
  name: string;
  symbol: string;
  type: 'evm' | 'solana';
}

// Constants
const CHAINS: Record<string, ChainConfig> = {
  ETHEREUM: {
    baseUrl: 'https://api.etherscan.io',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL,
    decimal: 18,
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'evm',
  },
  POLYGON: {
    baseUrl: 'https://api.polygonscan.com',
    accessToken: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY_TOKEN,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL,
    decimal: 18,
    name: 'POL (ex-MATIC)',
    symbol: 'POL',
    type: 'evm',
  },
  BASE: {
    baseUrl: 'https://api.basescan.org',
    accessToken: process.env.NEXT_PUBLIC_BASESCAN_API_KEY_TOKEN,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL,
    decimal: 18,
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'evm',
  },
  SOLANA: {
    baseUrl: '',
    accessToken: undefined,
    alchemyUrl: undefined,
    decimal: 9,
    name: 'Solana',
    symbol: 'SOL',
    type: 'solana',
  },
} as const;

// API Handlers
class TransactionAPI {
  private static async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
    throw new Error('Fetch failed after retries');
  }

  static async getSolTxDetails(
    signature: string
  ): Promise<SolTxDetails> {
    try {
      const response = await this.fetchWithRetry(
        `https://pro-api.solscan.io/v1.0/transaction/${signature}`,
        {
          headers: {
            'Content-Type': 'application/json',
            token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error(
        'Error fetching Solana transaction details:',
        error
      );
      return {} as SolTxDetails;
    }
  }

  static async getNativeTransactions(
    chain: keyof typeof CHAINS,
    address: string
  ): Promise<Transaction[]> {
    if (CHAINS[chain].type === 'solana') return [];

    try {
      const response = await this.fetchWithRetry(
        `${CHAINS[chain].baseUrl}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${CHAINS[chain].accessToken}`
      );
      const data = await response.json();

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
  }

  static async getERC20Transactions(
    chain: keyof typeof CHAINS,
    address: string
  ): Promise<Transaction[]> {
    if (CHAINS[chain].type === 'solana') return [];

    try {
      const response = await this.fetchWithRetry(
        `${CHAINS[chain].baseUrl}/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${CHAINS[chain].accessToken}`
      );
      const data = await response.json();

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
  }

  static async getSolanaTransactions(
    address: string
  ): Promise<Transaction[]> {
    try {
      const response = await this.fetchWithRetry(
        `https://pro-api.solscan.io/v1.0/account/transactions?account=${address}&limit=50`,
        {
          headers: {
            'Content-Type': 'application/json',
            token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
          },
        }
      );

      const data = await response.json();
      return await Promise.all(
        data.map(async (item: SolTxDetails) => {
          const txDetails = await this.getSolTxDetails(item.txHash);
          return this.formatSolanaTransaction(item, txDetails);
        })
      ).then((transactions) => transactions.filter(Boolean));
    } catch (error) {
      console.error('Error fetching Solana transactions:', error);
      return [];
    }
  }

  private static formatSolanaTransaction(
    item: SolTxDetails,
    txDetails: SolTxDetails
  ): Transaction | null {
    const { blockTime, txHash, fee, status } = item;
    const networkFee = fee / 10 ** 9;

    if (!txDetails.parsedInstruction?.length) return null;

    const instruction = txDetails.parsedInstruction[0];

    if (instruction.type === 'sol-transfer') {
      const { source, destination, amount } =
        txDetails.solTransfers[0];
      return {
        hash: txHash,
        from: source,
        to: destination,
        value: String(amount / 10 ** 9),
        timeStamp: String(blockTime),
        gas: String(fee),
        gasPrice: String(fee),
        networkFee: String(networkFee),
        status,
        tokenName: 'Solana',
        tokenSymbol: 'SOL',
        tokenDecimal: 9,
        network: 'Solana',
        currentPrice: 0,
        nativeTokenPrice: 0,
      };
    }

    if (instruction.extra && txDetails.tokenBalances?.[0]) {
      const { name, symbol, decimals } =
        txDetails.tokenBalances[0].token;
      const { sourceOwner, destinationOwner, amount } =
        instruction.extra;

      return {
        hash: txHash,
        from: sourceOwner,
        to: destinationOwner,
        value: String(amount / 10 ** decimals),
        timeStamp: String(blockTime),
        gas: String(fee),
        gasPrice: String(fee),
        networkFee: String(networkFee),
        status,
        tokenName: name,
        tokenSymbol: symbol || 'NFT',
        tokenDecimal: decimals,
        network: 'Solana',
        currentPrice: 0,
        nativeTokenPrice: 0,
      };
    }

    return null;
  }
}

// Transaction Formatting
const formatEvmTransaction = (
  tx: Transaction,
  chain: keyof typeof CHAINS
): Transaction => {
  try {
    // Format EVM transactions
    let formattedValue = '0';
    const tokenDecimal = tx.tokenDecimal
      ? Number(tx.tokenDecimal)
      : CHAINS[chain].decimal;
    formattedValue = ethers.formatUnits(tx.value, tokenDecimal);

    const gasUsed = BigInt(tx.gas);
    const gasPrice = BigInt(tx.gasPrice);
    const networkFee = ethers.formatUnits(
      gasUsed * gasPrice,
      CHAINS[chain].decimal
    );

    return {
      ...tx,
      value: formattedValue,
      networkFee,
      tokenName: tx.tokenName || CHAINS[chain].name,
      tokenDecimal: tx.tokenDecimal || CHAINS[chain].decimal,
      tokenSymbol: tx.tokenSymbol || CHAINS[chain].symbol,
      network: chain,
      currentPrice: 0,
      nativeTokenPrice: 0,
    };
  } catch (error) {
    console.error('Error formatting transaction:', error);
    throw error;
  }
};

// Hook Implementation
interface TransactionOptions {
  limit?: number;
  offset?: number;
}

interface TransactionResult {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  totalCount: number;
  refetch: () => void;
}

export const useMultiChainTransactionData = (
  walletAddress?: string,
  chains: (keyof typeof CHAINS)[] = ['ETHEREUM'],
  options: TransactionOptions = { limit: 100, offset: 0 }
): TransactionResult => {
  const transactionQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: ['transactions', chain, walletAddress],
      queryFn: async () => {
        if (!walletAddress) return [];

        if (chain === 'SOLANA') {
          return TransactionAPI.getSolanaTransactions(walletAddress);
        }

        const [nativeTxs, erc20Txs] = await Promise.all([
          TransactionAPI.getNativeTransactions(chain, walletAddress),
          TransactionAPI.getERC20Transactions(chain, walletAddress),
        ]);

        return [...nativeTxs, ...erc20Txs]
          .sort(
            (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
          )
          .map((tx) => formatEvmTransaction(tx, chain));
      },
      enabled: !!walletAddress,
    })),
  });

  const processTransactions = (
    transactions: Transaction[]
  ): Transaction[] => {
    const processed = new Map<string, Transaction>();

    transactions.forEach((tx) => {
      if (parseFloat(tx.value) <= 0) return;

      const existing = processed.get(tx.hash);
      if (existing) {
        existing.isSwapped = true;
        existing.swapped = {
          from: {
            symbol: tx.tokenSymbol!,
            decimal: tx.tokenDecimal!,
            value: tx.value,
            price: 0,
          },
          to: {
            symbol: existing.tokenSymbol!,
            decimal: existing.tokenDecimal!,
            value: existing.value,
            price: 0,
          },
        };
      } else {
        processed.set(tx.hash, tx);
      }
    });

    return Array.from(processed.values()).sort(
      (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
    );
  };

  const allTransactions = processTransactions(
    transactionQueries
      .filter((query) => query.data)
      .flatMap((query) => query.data as Transaction[])
  );

  const { limit = 100, offset = 0 } = options;

  return {
    transactions: allTransactions.slice(offset, offset + limit),
    loading: transactionQueries.some((q) => q.isLoading),
    error: transactionQueries.find((q) => q.error)?.error || null,
    hasMore: allTransactions.length > offset + limit,
    totalCount: allTransactions.length,
    refetch: () => transactionQueries.forEach((q) => q.refetch()),
  };
};
