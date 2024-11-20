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
    from: {
      symbol: string;
      decimal: number;
      value: string;
      price: number;
    };
    to: {
      symbol: string;
      decimal: number;
      value: string;
      price: number;
    };
  };
  currentPrice: number;
  nativeTokenPrice: number;
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
  tokenBalanes?: TokenBalance[];
}

// Constants
const CHAINS = {
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
    decimal: 9,
    name: 'Solana',
    symbol: 'SOL',
    type: 'solana',
  },
} as const;

const solTxDetails = async (signature: string) => {
  try {
    const response = await fetch(
      `https://pro-api.solscan.io/v1.0/transaction/${signature}`,
      {
        headers: {
          'Content-Type': 'application/json',
          token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data || {};
  } catch (error) {
    console.log('🚀 ~ solTxDetails ~ error:', error);
    return {};
  }
};

const fetchers = {
  async getNativeTransactions(
    chain: keyof typeof CHAINS,
    address: string
  ): Promise<Transaction[]> {
    if (CHAINS[chain].type === 'solana') {
      return [];
    }

    try {
      const response = await fetch(
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
  },

  async getERC20Transactions(
    chain: keyof typeof CHAINS,
    address: string
  ): Promise<Transaction[]> {
    if (CHAINS[chain].type === 'solana') {
      return [];
    }

    try {
      const response = await fetch(
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
  },

  async getSolanaTransactions(
    address: string
  ): Promise<Transaction[]> {
    try {
      const response = await fetch(
        `https://pro-api.solscan.io/v1.0/account/transactions?account=${address}&limit=50`,
        {
          headers: {
            'Content-Type': 'application/json',
            token: process.env.NEXT_PUBLIC_SOLSCAN_API_KEY || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const transactionData = await Promise.all(
        data.map(async (item: SolTxDetails) => {
          const { blockTime, slot, txHash, fee, status } = item;

          const networkFee = fee / 10 ** 9;

          const txDetails = await solTxDetails(txHash);
          console.log('🚀 ~ data.map ~ txDetails:', txDetails);

          if (
            txDetails.parsedInstruction &&
            txDetails.parsedInstruction.length > 0
          ) {
            const parsedInstruction = txDetails.parsedInstruction[0];

            if (parsedInstruction.type === 'sol-transfer') {
              const { source, destination, amount } =
                txDetails.solTransfers[0];

              const sentAmount = Number(amount) / 10 ** 9;
              const tokenSymbol = 'SOL';

              const tx = {
                hash: txHash,
                from: source,
                to: destination,
                value: sentAmount,
                timeStamp: blockTime,
                blockNumber: slot,
                gas: fee,
                gasPrice: fee,
                networkFee: networkFee,
                status,
                tokenName: 'Solana',
                tokenSymbol,
                tokenDecimal: 9,
                network: 'Solana',
                currentPrice: 0,
                nativeTokenPrice: 0,
              };
              return tx;
            }
            if (parsedInstruction.extra) {
              if (
                txDetails.tokenBalances &&
                txDetails.tokenBalances.length > 0
              ) {
                console.log('txdetails', parsedInstruction.extra);
                const { name, symbol, decimals } =
                  txDetails.tokenBalances[0].token;

                const { sourceOwner, destinationOwner, amount } =
                  parsedInstruction.extra;

                const sentAmount = Number(amount) / 10 ** decimals;
                const tokenSymbol = symbol || 'NFT';

                const tx = {
                  hash: txHash,
                  from: sourceOwner,
                  to: destinationOwner,
                  value: sentAmount,
                  timeStamp: blockTime,
                  blockNumber: slot,
                  gas: fee,
                  gasPrice: fee,
                  networkFee: networkFee,
                  status,
                  tokenName: name,
                  tokenSymbol,
                  tokenDecimal: decimals,
                  network: 'Solana',
                  currentPrice: 0,
                  nativeTokenPrice: 0,
                };
                return tx;
              }
            }
          }
        })
      );
      return transactionData.filter(Boolean);
    } catch (error) {
      console.error('Error fetching Solana transactions:', error);
      return [];
    }
  },
};

const formatTransaction = (
  tx: Transaction,
  chain: keyof typeof CHAINS
): Transaction => {
  try {
    if (CHAINS[chain].type === 'solana') {
      return tx;
    }

    // Format EVM transactions
    let formattedValue = '0';
    try {
      const tokenDecimal = tx.tokenDecimal
        ? Number(tx.tokenDecimal)
        : CHAINS[chain].decimal;
      formattedValue = ethers.formatUnits(tx.value, tokenDecimal);
    } catch (error) {
      console.warn(
        `Error formatting transaction value: ${tx.value}`,
        error
      );
    }

    const gasUsed = BigInt(tx.gas);
    const gasPrice = BigInt(tx.gasPrice);
    const networkFee = ethers.formatUnits(
      gasUsed * gasPrice,
      CHAINS[chain].decimal
    );

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: formattedValue,
      timeStamp: tx.timeStamp,
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      networkFee,
      status: tx.txreceipt_status,
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
          if (chain === 'SOLANA') {
            const solanaTransactions =
              await fetchers.getSolanaTransactions(walletAddress);

            console.log(
              '🚀 ~ queryFn: ~ solanaTransactions:',
              solanaTransactions
            );
            return solanaTransactions;
          }

          const [nativeTxs, erc20Txs] = await Promise.all([
            fetchers.getNativeTransactions(chain, walletAddress),
            fetchers.getERC20Transactions(chain, walletAddress),
          ]);

          return [...nativeTxs, ...erc20Txs]
            .sort(
              (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
            )
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
    .filter((tx) => parseFloat(tx.value) > 0)
    .reduce((acc, tx) => {
      const existingTx = acc.find(
        (existing) => existing.hash === tx.hash
      );
      if (existingTx) {
        existingTx.isSwapped = true;
        existingTx.swapped = {
          from: {
            symbol: tx.tokenSymbol!,
            decimal: tx.tokenDecimal!,
            value: tx.value,
            price: 0,
          },
          to: {
            symbol: existingTx.tokenSymbol!,
            decimal: existingTx.tokenDecimal!,
            value: existingTx.value,
            price: 0,
          },
        };
      } else {
        acc.push(tx);
      }
      return acc;
    }, [] as Transaction[])
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
