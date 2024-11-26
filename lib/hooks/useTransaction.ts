import { ethers } from 'ethers';
import { useQueries } from '@tanstack/react-query';
import {
  ERC20ApiResponse,
  SolTxDetails,
  Transaction,
} from '@/types/transaction';
import { CHAINS } from '@/types/config';
import { APIUtils } from '@/utils/api';

function isTransaction(
  value: Transaction | null
): value is Transaction {
  return value !== null;
}

class TransactionAPI {
  static async getSolTxDetails(
    signature: string
  ): Promise<SolTxDetails> {
    try {
      const url = `https://pro-api.solscan.io/v1.0/transaction/${signature}`;
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
        },
      };

      const result = (await APIUtils.fetchWithRetry(
        url,
        options
      )) as SolTxDetails;
      return result;
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
      const url = `${CHAINS[chain].transactionApiUrl}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${CHAINS[chain].accessToken}`;

      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response =
        await APIUtils.fetchWithRetry<ERC20ApiResponse>(url, options);

      if (
        response.status === '0' &&
        response.message === 'No transactions found'
      ) {
        return [];
      }
      if (response.status === '0') {
        throw new Error(
          response.message || 'Failed to fetch native transactions'
        );
      }

      return response.result || [];
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
      const url = `${CHAINS[chain].transactionApiUrl}/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${CHAINS[chain].accessToken}`;

      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response =
        await APIUtils.fetchWithRetry<ERC20ApiResponse>(url, options);

      if (
        response.status === '0' &&
        response.message === 'No transactions found'
      ) {
        return [];
      }
      if (response.status === '0') {
        throw new Error(
          response.message || 'Failed to fetch ERC20 transactions'
        );
      }

      return response.result || [];
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
      const url = `https://pro-api.solscan.io/v1.0/account/transactions?account=${address}&limit=50`;

      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
        },
      };

      const response = await APIUtils.fetchWithRetry<SolTxDetails[]>(
        url,
        options
      );

      const transactions = await Promise.all(
        response.map(async (item: SolTxDetails) => {
          const txDetails = await this.getSolTxDetails(item.txHash);
          return this.formatSolanaTransaction(item, txDetails);
        })
      );

      return transactions.filter(isTransaction);
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
      : CHAINS[chain].nativeToken.decimals;
    formattedValue = ethers.formatUnits(tx.value, tokenDecimal);

    const gasUsed = BigInt(tx.gas);
    const gasPrice = BigInt(tx.gasPrice);
    const networkFee = ethers.formatUnits(
      gasUsed * gasPrice,
      CHAINS[chain].nativeToken.decimals
    );

    return {
      ...tx,
      value: formattedValue,
      networkFee,
      tokenName: tx.tokenName || CHAINS[chain].nativeToken.name,
      tokenDecimal:
        tx.tokenDecimal || CHAINS[chain].nativeToken.decimals,
      tokenSymbol: tx.tokenSymbol || CHAINS[chain].nativeToken.symbol,
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
