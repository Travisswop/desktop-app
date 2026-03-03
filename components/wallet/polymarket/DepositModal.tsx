'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  usePrivy,
  useWallets,
  useSendTransaction,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import CustomModal from '@/components/modal/CustomModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { getLifiDepositQuote } from '@/actions/lifiForTokenSwap';
import Image from 'next/image';
import {
  erc20Abi,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  createPublicClient,
  http,
} from 'viem';
import { polygon, mainnet, base } from 'viem/chains';
import {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';
import {
  Connection,
  VersionedTransaction,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DepositStep =
  | 'select'
  | 'amount'
  | 'confirm'
  | 'processing'
  | 'success'
  | 'error';

// Token type for the deposit modal (subset of TokenData with optional marketData)
interface DepositToken {
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  address: string | null;
  logoURI: string;
  chain: string;
  marketData?: {
    price?: string;
  } | null;
}

// LiFi Quote type
interface LiFiQuote {
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
    executionDuration?: number;
    feeCosts?: Array<{ amount: string; token: { symbol: string } }>;
    gasCosts?: Array<{ amount: string; token: { symbol: string } }>;
  };
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId: number;
    gasLimit?: string;
    gasPrice?: string;
    transaction?: string; // Base64 encoded for Solana
  };
  action: {
    fromToken: { symbol: string; decimals: number };
    toToken: { symbol: string; decimals: number };
  };
}

// USDC.e on Polygon
const USDC_E_ADDRESS = USDC_E_CONTRACT_ADDRESS;

// Chain configurations
const SUPPORTED_CHAINS = [
  'ETHEREUM',
  'POLYGON',
  'BASE',
  'SOLANA',
] as const;

const CHAIN_CONFIG: Record<
  string,
  { id: string; name: string; icon: string }
> = {
  ETHEREUM: {
    id: '1',
    name: 'Ethereum',
    icon: '/images/IconShop/eTH@3x.png',
  },
  POLYGON: {
    id: '137',
    name: 'Polygon',
    icon: '/images/IconShop/polygon.png',
  },
  BASE: {
    id: '8453',
    name: 'Base',
    icon: 'https://www.base.org/document/safari-pinned-tab.svg',
  },
  SOLANA: {
    id: '1151111081099710',
    name: 'Solana',
    icon: '/images/IconShop/solana@2x.png',
  },
};

// Polygon chain ID for LiFi
const POLYGON_CHAIN_ID = '137';

// Chain-specific viem chain configs for creating public clients
const VIEM_CHAINS: Record<string, (typeof mainnet) | (typeof polygon) | (typeof base)> = {
  '1': mainnet,
  '137': polygon,
  '8453': base,
};

// Create a public client for a specific chain (needed for allowance checks on non-Polygon chains)
const getPublicClientForChain = (chainId: string) => {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) return null;
  return createPublicClient({
    chain,
    transport: http(),
  });
};

// Helper to format token amount to smallest units
const formatTokenAmount = (
  amount: string | number,
  decimals: number,
): string => {
  try {
    // Ensure decimals is valid
    const safeDecimals = decimals || 18;

    // Convert to string if it's a number
    const amountStr =
      typeof amount === 'number' ? amount.toString() : amount;

    // Handle empty or invalid input
    if (!amountStr || amountStr.trim() === '') {
      return '0';
    }

    // Parse the amount as a number first to handle various formats
    const numAmount = parseFloat(amountStr);

    if (isNaN(numAmount) || numAmount <= 0) {
      return '0';
    }

    // Convert to a clean decimal string with proper precision
    // Use toFixed to handle scientific notation and limit decimals
    let cleanAmount = numAmount.toFixed(safeDecimals);

    // Remove trailing zeros after decimal point (but keep at least one digit after decimal if there is one)
    if (cleanAmount.includes('.')) {
      // First remove trailing zeros
      cleanAmount = cleanAmount.replace(/0+$/, '');
      // Then remove trailing decimal point if no decimals left
      cleanAmount = cleanAmount.replace(/\.$/, '');
    }

    // If we end up with empty string or just "0", return '0'
    if (!cleanAmount || cleanAmount === '0' || cleanAmount === '') {
      return '0';
    }

    const parsed = parseUnits(cleanAmount, safeDecimals);
    return parsed.toString();
  } catch (err) {
    return '0';
  }
};

// Helper to get token address for LiFi
const getTokenAddressForLifi = (token: DepositToken): string => {
  const chain = token.chain.toUpperCase();

  // Native tokens
  if (chain === 'SOLANA' && token.symbol === 'SOL') {
    return 'So11111111111111111111111111111111111111112';
  }
  if (
    ['ETHEREUM', 'POLYGON', 'BASE'].includes(chain) &&
    ['ETH', 'POL', 'MATIC'].includes(token.symbol)
  ) {
    return '0x0000000000000000000000000000000000000000';
  }

  return (
    token.address || '0x0000000000000000000000000000000000000000'
  );
};

