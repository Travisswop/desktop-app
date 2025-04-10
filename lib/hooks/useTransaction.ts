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
      const url = `https://pro-api.solscan.io/v2.0/transaction/detail?tx=${signature}`;
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
        },
      };
      const result = await APIUtils.fetchWithRetry<SolTxDetails>(
        url,
        options
      );
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
      const url = `https://pro-api.solscan.io/v2.0/account/transactions?address=${address}&limit=40`;

      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
        },
      };

      const response = await APIUtils.fetchWithRetry<{
        success: boolean;
        data: Array<{
          slot: number;
          fee: number;
          status: string;
          signer: string[];
          block_time: number;
          tx_hash: string;
          parsed_instructions: Array<{
            type: string;
            program: string;
            program_id: string;
          }>;
        }>;
      }>(url, options);

      if (!response.success || !response.data) {
        return [];
      }

      const transactions = await Promise.all(
        response.data.map(async (item) => {
          const txDetails = await this.getSolTxDetails(item.tx_hash);

          return this.formatSolanaTransaction(
            {
              blockTime: item.block_time,
              txHash: item.tx_hash,
              fee: item.fee,
              status: item.status,
            },
            txDetails
          );
        })
      );

      return transactions.filter(isTransaction);
    } catch (error) {
      console.error('Error fetching Solana transactions:', error);
      return [];
    }
  }

  private static formatSolanaTransaction(
    item: {
      blockTime: number;
      txHash: string;
      fee: number;
      status: string;
    },
    txDetails: SolTxDetails
  ): Transaction | null {
    const { blockTime, txHash, fee, status } = item;
    const networkFee = fee / 10 ** 9;
    // Handle token transfers
    if (txDetails.data?.token_bal_change?.length) {
      const tokenChange = txDetails.data.token_bal_change[0];
      const tokenInfo =
        txDetails.metadata?.tokens?.[tokenChange.token_address];

      return {
        hash: txHash,
        from: tokenChange.pre_owner,
        to: tokenChange.post_owner,
        value: String(
          Math.abs(Number(tokenChange.change_amount)) /
            10 ** tokenChange.decimals
        ),
        timeStamp: String(blockTime),
        gas: String(fee),
        gasPrice: String(fee),
        networkFee: String(networkFee),
        status: status === 'Success' ? '1' : '0',
        tokenName: tokenInfo?.token_name || 'Unknown Token',
        tokenSymbol: tokenInfo?.token_symbol || 'UNKNOWN',
        tokenDecimal: tokenChange.decimals,
        network: 'Solana',
        currentPrice: 0,
        nativeTokenPrice: 0,
      };
    }

    // Handle SOL transfers
    if (txDetails.data?.sol_bal_change?.length) {
      const solChanges = txDetails.data.sol_bal_change.filter(
        (change) => Number(change.change_amount) !== 0
      );

      if (solChanges.length > 0) {
        const solChange = solChanges[0];
        const recipient = txDetails.data.account_keys?.find(
          (key) => !key.signer && key.writable
        );

        return {
          hash: txHash,
          from: solChange.address,
          to: recipient?.pubkey || '',
          value: String(
            Math.abs(Number(solChange.change_amount)) / 10 ** 9
          ),
          timeStamp: String(blockTime),
          gas: String(fee),
          gasPrice: String(fee),
          networkFee: String(networkFee),
          status: status === 'Success' ? '1' : '0',
          tokenName: 'Solana',
          tokenSymbol: 'SOL',
          tokenDecimal: 9,
          network: 'Solana',
          currentPrice: 0,
          nativeTokenPrice: 0,
        };
      }
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
  solWalletAddress: string,
  evmWalletAddress: string,
  chains: (keyof typeof CHAINS)[] = ['ETHEREUM'],
  options: TransactionOptions = { limit: 100, offset: 0 }
): TransactionResult => {
  const transactionQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: [
        'transactions',
        chain,
        solWalletAddress,
        evmWalletAddress,
      ],
      queryFn: async () => {
        if (!evmWalletAddress || !solWalletAddress) return [];

        if (chain === 'SOLANA') {
          return TransactionAPI.getSolanaTransactions(
            solWalletAddress
          );
        }

        const [nativeTxs, erc20Txs] = await Promise.all([
          TransactionAPI.getNativeTransactions(
            chain,
            evmWalletAddress
          ),
          TransactionAPI.getERC20Transactions(
            chain,
            evmWalletAddress
          ),
        ]);

        return [...nativeTxs, ...erc20Txs]
          .sort(
            (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
          )
          .map((tx) => formatEvmTransaction(tx, chain));
      },
      enabled: !!evmWalletAddress,
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