export default function DepositModal({
  open,
  onOpenChange,
}: DepositModalProps) {
  const { user, getAccessToken } = usePrivy();
  const { safeAddress } = useTrading();
  const { publicClient, eoaAddress, switchToPolygon } =
    usePolymarketWallet();
  const { wallets } = useWallets();
  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();
  const { sendTransaction } = useSendTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    // Find the first wallet with a valid address
    const walletWithAddress = directSolanaWallets.find(
      (w) => w.address && w.address.length > 0,
    );
    return walletWithAddress || directSolanaWallets[0];
  }, [solanaReady, directSolanaWallets]);

  // Safe session refresh - doesn't block if Privy server is slow/unavailable
  const safeRefreshSession = useCallback(async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Session refresh timeout')),
          5000,
        ),
      );
      await Promise.race([getAccessToken(), timeoutPromise]);
    } catch (error) {
      console.warn(
        'Session refresh failed, proceeding with existing session:',
        error,
      );
    }
  }, [getAccessToken]);

  // Get wallet addresses
  const evmAddress = user?.wallet?.address;
  const solanaAddress = selectedSolanaWallet?.address;

  // Fetch user's tokens from multiple chains
  const {
    tokens,
    loading: tokensLoading,
    refetch: refetchTokens,
  } = useMultiChainTokenData(solanaAddress, evmAddress, [
    ...SUPPORTED_CHAINS,
  ]);

  const [step, setStep] = useState<DepositStep>('select');
  const [selectedToken, setSelectedToken] =
    useState<DepositToken | null>(null);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lifiQuote, setLifiQuote] = useState<LiFiQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedChainFilter, setSelectedChainFilter] =
    useState<string>('all');
  const [depositStatus, setDepositStatus] = useState<string>('');

  // Ref to track if a transaction is in progress (prevents reset during wallet popup)
  const isTransactionInProgress = useRef(false);

  // Filter tokens by chain and positive balance
  const filteredTokens = tokens.filter((t) => {
    const hasBalance = parseFloat(t.balance) > 0;
    const matchesChain =
      selectedChainFilter === 'all' ||
      t.chain.toUpperCase() === selectedChainFilter.toUpperCase();
    return hasBalance && matchesChain;
  });

  // Find USDC.e on Polygon in user's tokens
  const userUsdcE = tokens.find(
    (t) =>
      t.chain.toUpperCase() === 'POLYGON' &&
      t.address?.toLowerCase() === USDC_E_ADDRESS.toLowerCase(),
  );

  // Check if selected token is USDC.e on Polygon (direct transfer, no bridge needed)
  const isDirectUsdcE =
    selectedToken?.chain.toUpperCase() === 'POLYGON' &&
    selectedToken?.address?.toLowerCase() ===
      USDC_E_ADDRESS.toLowerCase();

  // Check if bridge/swap is needed
  const needsBridge = selectedToken && !isDirectUsdcE;

  // Debounced real-time quote fetching
  useEffect(() => {
    // Skip if direct USDC.e transfer (no quote needed)
    if (isDirectUsdcE) {
      return;
    }

    // Skip if no token selected or invalid amount
    if (
      !selectedToken ||
      !amount ||
      !safeAddress ||
      parseFloat(amount) <= 0 ||
      parseFloat(amount) > parseFloat(selectedToken.balance)
    ) {
      setLifiQuote(null);
      return;
    }

    // Debounce the quote fetch
    const debounceTimer = setTimeout(() => {
      fetchLifiQuote();
    }, 500);

    return () => {
      clearTimeout(debounceTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, selectedToken, safeAddress, isDirectUsdcE]);

  // Reset state when modal closes (but not during active transaction)
  useEffect(() => {
    if (!open && !isTransactionInProgress.current) {
      setStep('select');
      setSelectedToken(null);
      setAmount('');
      setTxHash(null);
      setError(null);
      setLifiQuote(null);
      setIsQuoteLoading(false);
      setQuoteError(null);
      setSelectedChainFilter('all');
      setDepositStatus('');
    }
  }, [open]);

  const handleSelectToken = (token: DepositToken) => {
    setSelectedToken(token);
    setAmount('');
    setLifiQuote(null);
    setQuoteError(null);
    setStep('amount');
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    const sanitized = value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    setAmount(sanitized);
    // Clear existing quote when amount changes
    setLifiQuote(null);
    setQuoteError(null);
  };

  const handleMaxAmount = () => {
    if (selectedToken) {
      setAmount(selectedToken.balance);
      setLifiQuote(null);
      setQuoteError(null);
    }
  };

  // Fetch LiFi quote for bridge/swap
  const fetchLifiQuote = useCallback(async () => {
    if (
      !selectedToken ||
      !amount ||
      !safeAddress ||
      parseFloat(amount) <= 0
    ) {
      return;
    }

    // Skip quote for direct USDC.e transfer on Polygon
    if (isDirectUsdcE) {
      return;
    }

    setIsQuoteLoading(true);
    setQuoteError(null);
    setLifiQuote(null);

    try {
      const fromChainId =
        CHAIN_CONFIG[selectedToken.chain.toUpperCase()]?.id;
      if (!fromChainId) {
        throw new Error('Unsupported chain');
      }

      const fromAmount = formatTokenAmount(
        amount,
        selectedToken.decimals || 6,
      );

      if (fromAmount === '0') {
        throw new Error(
          `Invalid amount: "${amount}" could not be parsed with ${selectedToken.decimals} decimals`,
        );
      }

      const fromTokenAddress = getTokenAddressForLifi(selectedToken);

      // Determine the wallet address based on chain
      const fromWalletAddress =
        selectedToken.chain.toUpperCase() === 'SOLANA'
          ? solanaAddress
          : evmAddress;

      if (!fromWalletAddress) {
        throw new Error('Wallet address not available');
      }

      const result = await getLifiDepositQuote({
        fromChain: fromChainId,
        toChain: POLYGON_CHAIN_ID,
        fromToken: fromTokenAddress,
        toToken: USDC_E_ADDRESS,
        fromAddress: fromWalletAddress,
        toAddress: safeAddress,
        fromAmount: fromAmount,
        slippage: '0.01',
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setLifiQuote(result.data);
    } catch (err: any) {
      console.error('Error getting LiFi quote:', err);
      setQuoteError(err.message || 'Failed to get quote');
    } finally {
      setIsQuoteLoading(false);
    }
  }, [
    selectedToken,
    amount,
    safeAddress,
    solanaAddress,
    evmAddress,
    isDirectUsdcE,
  ]);

  // Execute direct USDC.e transfer on Polygon with gas sponsorship
  const executeDirectTransfer = async () => {
    if (!eoaAddress || !safeAddress) {
      throw new Error('Wallet not ready');
    }

    await switchToPolygon();

    const amountInWei = parseUnits(amount, USDC_E_DECIMALS);

    // Encode the transfer function call
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [safeAddress as `0x${string}`, amountInWei],
    });

    // Use Privy's sendTransaction with gas sponsorship and fallback
    let hash: string;
    try {
      const result = await sendTransaction(
        {
          to: USDC_E_ADDRESS as `0x${string}`,
          data,
          chainId: polygon.id,
        },
        {
          sponsor: true,
        },
      );
      hash = result.hash;
    } catch (sponsorError: any) {
      const errorMessage =
        sponsorError?.message || sponsorError?.toString() || '';
      const isUserRejection =
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('user rejected');

      if (isUserRejection) {
        throw sponsorError;
      }

      console.warn(
        'Sponsored transfer failed, retrying without sponsorship:',
        errorMessage,
      );
      setDepositStatus('Retrying transfer...');
      const result = await sendTransaction({
        to: USDC_E_ADDRESS as `0x${string}`,
        data,
        chainId: polygon.id,
      });
      hash = result.hash;
    }

    return hash;
  };

  // Execute LiFi swap/bridge for EVM chains with gas sponsorship
  const executeLifiEvmSwap = async () => {
    if (!lifiQuote) {
      throw new Error('No quote available');
    }

    const wallet = wallets.find(
      (w) => w.address?.toLowerCase() === evmAddress?.toLowerCase(),
    );

    if (!wallet) {
      throw new Error('EVM wallet not found');
    }

    // Switch to the source chain
    const sourceChainIdStr =
      CHAIN_CONFIG[selectedToken!.chain.toUpperCase()].id;
    const sourceChainId = parseInt(sourceChainIdStr);
    const currentChainId = wallet.chainId;
    if (currentChainId !== `eip155:${sourceChainId}`) {
      await wallet.switchChain(sourceChainId);
    }

    // Create a public client for the SOURCE chain (not Polygon) for allowance/receipt reads
    const sourcePublicClient =
      sourceChainId === polygon.id
        ? publicClient
        : getPublicClientForChain(sourceChainIdStr);

    if (!sourcePublicClient) {
      throw new Error(
        `Unsupported source chain: ${selectedToken!.chain}`,
      );
    }

    const { transactionRequest, estimate } = lifiQuote;

    // Check if token approval is needed (for non-native tokens)
    const fromTokenAddress = getTokenAddressForLifi(selectedToken!);
    const isNativeToken =
      fromTokenAddress ===
      '0x0000000000000000000000000000000000000000';

    if (!isNativeToken && estimate.approvalAddress) {
      setDepositStatus('Checking token approval...');

      const fromAmount = formatTokenAmount(
        amount,
        selectedToken!.decimals || 6,
      );

      // Read current allowance using the SOURCE chain's public client
      const currentAllowance = await sourcePublicClient.readContract({
        address: fromTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [
          evmAddress as `0x${string}`,
          estimate.approvalAddress as `0x${string}`,
        ],
      });

      const requiredAmount = BigInt(fromAmount);

      // If allowance is insufficient, request approval
      if (currentAllowance < requiredAmount) {
        setDepositStatus('Requesting token approval...');

        // Encode approve function call for max uint256 to avoid future approvals
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [
            estimate.approvalAddress as `0x${string}`,
            BigInt(
              '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            ),
          ],
        });

        // Send approval transaction with sponsorship fallback
        let approvalHash: string;
        try {
          const result = await sendTransaction(
            {
              to: fromTokenAddress as `0x${string}`,
              data: approveData,
              chainId: sourceChainId,
            },
            {
              sponsor: true,
            },
          );
          approvalHash = result.hash;
        } catch (sponsorError: any) {
          console.warn(
            'Sponsored approval failed, retrying without sponsorship:',
            sponsorError?.message,
          );
          setDepositStatus('Retrying approval...');
          const result = await sendTransaction({
            to: fromTokenAddress as `0x${string}`,
            data: approveData,
            chainId: sourceChainId,
          });
          approvalHash = result.hash;
        }

        console.log('Approval tx hash:', approvalHash);
        setDepositStatus('Waiting for approval confirmation...');

        // Wait for approval on the SOURCE chain
        await sourcePublicClient.waitForTransactionReceipt({
          hash: approvalHash as `0x${string}`,
        });

        console.log('Approval confirmed');
      }
    }

    setDepositStatus('Waiting for transaction approval...');

    // Parse transaction value safely (handles both decimal and hex strings)
    let txValue = BigInt(0);
    if (transactionRequest.value) {
      try {
        txValue = BigInt(transactionRequest.value);
      } catch {
        txValue = BigInt(0);
      }
    }

    // Use Privy's sendTransaction with gas sponsorship and fallback
    let hash: string;
    try {
      const result = await sendTransaction(
        {
          to: transactionRequest.to as `0x${string}`,
          data: transactionRequest.data as `0x${string}`,
          value: txValue,
          chainId: sourceChainId,
        },
        {
          sponsor: true,
        },
      );
      hash = result.hash;
    } catch (sponsorError: any) {
      const errorMessage =
        sponsorError?.message || sponsorError?.toString() || '';
      const isUserRejection =
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('user rejected');

      // Don't retry if user rejected the transaction
      if (isUserRejection) {
        throw sponsorError;
      }

      console.warn(
        'Sponsored transaction failed, retrying without sponsorship:',
        errorMessage,
      );
      setDepositStatus('Retrying transaction...');
      const result = await sendTransaction({
        to: transactionRequest.to as `0x${string}`,
        data: transactionRequest.data as `0x${string}`,
        value: txValue,
        chainId: sourceChainId,
      });
      hash = result.hash;
    }

    // Wait for the source chain transaction to be confirmed
    setDepositStatus('Waiting for confirmation...');
    try {
      await sourcePublicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });
    } catch (receiptError) {
      console.warn(
        'Transaction receipt check failed (may still succeed):',
        receiptError,
      );
    }

    return hash;
  };

  // Execute LiFi swap/bridge for Solana with gas sponsorship
  const executeLifiSolanaSwap = async () => {
    if (!lifiQuote || !signAndSendTransaction) {
      throw new Error('No quote available or wallet not ready');
    }

    if (!selectedSolanaWallet) {
      throw new Error('Solana wallet not connected');
    }

    const { transactionRequest } = lifiQuote;
    const rawTx =
      transactionRequest.transaction || transactionRequest.data;
    if (!rawTx) {
      throw new Error('No transaction data in LiFi quote');
    }

    setDepositStatus('Preparing transaction...');

    const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!solanaRpcUrl) {
      throw new Error('No Solana RPC URL configured');
    }

    const connection = new Connection(solanaRpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });

    // Ensure required token accounts (ATAs) exist before executing LiFi transaction.
    // LiFi assumes ATAs already exist; for SOL swaps, the WSOL ATA is often missing.
    const walletPubkey = new PublicKey(selectedSolanaWallet.address);
    const tokenAddress = getTokenAddressForLifi(selectedToken!);
    const tokenMint = new PublicKey(tokenAddress);

    setDepositStatus('Checking token accounts...');

    // const ata = await getAssociatedTokenAddress(
    //   tokenMint,
    //   walletPubkey,
    //   false,
    //   TOKEN_PROGRAM_ID,
    // );

    // const ataInfo = await connection.getAccountInfo(ata);

    // if (!ataInfo) {
    //   setDepositStatus('Creating token account...');

    //   const createAtaTx = new Transaction().add(
    //     createAssociatedTokenAccountInstruction(
    //       walletPubkey,
    //       ata,
    //       walletPubkey,
    //       tokenMint,
    //       TOKEN_PROGRAM_ID,
    //     ),
    //   );

    //   const { blockhash: ataBlockhash } =
    //     await connection.getLatestBlockhash('confirmed');
    //   createAtaTx.recentBlockhash = ataBlockhash;
    //   createAtaTx.feePayer = walletPubkey;

    //   const serializedAtaTx = new Uint8Array(
    //     createAtaTx.serialize({
    //       requireAllSignatures: false,
    //       verifySignatures: false,
    //     }),
    //   );

    //   await safeRefreshSession();

    //   let ataSig: string;
    //   try {
    //     const ataResult = await signAndSendTransaction({
    //       transaction: serializedAtaTx,
    //       wallet: selectedSolanaWallet,
    //       options: { sponsor: true },
    //     });
    //     ataSig = bs58.encode(ataResult.signature);
    //   } catch (ataError: any) {
    //     console.log('fallback to non-sponsored', ataError);
    //     // Fallback to non-sponsored if sponsorship fails
    //     const ataResult = await signAndSendTransaction({
    //       transaction: serializedAtaTx,
    //       wallet: selectedSolanaWallet,
    //     });
    //     ataSig = bs58.encode(ataResult.signature);
    //   }

    //   await connection.confirmTransaction(ataSig, 'confirmed');
    //   console.log('ATA created:', ata.toBase58());
    // }

    // Decode the transaction
    const txBuffer = Buffer.from(rawTx, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // Get fresh blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed');
    transaction.message.recentBlockhash = blockhash;

    setDepositStatus('Waiting for signature...');

    // Refresh Privy session before signing to prevent timeout
    await safeRefreshSession();

    const serializedTransaction = new Uint8Array(
      transaction.serialize(),
    );
    let signatureString: string;

    // LiFi bridge transactions on Solana are often too large for sponsorship
    // (sponsorship wraps the tx with extra data, exceeding the 1232-byte limit).
    // Try sponsored first; fall back to non-sponsored on size or abort errors.
    try {
      const result = await signAndSendTransaction({
        transaction: serializedTransaction,
        wallet: selectedSolanaWallet,
        options: {
          sponsor: true,
        },
      });
      signatureString = bs58.encode(result.signature);
    } catch (sponsorError: any) {
      console.warn('Sponsored Solana tx failed:', sponsorError);
      const errorMessage =
        sponsorError?.message || sponsorError?.toString() || '';

      // Don't retry if user rejected
      const isUserRejection =
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('user rejected');
      if (isUserRejection) {
        throw sponsorError;
      }

      const isAbortError =
        sponsorError?.name === 'AbortError' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('AbortError');
      const isTooLarge =
        errorMessage.includes('too large') ||
        errorMessage.includes('Transaction too large');

      if (isAbortError || isTooLarge) {
        console.warn(
          `Sponsored transaction failed (${isTooLarge ? 'too large' : 'aborted'}), retrying without sponsorship...`,
        );
        setDepositStatus('Retrying transaction...');
        await safeRefreshSession();
        const result = await signAndSendTransaction({
          transaction: serializedTransaction,
          wallet: selectedSolanaWallet,
        });
        signatureString = bs58.encode(result.signature);
      } else {
        // For any other sponsorship error, also try without sponsorship
        console.warn(
          'Sponsored transaction failed with unexpected error, retrying without sponsorship...',
        );
        setDepositStatus('Retrying transaction...');
        await safeRefreshSession();
        try {
          const result = await signAndSendTransaction({
            transaction: serializedTransaction,
            wallet: selectedSolanaWallet,
          });
          signatureString = bs58.encode(result.signature);
        } catch (fallbackError) {
          // If fallback also fails, throw the original error for clarity
          throw sponsorError;
        }
      }
    }

    setDepositStatus('Waiting for confirmation...');

    // Wait a bit for the transaction to propagate
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check transaction status
    try {
      await connection.confirmTransaction(
        {
          signature: signatureString,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed',
      );
    } catch (confirmError) {
      console.warn(
        'Transaction confirmation check failed:',
        confirmError,
      );
    }

    return signatureString;
  };

  // Main deposit handler
  const handleDeposit = async () => {
    if (!selectedToken || !amount || !safeAddress) {
      setError('Missing required data for deposit');
      return;
    }

    if (needsBridge && !lifiQuote) {
      setError('Please get a quote first');
      return;
    }

    // Mark transaction as in progress to prevent state reset during wallet popup
    isTransactionInProgress.current = true;

    setStep('processing');
    setError(null);
    setDepositStatus('Initiating deposit...');

    try {
      let hash: string;

      if (isDirectUsdcE) {
        // Direct USDC.e transfer on Polygon
        setDepositStatus('Transferring USDC.e...');
        hash = await executeDirectTransfer();
      } else if (selectedToken.chain.toUpperCase() === 'SOLANA') {
        // LiFi bridge from Solana
        hash = await executeLifiSolanaSwap();
      } else {
        // LiFi bridge from EVM chains
        hash = await executeLifiEvmSwap();
      }

      setTxHash(hash);
      setDepositStatus('Waiting for confirmation...');

      // For direct USDC.e transfer on Polygon, wait for receipt on Polygon
      // (LiFi EVM swaps already wait for source chain receipt in executeLifiEvmSwap)
      if (
        selectedToken.chain.toUpperCase() !== 'SOLANA' &&
        isDirectUsdcE
      ) {
        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });
      }

      // Transaction complete - clear the in-progress flag and show success
      isTransactionInProgress.current = false;
      setStep('success');
    } catch (err: any) {
      console.error('Deposit error:', err);
      // Transaction failed - clear the in-progress flag and show error
      isTransactionInProgress.current = false;

      // Parse user-friendly error messages
      const rawMessage = err.message || 'Failed to complete deposit';
      let userMessage = rawMessage;
      if (
        rawMessage.includes('rejected') ||
        rawMessage.includes('denied') ||
        rawMessage.includes('user rejected')
      ) {
        userMessage = 'Transaction was rejected. Please try again.';
      } else if (rawMessage.includes('insufficient funds')) {
        userMessage =
          'Insufficient funds for gas fees. Please add funds to your wallet.';
      } else if (rawMessage.includes('timeout')) {
        userMessage =
          'Transaction timed out. Please check your wallet and try again.';
      }

      setError(userMessage);
      setStep('error');
    }
  };

  // Get explorer URL based on chain
  const getExplorerUrl = (chain: string, hash: string): string => {
    const explorers: Record<string, string> = {
      SOLANA: `https://solscan.io/tx/${hash}`,
      ETHEREUM: `https://etherscan.io/tx/${hash}`,
      POLYGON: `https://polygonscan.com/tx/${hash}`,
      BASE: `https://basescan.org/tx/${hash}`,
    };
    return (
      explorers[chain.toUpperCase()] ||
      `https://polygonscan.com/tx/${hash}`
    );
  };

  const renderTokenSelector = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 text-center">
        Select a token from any chain to deposit as USDC.e
      </p>

      {/* Chain Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedChainFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedChainFilter === 'all'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Chains
        </button>
        {SUPPORTED_CHAINS.map((chain) => (
          <button
            key={chain}
            onClick={() => setSelectedChainFilter(chain)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedChainFilter === chain
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {CHAIN_CONFIG[chain]?.icon && (
              <Image
                src={CHAIN_CONFIG[chain].icon}
                alt={chain}
                width={14}
                height={14}
                className="rounded-full"
              />
            )}
            {CHAIN_CONFIG[chain]?.name || chain}
          </button>
        ))}
      </div>

      {tokensLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tokens found</p>
          <p className="text-gray-400 text-xs mt-1">
            {selectedChainFilter === 'all'
              ? 'Connect your wallet to see tokens'
              : `No tokens found on ${CHAIN_CONFIG[selectedChainFilter]?.name || selectedChainFilter}`}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {/* Prioritize USDC.e on Polygon */}
          {userUsdcE &&
            (selectedChainFilter === 'all' ||
              selectedChainFilter === 'POLYGON') && (
              <button
                onClick={() => handleSelectToken(userUsdcE)}
                className="w-full p-3 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-between hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">
                        $
                      </span>
                    </div>
                    <Image
                      src={CHAIN_CONFIG.POLYGON.icon}
                      alt="Polygon"
                      width={16}
                      height={16}
                      className="absolute -bottom-1 -right-1 rounded-full border border-white"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {userUsdcE.symbol}
                    </p>
                    <p className="text-xs text-green-600">
                      Direct deposit (no fees)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {parseFloat(userUsdcE.balance).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    $
                    {(
                      parseFloat(userUsdcE.balance) *
                      parseFloat(userUsdcE.marketData?.price || '1')
                    ).toFixed(2)}
                  </p>
                </div>
              </button>
            )}

          {/* Other tokens - grouped by chain */}
          {filteredTokens
            .filter(
              (t) =>
                !(
                  t.chain.toUpperCase() === 'POLYGON' &&
                  t.address?.toLowerCase() ===
                    USDC_E_ADDRESS.toLowerCase()
                ),
            )
            .map((token) => (
              <button
                key={`${token.chain}-${token.symbol}-${token.address}`}
                onClick={() => handleSelectToken(token)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {token.logoURI ? (
                      <Image
                        src={token.logoURI}
                        alt={token.symbol}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-bold text-sm">
                          {token.symbol.slice(0, 2)}
                        </span>
                      </div>
                    )}
                    {/* Chain indicator */}
                    {CHAIN_CONFIG[token.chain.toUpperCase()]
                      ?.icon && (
                      <Image
                        src={
                          CHAIN_CONFIG[token.chain.toUpperCase()].icon
                        }
                        alt={token.chain}
                        width={16}
                        height={16}
                        className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white"
                      />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {token.symbol}
                    </p>
                    <p className="text-xs text-gray-500">
                      {token.chain.toUpperCase() === 'POLYGON'
                        ? token.name
                        : `${token.name} (${CHAIN_CONFIG[token.chain.toUpperCase()]?.name || token.chain})`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {parseFloat(token.balance).toFixed(4)}
                  </p>
                  {token.marketData?.price && (
                    <p className="text-xs text-gray-500">
                      $
                      {(
                        parseFloat(token.balance) *
                        parseFloat(token.marketData.price)
                      ).toFixed(2)}
                    </p>
                  )}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );

  const renderAmountInput = () => {
    const canDeposit =
      amount &&
      parseFloat(amount) > 0 &&
      parseFloat(amount) <= parseFloat(selectedToken?.balance || '0');
    const hasValidQuote = needsBridge && lifiQuote;
    const isLoadingQuote =
      needsBridge && canDeposit && isQuoteLoading;

    return (
      <div className="space-y-4">
        {/* Selected Token */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedToken?.logoURI ? (
                  <Image
                    src={selectedToken.logoURI}
                    alt={selectedToken.symbol}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">$</span>
                  </div>
                )}
                {selectedToken &&
                  CHAIN_CONFIG[selectedToken.chain.toUpperCase()]
                    ?.icon && (
                    <Image
                      src={
                        CHAIN_CONFIG[
                          selectedToken.chain.toUpperCase()
                        ].icon
                      }
                      alt={selectedToken.chain}
                      width={16}
                      height={16}
                      className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white"
                    />
                  )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedToken?.symbol}
                </p>
                <p className="text-xs text-gray-500">
                  Balance:{' '}
                  {parseFloat(selectedToken?.balance || '0').toFixed(
                    4,
                  )}{' '}
                  on{' '}
                  {CHAIN_CONFIG[
                    selectedToken?.chain.toUpperCase() || ''
                  ]?.name || selectedToken?.chain}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setStep('select');
                setLifiQuote(null);
                setQuoteError(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Change
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Amount
            </label>
            <button
              onClick={handleMaxAmount}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              MAX
            </button>
          </div>
          <Input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className="text-2xl font-medium h-14 text-center"
          />
          {selectedToken?.marketData?.price && amount && (
            <p className="text-center text-sm text-gray-500">
              ≈ $
              {(
                parseFloat(amount || '0') *
                parseFloat(selectedToken.marketData.price)
              ).toFixed(2)}
            </p>
          )}
        </div>

        {/* Bridge/Swap Notice */}
        {needsBridge && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ArrowUpDown className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  {selectedToken?.chain.toUpperCase() !== 'POLYGON'
                    ? 'Bridge & Swap'
                    : 'Swap'}{' '}
                  Required
                </p>
                <p className="text-xs text-yellow-600">
                  Your {selectedToken?.symbol} on{' '}
                  {
                    CHAIN_CONFIG[
                      selectedToken?.chain.toUpperCase() || ''
                    ]?.name
                  }{' '}
                  will be bridged to USDC.e on Polygon
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quote Loading Indicator */}
        {isLoadingQuote && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-800">
                Fetching best route...
              </p>
            </div>
          </div>
        )}

        {/* LiFi Quote Display */}
        {!isLoadingQuote && hasValidQuote && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-800 font-medium">
                You will receive
              </p>
              <button
                onClick={fetchLifiQuote}
                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                disabled={isQuoteLoading}
              >
                <RefreshCw
                  className={`w-3 h-3 ${isQuoteLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>
            <p className="text-lg font-semibold text-green-900">
              ~
              {formatUnits(
                BigInt(lifiQuote.estimate.toAmount),
                USDC_E_DECIMALS,
              )}{' '}
              USDC.e
            </p>
            <p className="text-xs text-green-600 mt-1">
              Min:{' '}
              {formatUnits(
                BigInt(lifiQuote.estimate.toAmountMin),
                USDC_E_DECIMALS,
              )}{' '}
              USDC.e (with slippage)
            </p>
            {lifiQuote.estimate.executionDuration && (
              <p className="text-xs text-green-600 mt-1">
                Estimated time: ~
                {Math.ceil(lifiQuote.estimate.executionDuration / 60)}{' '}
                min
              </p>
            )}
          </div>
        )}

        {/* Quote Error */}
        {!isLoadingQuote && quoteError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600">{quoteError}</p>
            </div>
          </div>
        )}

        {/* Direct Transfer Notice */}
        {isDirectUsdcE && canDeposit && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-green-800 font-medium">
                  Direct Transfer
                </p>
                <p className="text-xs text-green-600">
                  No bridge fees. Your USDC.e will be transferred
                  directly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Destination */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Depositing to</p>
          <p className="text-sm font-mono text-gray-900">
            {safeAddress
              ? `${safeAddress.slice(0, 10)}...${safeAddress.slice(-8)}`
              : '...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Polymarket Trading Wallet (Polygon)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setStep('select');
              setLifiQuote(null);
              setQuoteError(null);
            }}
          >
            Back
          </Button>

          {/* Show loading state while fetching quote */}
          {isLoadingQuote && (
            <Button
              className="flex-1 bg-gray-400 text-white cursor-not-allowed"
              disabled
            >
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Getting Quote...
            </Button>
          )}

          {/* Show Deposit button for direct transfers or when quote is available */}
          {!isLoadingQuote && (isDirectUsdcE || hasValidQuote) && (
            <Button
              className="flex-1 bg-black text-white hover:bg-gray-800"
              onClick={handleDeposit}
              disabled={!canDeposit}
            >
              {isDirectUsdcE ? 'Deposit' : 'Bridge & Deposit'}
            </Button>
          )}

          {/* Show retry button if quote failed */}
          {!isLoadingQuote && quoteError && (
            <Button
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              onClick={fetchLifiQuote}
              disabled={!canDeposit || isQuoteLoading}
            >
              Retry Quote
            </Button>
          )}

          {/* Show waiting state when amount is valid but no quote yet and not loading */}
          {!isLoadingQuote &&
            !isDirectUsdcE &&
            !hasValidQuote &&
            !quoteError &&
            canDeposit && (
              <Button
                className="flex-1 bg-gray-300 text-gray-500 cursor-not-allowed"
                disabled
              >
                Enter amount for quote
              </Button>
            )}
        </div>
      </div>
    );
  };

  const renderProcessing = () => (
    <div className="flex flex-col items-center py-8">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-lg font-medium text-gray-900 mb-2">
        {needsBridge ? 'Bridging & Depositing' : 'Processing Deposit'}
      </p>
      <p className="text-sm text-gray-500 text-center">
        {depositStatus || 'Transferring to trading wallet...'}
      </p>
      {needsBridge && !isDirectUsdcE && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Cross-chain transactions may take a few minutes
        </p>
      )}
      {txHash && selectedToken && (
        <a
          href={getExplorerUrl(selectedToken.chain, txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 mt-4"
        >
          View on{' '}
          {selectedToken.chain.toUpperCase() === 'SOLANA'
            ? 'Solscan'
            : selectedToken.chain.toUpperCase() === 'ETHEREUM'
              ? 'Etherscan'
              : selectedToken.chain.toUpperCase() === 'BASE'
                ? 'Basescan'
                : 'Polygonscan'}
        </a>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <p className="text-lg font-medium text-gray-900 mb-2">
        {needsBridge ? 'Bridge Initiated!' : 'Deposit Complete!'}
      </p>
      <p className="text-sm text-gray-500 text-center mb-4">
        {needsBridge
          ? 'Your funds are being bridged to your trading wallet. This may take a few minutes.'
          : 'Your funds have been deposited to your trading wallet'}
      </p>
      {txHash && selectedToken && (
        <a
          href={getExplorerUrl(selectedToken.chain, txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          View transaction
        </a>
      )}
      <Button
        className="w-full bg-black text-white hover:bg-gray-800"
        onClick={() => {
          onOpenChange(false);
          // Trigger a token refresh after successful deposit
          refetchTokens();
        }}
      >
        Done
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center py-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <p className="text-lg font-medium text-gray-900 mb-2">
        Deposit Failed
      </p>
      <p className="text-sm text-red-600 text-center mb-4">{error}</p>
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 bg-black text-white hover:bg-gray-800"
          onClick={() => setStep('amount')}
        >
          Try Again
        </Button>
      </div>
    </div>
  );

  const modalTitle =
    step === 'select'
      ? 'Deposit to Trading Wallet'
      : step === 'amount'
        ? 'Enter Amount'
        : step === 'processing'
          ? 'Processing'
          : step === 'success'
            ? 'Success'
            : 'Error';

  return (
    <CustomModal
      isOpen={open}
      onClose={step !== 'processing' ? () => onOpenChange(false) : undefined}
      title={modalTitle}
      width="max-w-md"
      removeCloseButton={step === 'processing'}
    >
      <div className="px-6 pb-6">
        {step === 'select' && renderTokenSelector()}
        {step === 'amount' && renderAmountInput()}
        {step === 'processing' && renderProcessing()}
        {step === 'success' && renderSuccess()}
        {step === 'error' && renderError()}
      </div>
    </CustomModal>
  );
}
