'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, Info, Settings } from 'lucide-react';
import Image from 'next/image';
import { chain, debounce } from 'lodash';
import {
  fetchTokensFromLiFi,
  getLifiQuote as fetchLifiQuote,
} from '@/actions/lifiForTokenSwap';
import {
  getJupiterQuote as fetchJupiterQuote,
  getJupiterSwapTransaction as fetchJupiterSwapTransaction,
} from '@/actions/jupiterSwap';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import {
  Connection,
  VersionedTransaction,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { saveSwapTransaction } from '@/actions/saveTransactionData';
import Cookies from 'js-cookie';
import { useNewSocketChat } from '@/lib/context/NewSocketChatContext';
import {
  getWalletNotificationService,
  formatUSDValue,
} from '@/lib/utils/walletNotifications';
import { useSearchParams } from 'next/navigation';
import bs58 from 'bs58';
import { notifySwapFee } from '@/actions/notifySwapFee';

const getChainIcon = (chainName: string) => {
  const chainIcons: Record<string, string> = {
    SOLANA: '/images/IconShop/solana@2x.png',
    ETHEREUM: '/images/IconShop/eTH@3x.png',
    BSC: '/images/IconShop/binance-smart-chain.png',
    POLYGON: '/images/IconShop/polygon.png',
    ARBITRUM: '/images/IconShop/arbitrum.png',
    BASE: 'https://www.base.org/document/safari-pinned-tab.svg',
  };
  return chainIcons[chainName.toUpperCase()] || null;
};

const getChainId = (chainName: string) => {
  // console.log("chaing name", chainName);

  const chainIds: Record<string, string> = {
    SOLANA: '1151111081099710',
    ETHEREUM: '1',
    BSC: '56',
    POLYGON: '137',
    ARBITRUM: '42161',
    BASE: '8453',
  };
  return chainIds[chainName.toUpperCase()] || '1';
};

const getExplorerUrl = (chainId: string, txHash: string): string => {
  const explorerUrls: Record<string, string> = {
    '1151111081099710': `https://solscan.io/tx/${txHash}`,
    '1': `https://etherscan.io/tx/${txHash}`,
    '56': `https://bscscan.com/tx/${txHash}`,
    '137': `https://polygonscan.com/tx/${txHash}`,
    '42161': `https://arbiscan.io/tx/${txHash}`,
    '8453': `https://basescan.org/tx/${txHash}`,
  };
  return explorerUrls[chainId] || `https://etherscan.io/tx/${txHash}`;
};

const PAY_CHAINS = [
  {
    id: 'all',
    name: 'All',
    fullName: 'All Chains',
    icon: null, // We'll handle this differently
  },
  {
    id: '1151111081099710',
    name: 'SOL',
    fullName: 'Solana',
    icon: '/images/IconShop/solana@2x.png',
  },
  {
    id: '1',
    name: 'ETH',
    fullName: 'Ethereum',
    icon: '/images/IconShop/outline-icons/light/ethereum-outline@3x.png',
  },
  {
    id: '137',
    name: 'POL',
    fullName: 'Polygon',
    icon: '/images/IconShop/polygon.png',
  },
  {
    id: '8453',
    name: 'BASE',
    fullName: 'Base',
    icon: 'https://www.base.org/document/safari-pinned-tab.svg',
  },
];

const RECEIVER_CHAINS = [
  {
    id: '1',
    name: 'ETH',
    fullName: 'Ethereum',
    icon: '/images/IconShop/outline-icons/light/ethereum-outline@3x.png',
  },
  {
    id: '1151111081099710',
    name: 'SOL',
    fullName: 'Solana',
    icon: '/images/IconShop/solana@2x.png',
  },
  {
    id: '137',
    name: 'POL',
    fullName: 'Polygon',
    icon: '/images/IconShop/polygon.png',
  },
  {
    id: '8453',
    name: 'BASE',
    fullName: 'Base',
    icon: 'https://www.base.org/document/safari-pinned-tab.svg',
  },
];
//custom error message
const formatUserFriendlyError = (error: string): string => {
  const lowerError = error.toLowerCase();

  // Network and connection errors
  if (
    lowerError.includes('network error') ||
    lowerError.includes('fetch failed') ||
    lowerError.includes('network request failed')
  ) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }

  if (
    lowerError.includes('timeout') ||
    lowerError.includes('request timeout')
  ) {
    return 'Request timed out. Please try again in a moment.';
  }

  // Wallet errors
  if (
    lowerError.includes('user rejected') ||
    lowerError.includes('rejected by user') ||
    lowerError.includes('user denied')
  ) {
    return 'Transaction was cancelled. Please try again when ready.';
  }

  if (
    lowerError.includes('insufficient funds') ||
    lowerError.includes('insufficient balance')
  ) {
    return 'Insufficient balance to complete this transaction.';
  }

  if (
    lowerError.includes('wallet not connected') ||
    lowerError.includes('no wallet')
  ) {
    return 'Please connect your wallet to continue.';
  }

  // Quote and routing errors
  if (
    lowerError.includes('route not found') ||
    lowerError.includes('no route found')
  ) {
    return 'No swap route available for this token pair. Try selecting different tokens.';
  }

  if (
    lowerError.includes('invalid token') ||
    lowerError.includes('token not found')
  ) {
    return 'Selected token is not supported. Please choose a different token.';
  }

  if (
    lowerError.includes('amount too small') ||
    lowerError.includes('minimum amount')
  ) {
    return 'Amount is too small. Please enter a larger amount.';
  }

  if (
    lowerError.includes('amount too large') ||
    lowerError.includes('maximum amount')
  ) {
    return 'Amount exceeds maximum limit. Please enter a smaller amount.';
  }

  if (
    lowerError.includes('slippage') ||
    lowerError.includes('price impact')
  ) {
    return 'Price impact is too high. Try adjusting slippage settings or reducing the amount.';
  }

  // API and rate limiting errors
  if (
    lowerError.includes('rate limit') ||
    lowerError.includes('too many requests')
  ) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (
    lowerError.includes('api error') ||
    lowerError.includes('service unavailable')
  ) {
    return 'Service temporarily unavailable. Please try again in a few moments.';
  }

  if (
    lowerError.includes('invalid parameters') ||
    lowerError.includes('bad request')
  ) {
    return 'Invalid request. Please check your inputs and try again.';
  }

  // Transaction errors
  if (
    lowerError.includes('transaction failed') ||
    lowerError.includes('tx failed')
  ) {
    return 'Transaction failed. Please try again with adjusted settings.';
  }

  if (lowerError.includes('gas') && lowerError.includes('limit')) {
    return 'Transaction requires more gas. Please try again.';
  }

  if (
    lowerError.includes('nonce') ||
    lowerError.includes('replacement transaction')
  ) {
    return 'Transaction conflict detected. Please try again.';
  }

  // Jupiter specific errors
  if (
    lowerError.includes('jupiter') &&
    (lowerError.includes('quote') || lowerError.includes('swap'))
  ) {
    return 'Swap service temporarily unavailable. Please try again shortly.';
  }

  // LiFi specific errors
  if (lowerError.includes('lifi') || lowerError.includes('li.fi')) {
    return 'Cross-chain swap service unavailable. Please try again later.';
  }

  // Solana specific errors
  if (
    lowerError.includes('blockhash not found') ||
    lowerError.includes('recent blockhash')
  ) {
    return 'Network is busy. Please wait a moment and try again.';
  }

  if (
    lowerError.includes('account not found') ||
    lowerError.includes('invalid account')
  ) {
    return 'Account error. Please reconnect your wallet and try again.';
  }

  // Generic fallbacks for common patterns
  if (
    lowerError.includes('failed to fetch') ||
    lowerError.includes('fetch error')
  ) {
    return 'Unable to connect to swap service. Please check your connection and try again.';
  }

  if (
    lowerError.includes('unauthorized') ||
    lowerError.includes('forbidden')
  ) {
    return 'Access denied. Please reconnect your wallet and try again.';
  }

  if (
    lowerError.includes('not supported') ||
    lowerError.includes('unsupported')
  ) {
    return 'This operation is not supported. Please try a different token pair.';
  }

  // If no specific error pattern matches, return a generic professional message
  if (error.length > 100) {
    return 'Transaction failed. Please try again or contact support if the issue persists.';
  }

  // For shorter, more specific errors, clean them up but keep some detail
  return (
    error.charAt(0).toUpperCase() +
    error.slice(1).replace(/[._]/g, ' ')
  );
};

const NATIVE_TOKENS_AND_USDC = {
  // Ethereum
  '1': [
    {
      symbol: 'ETH',
    },
    {
      symbol: 'USDC',
    },
  ],
  // Solana
  '1151111081099710': [
    {
      symbol: 'SOL',
    },
    {
      symbol: 'USDC',
    },
  ],
  // Polygon
  '137': [
    {
      symbol: 'POL',
    },
    {
      symbol: 'USDC',
    },
  ],
  // Base
  '8453': [
    {
      symbol: 'ETH',
    },
    {
      symbol: 'USDC',
    },
  ],
};

export default function SwapTokenModal({
  tokens,
  token,
}: {
  tokens: any[];
  token?: any;
}) {
  // State management
  const [payToken, setPayToken] = useState<any>(
    token || tokens?.[0] || null
  );
  const [receiveToken, setReceiveToken] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selecting, setSelecting] = useState<
    'pay' | 'receive' | null
  >(null);
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [filteredReceivedTokens, setFilteredReceivedTokens] =
    useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [chainId, setChainId] = useState('1151111081099710');
  const [receiverChainId, setReceiverChainId] = useState('137');
  const [selectedReceiverChain, setSelectedReceiverChain] =
    useState('137');
  const [quote, setQuote] = useState<any>(null);
  const [jupiterQuote, setJupiterQuote] = useState<any>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippageSettings, setShowSlippageSettings] =
    useState(false);
  const [customSlippage, setCustomSlippage] = useState('');
  const [showSlippageModal, setShowSlippageModal] = useState(false);
  const [selectedPayChain, setSelectedPayChain] = useState('all');

  // New states for loading and auto-refresh
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteCountdown, setQuoteCountdown] = useState(10);
  const [lastQuoteTime, setLastQuoteTime] = useState<number | null>(
    null
  );

  const [accessToken, setAccessToken] = useState('');

  // Refs for intervals
  const quoteRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  const { wallets } = useWallets();
  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  // Use NewSocketChatContext for wallet notifications (where wallet handlers are registered)
  const { socket: chatSocket, isConnected: socketConnected } =
    useNewSocketChat();
  const socket = chatSocket; // This socket has wallet notification handlers registered

  const ethWallet = wallets[0]?.address;
  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    // Find the first wallet with a valid address
    const walletWithAddress = directSolanaWallets.find(
      (w) => w.address && w.address.length > 0
    );
    return walletWithAddress || directSolanaWallets[0];
  }, [solanaReady, directSolanaWallets]);

  const [fromWalletAddress, setFromWalletAddress] = useState(
    selectedSolanaWallet?.address || ''
  );
  const [toWalletAddress, setToWalletAddress] = useState(
    selectedSolanaWallet?.address || ''
  );

  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string | null>(null);

  const { user: PrivyUser, getAccessToken } = usePrivy();

  // Safe session refresh - doesn't block if Privy server is slow/unavailable
  const safeRefreshSession = useCallback(async () => {
    try {
      // Add a 5 second timeout to prevent blocking indefinitely
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session refresh timeout')), 5000)
      );
      await Promise.race([getAccessToken(), timeoutPromise]);
    } catch (error) {
      // Log but don't throw - the existing session might still be valid
      console.warn('Session refresh failed, proceeding with existing session:', error);
    }
  }, [getAccessToken]);

  const searchParams = useSearchParams();

  // Handle URL search params for pre-filled swap
  useEffect(() => {
    const inputTokenParam = searchParams?.get('inputToken');
    const outputTokenParam = searchParams?.get('outputToken');
    const amountParam = searchParams?.get('amount');

    if (tokens.length > 0) {
      // Find and set input token (pay token)
      if (inputTokenParam) {
        const foundPayToken = tokens.find(
          (token) =>
            token.symbol.toLowerCase() ===
            inputTokenParam.toLowerCase()
        );
        if (foundPayToken) {
          setPayToken(foundPayToken);
          setChainId(getChainId(foundPayToken.chain));
        }
      }

      // Find and set output token (receive token)
      if (outputTokenParam) {
        const foundReceiveToken = tokens.find(
          (token) =>
            token.symbol.toLowerCase() ===
            outputTokenParam.toLowerCase()
        );
        if (foundReceiveToken) {
          setReceiveToken(foundReceiveToken);
          // Set receiver chain based on the output token
          const receiveChainId = getChainId(foundReceiveToken.chain);
          setReceiverChainId(receiveChainId);
          setSelectedReceiverChain(receiveChainId);
        }
      }

      // Set amount if provided
      if (amountParam && !isNaN(parseFloat(amountParam))) {
        setPayAmount(amountParam);
      }
    }
  }, [searchParams, tokens]);

  // Add this helper function to filter tokens by chain
  const filterTokensByChain = (
    tokens: any[],
    chainFilter: string
  ) => {
    if (chainFilter === 'all') {
      return tokens;
    }

    return tokens.filter((token: any) => {
      const tokenChainId = getChainId(token.chain);
      return tokenChainId === chainFilter;
    });
  };

  // Add this function to handle pay chain selection
  const handlePayChainSelect = (chainId: string) => {
    setSelectedPayChain(chainId);
    setSearchQuery('');

    if (chainId === 'all') {
      setAvailableTokens(tokens);
    } else {
      const filteredTokens = filterTokensByChain(tokens, chainId);
      setAvailableTokens(filteredTokens);
    }
  };

  // Update the handlePayTokenSearch function
  const handlePayTokenSearch = (query: string) => {
    setIsLoadingTokens(true);
    try {
      let baseTokens = tokens;

      // First filter by selected chain
      if (selectedPayChain !== 'all') {
        baseTokens = filterTokensByChain(tokens, selectedPayChain);
      }

      // Then filter by search query
      const results = baseTokens.filter(
        (token: any) =>
          token.symbol.toLowerCase().includes(query.toLowerCase()) ||
          token.name.toLowerCase().includes(query.toLowerCase())
      );

      setAvailableTokens(results); // Show all results without slicing
    } catch (error) {
      console.error('Error filtering tokens:', error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Update the useEffect that sets available tokens for pay selection
  useEffect(() => {
    if (openDrawer && selecting === 'pay') {
      if (selectedPayChain === 'all') {
        setAvailableTokens(tokens); // Show all tokens without slicing
      } else {
        const filteredTokens = filterTokensByChain(
          tokens,
          selectedPayChain
        );
        setAvailableTokens(filteredTokens); // Show all filtered tokens
      }
    }
  }, [openDrawer, selecting, tokens, selectedPayChain]);

  //filter receive token
  useEffect(() => {
    if (receiverChainId === chainId) {
      setFilteredReceivedTokens(availableTokens);
    } else {
      setIsLoadingTokens(true);
      const symbols =
        NATIVE_TOKENS_AND_USDC[
          receiverChainId as keyof typeof NATIVE_TOKENS_AND_USDC
        ]; // e.g. [{symbol: "SOL"}, {symbol: "USDC"}]

      // console.log("symbols", symbols);

      // Extract the plain symbol strings into a Set for faster lookup
      const symbolSet = new Set(symbols.map((s) => s.symbol));

      // console.log("symbolSet", symbolSet);

      // Filter availableTokens where the symbol is in symbolSet
      const filtered = availableTokens.filter((avail) =>
        symbolSet.has(avail.symbol)
      );

      // console.log("filtered", filtered);

      setFilteredReceivedTokens(filtered);
      setIsLoadingTokens(false);
    }
  }, [chainId, receiverChainId, availableTokens]);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (quoteRefreshInterval.current) {
        clearInterval(quoteRefreshInterval.current);
      }
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  // Auto-refresh countdown timer
  useEffect(() => {
    if (lastQuoteTime && payAmount && payToken && receiveToken) {
      // Clear existing countdown interval
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }

      // Start countdown from 10 seconds
      setQuoteCountdown(10);

      countdownInterval.current = setInterval(() => {
        setQuoteCountdown((prev) => {
          if (prev <= 1) {
            // Time to refresh quote
            return 10;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
        }
      };
    } else {
      // Clear countdown if no active quote
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      setQuoteCountdown(10);
    }
  }, [lastQuoteTime, payAmount, payToken, receiveToken]);

  const formatTokenAmount = (
    amount: string | number,
    decimals: number | bigint
  ): string => {
    // always convert decimals to number
    const dec =
      typeof decimals === 'bigint' ? Number(decimals) : decimals;

    const [whole, fractionRaw = ''] = amount.toString().split('.');
    const fraction = fractionRaw.toString();

    const fractionPadded = (fraction + '0'.repeat(dec)).slice(0, dec);
    const raw = whole + fractionPadded;

    return BigInt(raw).toString();
  };

  const validateBalance = () => {
    if (!payToken?.balance || !payAmount)
      return { isValid: true, error: null };

    const balance = parseFloat(payToken.balance);
    const amount = parseFloat(payAmount);

    if (amount > balance) {
      return {
        isValid: false,
        error: `Insufficient balance. Available: ${balance.toFixed(
          6
        )} ${payToken.symbol}`,
      };
    }

    if (amount <= 0) {
      return {
        isValid: false,
        error: 'Amount must be greater than 0',
      };
    }

    return { isValid: true, error: null };
  };

  const isSolanaToSolanaSwap = () => {
    return (
      payToken?.chain?.toUpperCase() === 'SOLANA' &&
      (receiveToken?.chain?.toUpperCase() === 'SOLANA' ||
        receiverChainId === '1151111081099710')
    );
  };

  const getJupiterQuote = async () => {
    if (!payToken || !receiveToken || !payAmount) {
      throw new Error('Missing required parameters');
    }

    const getTokenMint = (token: any) => {
      if (token.symbol === 'SOL') {
        return 'So11111111111111111111111111111111111111112';
      }
      return token.address;
    };

    const inputMint = getTokenMint(payToken);
    const outputMint = getTokenMint(receiveToken);

    if (!inputMint || !outputMint) {
      throw new Error('Invalid token addresses');
    }

    const amountInSmallestUnit = formatTokenAmount(
      payAmount,
      payToken.decimals || 6
    );
    const slippageBps = Math.floor(slippage * 100);

    // Use server action to get Jupiter quote (API key is kept server-side)
    const result = await fetchJupiterQuote({
      inputMint,
      outputMint,
      amount: amountInSmallestUnit,
      slippageBps,
      platformFeeBps: 50,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get Jupiter quote');
    }

    return result.data;
  };

  const getJupiterSwapTransaction = async (quoteResponse: any) => {
    if (!selectedSolanaWallet?.address) {
      throw new Error('Solana wallet not connected');
    }

    // Get fee account for the input token mint from backend
    const inputMint = quoteResponse.inputMint;
    let feeAccount: string | undefined;

    try {
      const feeAccountResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/tokenAccount/${inputMint}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (feeAccountResponse.ok) {
        const feeAccountData = await feeAccountResponse.json();
        const tokenProgramId = feeAccountData.tokenProgramId;

        if (feeAccountData.tokenAccount) {
          // Verify the fee account is a valid token account on-chain
          const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

          if (rpcUrl) {
            const connection = new Connection(rpcUrl, {
              commitment: 'confirmed',
              confirmTransactionInitialTimeout: 60000,
            });
            const programId =
              tokenProgramId === TOKEN_2022_PROGRAM_ID.toString()
                ? TOKEN_2022_PROGRAM_ID
                : TOKEN_PROGRAM_ID;

            const feeAccountPubkey = new PublicKey(
              feeAccountData.tokenAccount
            );
            const accountInfo = await getAccount(
              connection,
              feeAccountPubkey,
              undefined,
              programId
            );

            if (accountInfo) {
              feeAccount = feeAccountData.tokenAccount;
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        'Fee account verification failed, proceeding without platform fee:',
        error
      );
    }

    // Use server action to get swap transaction (API key is kept server-side)
    const result = await fetchJupiterSwapTransaction({
      quoteResponse,
      userPublicKey: selectedSolanaWallet?.address,
      feeAccount,
    });

    if (!result.success) {
      throw new Error(
        result.error || 'Failed to get swap transaction'
      );
    }

    return result.data;
  };

  const getLifiQuote = async () => {
    const fromAmount = formatTokenAmount(
      payAmount,
      payToken.decimals || 6
    );

    if (fromAmount === '0' || !fromAmount) {
      throw new Error('Invalid amount');
    }

    let fromTokenAddress;
    if (chainId === '1151111081099710') {
      if (payToken?.symbol === 'SOL') {
        fromTokenAddress =
          'So11111111111111111111111111111111111111112';
      } else if (payToken?.address) {
        fromTokenAddress = payToken.address;
      } else {
        throw new Error('Invalid Solana token');
      }
    } else {
      if (payToken?.symbol === 'ETH' || payToken?.symbol === 'POL') {
        fromTokenAddress =
          '0x0000000000000000000000000000000000000000';
      } else if (payToken?.address) {
        fromTokenAddress = payToken.address;
      } else {
        throw new Error('Invalid EVM token');
      }
    }

    let toTokenAddress;
    if (receiverChainId === '1151111081099710') {
      if (receiveToken?.symbol === 'SOL') {
        toTokenAddress =
          'So11111111111111111111111111111111111111112';
      } else if (receiveToken?.address) {
        toTokenAddress = receiveToken.address;
      } else {
        throw new Error('Invalid Solana receive token');
      }
    } else {
      if (
        receiveToken?.symbol === 'ETH' ||
        receiveToken?.symbol === 'POL'
      ) {
        toTokenAddress = '0x0000000000000000000000000000000000000000';
      } else if (receiveToken?.address) {
        toTokenAddress = receiveToken.address;
      } else {
        throw new Error('Invalid EVM receive token');
      }
    }

    if (!fromWalletAddress || !toWalletAddress) {
      throw new Error('Wallet addresses not available');
    }

    // Use server action to get LiFi quote (API key is kept server-side)
    const result = await fetchLifiQuote({
      fromChain: chainId.toString(),
      toChain: receiverChainId.toString(),
      fromToken: fromTokenAddress,
      toToken: toTokenAddress,
      fromAddress: fromWalletAddress,
      toAddress: toWalletAddress,
      fromAmount,
      slippage: slippage / 100,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get LiFi quote');
    }

    return result.data;
  };

  // Updated fetchQuote function with loading state management
  const fetchQuote = useCallback(
    async (isAutoRefresh = false) => {
      if (
        !payAmount ||
        !payToken ||
        !receiveToken ||
        !fromWalletAddress ||
        !toWalletAddress
      ) {
        setQuote(null);
        setJupiterQuote(null);
        setLastQuoteTime(null);
        return;
      }

      try {
        // Set loading state
        setIsQuoteLoading(true);
        if (!isAutoRefresh) {
          setIsCalculating(true);
        }
        setSwapError(null);

        if (isSolanaToSolanaSwap()) {
          const jupiterQuote = await getJupiterQuote();
          setJupiterQuote(jupiterQuote);
          setQuote(null);
        } else {
          const lifiQuote = await getLifiQuote();
          setQuote(lifiQuote);
          setJupiterQuote(null);
        }

        // Set timestamp for auto-refresh
        setLastQuoteTime(Date.now());
      } catch (error: any) {
        console.error('Quote fetch error:', error);
        setQuote(null);
        setJupiterQuote(null);

        // Apply user-friendly error formatting
        const userFriendlyError = formatUserFriendlyError(
          error.message || error.toString() || 'Failed to get quote'
        );
        setSwapError(userFriendlyError);
        setLastQuoteTime(null);
      } finally {
        setIsQuoteLoading(false);
        setIsCalculating(false);
      }
    },
    [
      chainId,
      fromWalletAddress,
      payAmount,
      payToken,
      receiveToken,
      receiverChainId,
      toWalletAddress,
      slippage,
      isSolanaToSolanaSwap,
    ]
  );

  // Auto-refresh quote every 10 seconds
  useEffect(() => {
    if (quoteRefreshInterval.current) {
      clearInterval(quoteRefreshInterval.current);
    }

    if (lastQuoteTime && payAmount && payToken && receiveToken) {
      quoteRefreshInterval.current = setInterval(() => {
        fetchQuote(true); // Auto-refresh
      }, 10000);

      return () => {
        if (quoteRefreshInterval.current) {
          clearInterval(quoteRefreshInterval.current);
        }
      };
    }
  }, [lastQuoteTime, payAmount, payToken, receiveToken, fetchQuote]);

  // Main quote fetching effect - triggers on parameter changes
  useEffect(() => {
    // let timeoutId: NodeJS.Timeout;

    // Clear existing intervals when params change
    if (quoteRefreshInterval.current) {
      clearInterval(quoteRefreshInterval.current);
    }

    // Debounce quote fetching to avoid too many requests
    const timeoutId = setTimeout(() => {
      fetchQuote(false);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    chainId,
    fromWalletAddress,
    payAmount,
    payToken,
    receiveToken,
    receiverChainId,
    toWalletAddress,
    slippage, // This will trigger re-fetch when slippage changes
  ]);

  // Calculate receive amount from quote
  useEffect(() => {
    if ((quote || jupiterQuote) && receiveToken) {
      try {
        let toAmount;

        if (jupiterQuote) {
          toAmount = jupiterQuote.outAmount;
        } else if (quote) {
          toAmount = quote?.estimate?.toAmount || quote.toAmount;
        }

        if (toAmount && receiveToken.decimals) {
          const decimals = receiveToken.decimals;
          const readableAmount =
            Number(toAmount) / Math.pow(10, decimals);
          const formattedAmount = readableAmount
            .toFixed(8)
            .replace(/\.?0+$/, '');

          setReceiveAmount(formattedAmount);
        } else {
          setReceiveAmount('0');
        }
      } catch (error) {
        console.error(
          'Error calculating receive amount from quote:',
          error
        );
        setReceiveAmount('Error');
      }
    } else {
      setReceiveAmount('');
    }
  }, [quote, jupiterQuote, receiveToken]);

  // Execute swap functions remain the same...
  const executeCrossChainSwap = async () => {
    try {
      setIsSwapping(true);
      setSwapError(null);
      setTxHash(null);
      setSwapStatus('Preparing transaction...');

      const balanceCheck = validateBalance();
      if (!balanceCheck.isValid) {
        setSwapError(balanceCheck.error);
        setIsSwapping(false);
        return;
      }

      if (isSolanaToSolanaSwap()) {
        await executeJupiterSwap();
      } else {
        await executeLiFiSwap();
      }
    } catch (error: any) {
      console.error('Swap error:', error);

      // Apply user-friendly error formatting
      const userFriendlyError = formatUserFriendlyError(
        error.message || error.toString() || 'Swap failed'
      );

      setSwapError(userFriendlyError);
      setSwapStatus(null);
      setIsSwapping(false);
    }
  };

  const executeJupiterSwap = async () => {
    try {
      // Step 1: Validate prerequisites
      if (!jupiterQuote) {
        const errorMsg = 'No Jupiter quote available';
        setSwapError(errorMsg);
        setIsSwapping(false);
        return;
      }

      if (!solanaReady) {
        const errorMsg =
          'Solana wallet is not ready. Please wait and try again.';
        setSwapError(errorMsg);
        setIsSwapping(false);
        return;
      }

      if (!selectedSolanaWallet?.address) {
        const errorMsg = 'No Solana wallet connected';
        setSwapError(errorMsg);
        setIsSwapping(false);
        return;
      }

      const inputMint = jupiterQuote.inputMint;
      const outputMint = jupiterQuote.outputMint;

      // Step 3: Set up RPC connection first
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

      if (!rpcUrl) {
        throw new Error(
          'No Solana RPC URL configured in environment variables'
        );
      }

      const connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      });

      // Step 4: Ensure user has required token accounts (ATAs)
      setSwapStatus('Checking token accounts...');

      // Check and create ATAs if needed
      const walletPubkey = new PublicKey(
        selectedSolanaWallet?.address || ''
      );
      const inputMintPubkey = new PublicKey(inputMint);
      const outputMintPubkey = new PublicKey(outputMint);

      // Detect which token program each mint uses by checking the mint account owner
      // This approach is more reliable for Token-2022 tokens with extensions
      const detectTokenProgram = async (
        mintPubkey: typeof PublicKey.prototype
      ) => {
        try {
          const mintInfo = await connection.getAccountInfo(
            mintPubkey
          );

          if (!mintInfo) {
            console.warn(
              '⚠️ [SWAP] Mint account not found, defaulting to TOKEN_PROGRAM_ID'
            );
            return TOKEN_PROGRAM_ID;
          }

          // Check which program owns the mint account
          if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
            return TOKEN_2022_PROGRAM_ID;
          }

          return TOKEN_PROGRAM_ID;
        } catch (e) {
          console.error(
            '❌ [SWAP] Error detecting token program, defaulting to TOKEN_PROGRAM_ID:',
            e
          );
          return TOKEN_PROGRAM_ID;
        }
      };

      const [inputTokenProgram, outputTokenProgram] =
        await Promise.all([
          detectTokenProgram(inputMintPubkey),
          detectTokenProgram(outputMintPubkey),
        ]);

      // Get ATA addresses with correct token programs
      const inputATA = await getAssociatedTokenAddress(
        inputMintPubkey,
        walletPubkey,
        false,
        inputTokenProgram
      );
      const outputATA = await getAssociatedTokenAddress(
        outputMintPubkey,
        walletPubkey,
        false,
        outputTokenProgram
      );

      // Check if ATAs exist
      const [inputAccountInfo, outputAccountInfo] = await Promise.all(
        [
          connection.getAccountInfo(inputATA),
          connection.getAccountInfo(outputATA),
        ]
      );

      const needsInputATA = !inputAccountInfo;
      const needsOutputATA = !outputAccountInfo;

      // Create ATAs if needed
      if (needsInputATA || needsOutputATA) {
        console.log(
          '⚠️ [SWAP] Missing ATAs detected, creating them...'
        );
        setSwapStatus('Creating token accounts...');

        const transaction = new Transaction();

        if (needsInputATA) {
          console.log(
            '➕ [SWAP] Adding input ATA creation instruction',
            {
              tokenProgram: inputTokenProgram.toBase58(),
            }
          );
          transaction.add(
            createAssociatedTokenAccountInstruction(
              walletPubkey,
              inputATA,
              walletPubkey,
              inputMintPubkey,
              inputTokenProgram // Pass correct token program
            )
          );
        }

        if (needsOutputATA) {
          console.log(
            '➕ [SWAP] Adding output ATA creation instruction',
            {
              tokenProgram: outputTokenProgram.toBase58(),
            }
          );
          transaction.add(
            createAssociatedTokenAccountInstruction(
              walletPubkey,
              outputATA,
              walletPubkey,
              outputMintPubkey,
              outputTokenProgram // Pass correct token program
            )
          );
        }

        try {
          // Get recent blockhash and set fee payer for transaction structure
          // Note: feePayer is required for serialization, but Privy pays gas when sponsor: true
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = walletPubkey;

          // Sign and send using Privy signAndSendTransaction hook with gas sponsorship
          const serializedTx = new Uint8Array(
            transaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            })
          );

          // Refresh Privy session before signing to prevent timeout
          await safeRefreshSession();

          let signature: string;
          try {
            const result = await signAndSendTransaction({
              transaction: serializedTx,
              wallet: selectedSolanaWallet,
              options: {
                sponsor: true,
              },
            });
            signature = bs58.encode(result.signature);
          } catch (sponsorError: any) {
            // Check if it's an AbortError - fallback to non-sponsored transaction
            const errorMessage = sponsorError?.message || sponsorError?.toString() || '';
            const isAbortError =
              sponsorError?.name === 'AbortError' ||
              errorMessage.includes('aborted') ||
              errorMessage.includes('AbortError');

            if (isAbortError) {
              console.warn('Sponsored ATA creation aborted, retrying without sponsorship...');
              await safeRefreshSession();
              const result = await signAndSendTransaction({
                transaction: serializedTx,
                wallet: selectedSolanaWallet,
              });
              signature = bs58.encode(result.signature);
            } else {
              throw sponsorError;
            }
          }

          await connection.confirmTransaction(signature, 'confirmed');
        } catch (ataError: any) {
          throw new Error(
            `Failed to create token accounts: ${
              ataError.message || ataError
            }`
          );
        }
      }

      // Step 5: Get swap transaction from Jupiter
      setSwapStatus('Preparing swap transaction...');

      const swapData = await getJupiterSwapTransaction(jupiterQuote);

      if (!swapData?.swapTransaction) {
        throw new Error(
          'No swap transaction received from Jupiter API'
        );
      }

      // Step 6: Deserialize transaction
      const swapTransactionBuffer = Buffer.from(
        swapData.swapTransaction,
        'base64'
      );
      const transaction = VersionedTransaction.deserialize(
        swapTransactionBuffer
      );

      // Step 7: Sign and submit transaction using Privy hook
      let txId: string;
      const serializedTransaction = new Uint8Array(transaction.serialize());

      try {
        // Refresh Privy session before signing to prevent timeout
        await safeRefreshSession();

        // Try sponsored transaction first
        const result = await signAndSendTransaction({
          transaction: serializedTransaction,
          wallet: selectedSolanaWallet,
          options: {
            sponsor: true,
          },
        });

        // Convert signature bytes to base58 string
        txId = bs58.encode(result.signature);
      } catch (sponsorError: any) {
        // Check if it's an AbortError - fallback to non-sponsored transaction
        const errorMessage = sponsorError?.message || sponsorError?.toString() || '';
        const isAbortError =
          sponsorError?.name === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('AbortError');

        if (isAbortError) {
          console.warn('Sponsored transaction aborted, retrying without sponsorship...');
          setSwapStatus('Retrying transaction...');

          try {
            // Refresh session again before retry
            await safeRefreshSession();

            const result = await signAndSendTransaction({
              transaction: serializedTransaction,
              wallet: selectedSolanaWallet,
            });

            txId = bs58.encode(result.signature);
          } catch (retryError: any) {
            throw new Error(
              `Transaction failed: ${retryError.message || 'Unknown error'}`
            );
          }
        } else {
          throw new Error(
            `Sponsored transaction failed: ${
              sponsorError.message || 'Unknown error'
            }`
          );
        }
      }

      // Step 8: Transaction confirmation
      setTxHash(txId);
      setSwapStatus(
        'Transaction submitted! Waiting for confirmation...'
      );

      // Wait for transaction propagation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 9: Confirm transaction
      let isConfirmed = false;
      const confirmationRpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

      if (confirmationRpcUrl) {
        const confirmationConnection = new Connection(confirmationRpcUrl, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000,
        });

        try {
          await confirmationConnection.confirmTransaction(
            txId,
            'finalized'
          );
          isConfirmed = true;
          setSwapStatus('Transaction confirmed');
        } catch (confirmError: any) {
          setSwapStatus('Transaction submitted successfully');
        }
      } else {
        setSwapStatus('Transaction submitted successfully');
      }

      // Step 9.5: Notify backend after confirmation only
      if (isConfirmed) {
        if (!accessToken) {
          throw new Error(
            'Missing access token for backend notification'
          );
        }

        const inputPrice = Number(
          payToken?.price || payToken?.usdPrice || 0
        );
        const outputPrice = Number(
          receiveToken?.price || receiveToken?.usdPrice || 0
        );
        const inputUsdValue =
          inputPrice > 0
            ? (Number(payAmount || 0) * inputPrice).toFixed(6)
            : undefined;
        const outputUsdValue =
          outputPrice > 0
            ? (Number(receiveAmount || 0) * outputPrice).toFixed(6)
            : undefined;
        const priceImpactPct = jupiterQuote?.priceImpactPct
          ? (Number(jupiterQuote.priceImpactPct) * 100).toFixed(2)
          : undefined;
        const routeLabels = jupiterQuote?.routePlan
          ? Array.from(
              new Set(
                jupiterQuote.routePlan
                  .map((step: any) => step?.swapInfo?.label)
                  .filter(Boolean)
              )
            )
          : [];

        notifySwapFee(
          {
            txHash: txId,
            walletAddress: selectedSolanaWallet?.address,
            inputTokenSymbol: payToken?.symbol,
            inputAmount: payAmount,
            inputUsdValue,
            outputTokenSymbol: receiveToken?.symbol,
            outputAmount: receiveAmount,
            outputUsdValue,
          },
          accessToken
        );
      }

      // Step 10: Save to database
      saveSwapToDatabase(txId, jupiterQuote);
      setSwapStatus('Transaction confirmed');
    } catch (error: any) {
      // Apply user-friendly error formatting
      const userFriendlyError = formatUserFriendlyError(
        error?.message || error?.toString() || 'Swap failed'
      );
      setSwapError(userFriendlyError);
      setSwapStatus(null);
    } finally {
      setIsSwapping(false);
    }
  };

  const executeLiFiSwap = async () => {
    try {
      if (!quote) {
        setSwapError('No Li.Fi quote available');
        setIsSwapping(false);
        return;
      }

      const fromChainId = parseInt(chainId);

      if (fromChainId === 1151111081099710) {
        await executeSolanaSwap();
      } else {
        const allAccounts = PrivyUser?.linkedAccounts || [];
        const ethereumAccount = allAccounts.find(
          (account: any) =>
            account.chainType === 'ethereum' &&
            account.type === 'wallet' &&
            account.address
        );

        if (!ethereumAccount) {
          setSwapError('No Ethereum wallet connected');
          setIsSwapping(false);
          return;
        }

        const wallet = wallets.find(
          (w) =>
            w.address?.toLowerCase() ===
            (ethereumAccount as any).address.toLowerCase()
        );

        if (!wallet) {
          setSwapError('Wallet not found');
          setIsSwapping(false);
          return;
        }

        const provider = await wallet.getEthereumProvider();
        if (!provider) {
          setSwapError('Failed to get wallet provider');
          setIsSwapping(false);
          return;
        }

        setSwapStatus('Waiting for confirmation...');

        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [quote.transactionRequest],
        });

        setTxHash(txHash);
        setSwapStatus(
          'Transaction submitted! Waiting for confirmation...'
        );
        setSwapStatus('Swap completed successfully!');
        // Save to database
        await saveSwapToDatabase(txHash, quote);
      }
    } catch (error: any) {
      // Apply user-friendly error formatting
      const userFriendlyError = formatUserFriendlyError(
        error.message || error.toString() || 'Cross-chain swap failed'
      );
      setSwapError(userFriendlyError);

      // Send swap failed notification via Socket.IO
      if (socket && socket.connected) {
        try {
          const notificationService =
            getWalletNotificationService(socket);
          const fromChainId = parseInt(chainId);
          const networkName =
            fromChainId === 1151111081099710
              ? 'SOLANA'
              : fromChainId === 1
              ? 'ETHEREUM'
              : fromChainId === 137
              ? 'POLYGON'
              : fromChainId === 8453
              ? 'BASE'
              : 'Unknown';

          notificationService.emitSwapFailed({
            inputTokenSymbol: payToken?.symbol || 'Unknown',
            inputAmount: payAmount || '0',
            outputTokenSymbol: receiveToken?.symbol || 'Unknown',
            network: networkName,
            reason: userFriendlyError,
          });
        } catch (notifError) {}
      } else {
        console.warn(
          '⚠️ Socket not connected, swap failed notification not sent'
        );
      }

      throw new Error(userFriendlyError); // Re-throw with friendly message
    } finally {
      setIsSwapping(false);
    }
  };

  const executeSolanaSwap = async () => {
    try {
      if (!solanaReady) {
        setSwapError(
          'Solana wallet is not ready. Please wait and try again.'
        );
        setIsSwapping(false);
        return;
      }

      if (!selectedSolanaWallet?.address) {
        setSwapError('No Solana wallet connected');
        setIsSwapping(false);
        return;
      }

      const { transactionRequest } = quote;
      const rawTx =
        transactionRequest?.transaction || transactionRequest?.data;
      if (!rawTx) {
        throw new Error('No transactionRequest found in LiFi quote');
      }

      setSwapStatus('Submitting transaction...');

      // Set up RPC connection
      const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

      if (!solanaRpcUrl) {
        throw new Error('No Solana RPC URL configured');
      }

      const connection = new Connection(solanaRpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      });

      // Deserialize the LiFi transaction
      const swapTransactionBuffer = Buffer.from(rawTx, 'base64');
      const transaction = VersionedTransaction.deserialize(
        swapTransactionBuffer
      );

      // Get latest blockhash and update the transaction
      const { blockhash } = await connection.getLatestBlockhash();

      // Update transaction with fresh blockhash
      transaction.message.recentBlockhash = blockhash;

      // Sign and send the versioned transaction using Privy signAndSendTransaction hook with gas sponsorship
      setSwapStatus('Signing and sending sponsored transaction...');

      // Refresh Privy session before signing to prevent timeout
      await safeRefreshSession();

      const serializedTransaction = new Uint8Array(transaction.serialize());
      let signature: string;

      try {
        const result = await signAndSendTransaction({
          transaction: serializedTransaction,
          wallet: selectedSolanaWallet,
          options: {
            sponsor: true,
          },
        });
        signature = bs58.encode(result.signature);
      } catch (sponsorError: any) {
        // Check if it's an AbortError - fallback to non-sponsored transaction
        const errorMessage = sponsorError?.message || sponsorError?.toString() || '';
        const isAbortError =
          sponsorError?.name === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('AbortError');

        if (isAbortError) {
          console.warn('Sponsored transaction aborted, retrying without sponsorship...');
          setSwapStatus('Retrying transaction...');
          await safeRefreshSession();
          const result = await signAndSendTransaction({
            transaction: serializedTransaction,
            wallet: selectedSolanaWallet,
          });
          signature = bs58.encode(result.signature);
        } else {
          throw sponsorError;
        }
      }

      setTxHash(signature);
      setSwapStatus(
        'Transaction submitted! Waiting for confirmation...'
      );

      // Wait a bit for the transaction to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check transaction status
      try {
        await connection.confirmTransaction(signature, 'confirmed');
        setSwapStatus('Transaction confirmed');
      } catch (confirmError) {
        console.warn(
          'Transaction confirmation check failed:',
          confirmError
        );
        setSwapStatus('Transaction submitted successfully');
      }

      // Save to database after confirmation
      await saveSwapToDatabase(signature, quote);
    } catch (error: any) {
      // Apply user-friendly error formatting
      const userFriendlyError = formatUserFriendlyError(
        error?.message || error?.toString() || 'Transaction failed'
      );
      setSwapError(userFriendlyError);
    } finally {
      setIsSwapping(false);
    }
  };

  useEffect(() => {
    setSwapError(null);
    setSwapStatus(null);
  }, [payAmount, payToken, receiveToken]);

  const balanceValidation = validateBalance();

  useEffect(() => {
    if (payToken?.chain) {
      setChainId(getChainId(payToken.chain));
    }
  }, [payToken]);

  useEffect(() => {
    if (payToken && payToken?.chain?.toUpperCase() === 'SOLANA') {
      setFromWalletAddress(selectedSolanaWallet?.address || '');
    } else {
      setFromWalletAddress(ethWallet || '');
    }
    if (!receiveToken) {
      setToWalletAddress('');
    } else if (
      receiveToken &&
      (receiveToken?.chain?.toUpperCase() === 'SOLANA' ||
        receiveToken?.chainId == 1151111081099710)
    ) {
      setToWalletAddress(selectedSolanaWallet?.address || '');
    } else {
      setToWalletAddress(ethWallet || '');
    }
  }, [
    ethWallet,
    payToken,
    receiveToken,
    selectedSolanaWallet?.address,
  ]);

  // Token search functions remain the same...
  const debouncedSearch = useCallback(
    debounce(async (query: string, chain: string) => {
      setIsLoadingTokens(true);
      try {
        const tokens = await fetchTokensFromLiFi(chain, query);

        let result = tokens;

        if (query) {
          const lowerQuery = query.toLowerCase();
          result = [...tokens].sort((a, b) => {
            const aSymbol = a.symbol?.toLowerCase() || '';
            const bSymbol = b.symbol?.toLowerCase() || '';

            if (aSymbol === lowerQuery && bSymbol !== lowerQuery)
              return -1;
            if (bSymbol === lowerQuery && aSymbol !== lowerQuery)
              return 1;
            if (
              aSymbol.startsWith(lowerQuery) &&
              !bSymbol.startsWith(lowerQuery)
            )
              return -1;
            if (
              bSymbol.startsWith(lowerQuery) &&
              !aSymbol.startsWith(lowerQuery)
            )
              return 1;
            if (
              aSymbol.includes(lowerQuery) &&
              !bSymbol.includes(lowerQuery)
            )
              return -1;
            if (
              bSymbol.includes(lowerQuery) &&
              !aSymbol.includes(lowerQuery)
            )
              return 1;
            return 0;
          });
        }

        setAvailableTokens(result.slice(0, 20));
      } catch (error) {
        console.error('Error fetching tokens:', error);
      } finally {
        setIsLoadingTokens(false);
      }
    }, 400),
    []
  );

  const handleReceiverChainSelect = (chainId: string) => {
    setSelectedReceiverChain(chainId);
    setReceiverChainId(chainId);
    setReceiveToken(null);
    setSearchQuery('');
    debouncedSearch('', chainId);
  };

  useEffect(() => {
    if (openDrawer && selecting === 'receive') {
      debouncedSearch(searchQuery, selectedReceiverChain);
    }
    return () => debouncedSearch.cancel();
  }, [
    searchQuery,
    selectedReceiverChain,
    openDrawer,
    selecting,
    debouncedSearch,
  ]);

  useEffect(() => {
    if (openDrawer && selecting === 'pay') {
      setAvailableTokens(tokens.slice(0, 20));
    }
  }, [openDrawer, selecting, tokens]);

  const debouncedSetPayAmount = useCallback(
    debounce((value: string) => {
      setPayAmount(value);
    }, 300),
    []
  );

  const handlePayAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setPayAmount(value);
    // Set loading immediately when user types
    if (value && payToken && receiveToken) {
      setIsQuoteLoading(true);
    }
    debouncedSetPayAmount(value);
  };

  const handleFlip = () => {
    const tempToken = payToken;
    const tempAmount = payAmount;

    setPayToken(receiveToken);
    setReceiveToken(tempToken);
    setPayAmount(receiveAmount);
    setReceiveAmount(tempAmount);

    // Trigger new quote fetch after flip
    if (receiveToken && tempToken && receiveAmount) {
      setIsQuoteLoading(true);
    }
  };

  const handlePercentageClick = (percentage: number) => {
    if (payToken?.balance) {
      const amount = (
        parseFloat(payToken.balance) * percentage
      ).toString();
      setPayAmount(amount);

      // Set loading immediately when percentage is clicked
      if (receiveToken) {
        setIsQuoteLoading(true);
      }
    }
  };

  const handleTokenSelect = (token: any, type: 'pay' | 'receive') => {
    if (type === 'pay') {
      setPayToken(token);
    } else {
      setReceiveToken(token);
    }
    setOpenDrawer(false);
    setSearchQuery('');

    // Trigger quote loading if we have both tokens and amount
    if (
      payAmount &&
      ((type === 'pay' && receiveToken) ||
        (type === 'receive' && payToken))
    ) {
      setIsQuoteLoading(true);
    }
  };

  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (selecting === 'pay') {
      handlePayTokenSearch(query);
    }
  };

  const calculateExchangeRateFromQuote = () => {
    const currentQuote = jupiterQuote || quote;

    if (!currentQuote || !payToken || !receiveToken) {
      return null;
    }

    try {
      let fromAmount, toAmount;

      if (jupiterQuote) {
        fromAmount = jupiterQuote.inAmount;
        toAmount = jupiterQuote.outAmount;
      } else {
        fromAmount = quote.estimate?.fromAmount || quote.fromAmount;
        toAmount = quote.estimate?.toAmount || quote.toAmount;
      }

      if (!fromAmount || !toAmount) {
        return null;
      }

      const fromAmountReadable =
        Number(fromAmount) / Math.pow(10, payToken.decimals || 18);
      const toAmountReadable =
        Number(toAmount) / Math.pow(10, receiveToken.decimals || 18);

      if (fromAmountReadable <= 0) {
        return null;
      }

      const rate = toAmountReadable / fromAmountReadable;
      return rate;
    } catch (error) {
      console.error(
        'Error calculating exchange rate from quote:',
        error
      );
      return null;
    }
  };

  const getQuoteInfo = () => {
    const currentQuote = jupiterQuote || quote;
    if (!currentQuote || !payToken || !receiveToken) return null;

    let fromAmountUSD, toAmountUSD, fees, priceImpact;

    if (jupiterQuote) {
      fromAmountUSD = null;
      toAmountUSD = null;
      fees = jupiterQuote.platformFee || null;
      priceImpact = (
        Number(jupiterQuote.priceImpactPct) * 100
      ).toFixed(2);
    } else {
      fromAmountUSD =
        quote.estimate?.fromAmountUSD || quote.fromAmountUSD;
      toAmountUSD = quote.estimate?.toAmountUSD || quote.toAmountUSD;
      fees = quote.estimate?.gasCosts || quote.gasCosts;

      if (fromAmountUSD && toAmountUSD) {
        const fromUSD = parseFloat(fromAmountUSD);
        const toUSD = parseFloat(toAmountUSD);
        priceImpact = ((toUSD - fromUSD) / fromUSD) * 100;
      }
    }

    return {
      exchangeRate: calculateExchangeRateFromQuote(),
      fromAmountUSD: fromAmountUSD ? parseFloat(fromAmountUSD) : null,
      toAmountUSD: toAmountUSD ? parseFloat(toAmountUSD) : null,
      fees: fees,
      priceImpact: priceImpact,
    };
  };

  const handleSlippageChange = (newSlippage: number) => {
    setSlippage(newSlippage);
    setCustomSlippage('');
  };

  const handleCustomSlippageChange = (value: string) => {
    setCustomSlippage(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 50) {
      setSlippage(numValue);
    }
  };

  // Updated button loading state logic
  const isSwapButtonLoading = () => {
    return (
      isQuoteLoading ||
      isCalculating ||
      (payAmount &&
        payToken &&
        receiveToken &&
        !quote &&
        !jupiterQuote &&
        !swapError)
    );
  };

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      if (token) {
        setAccessToken(token);
      }
    };
    if (window !== undefined) {
      getAccessToken();
    }
  }, []);

  // Add this function to your component
  const saveSwapToDatabase = async (
    signature: string,
    quote: any
  ) => {
    try {
      const swapDetails = {
        signature,
        solanaAddress: selectedSolanaWallet?.address || '',
        inputToken: {
          symbol: payToken?.symbol || quote.inputMint,
          amount: parseFloat(payAmount),
          decimals: payToken?.decimals || 6,
          mint: payToken?.address || quote.inputMint,
          price: payToken?.price || payToken?.usdPrice || '0',
          logo: payToken?.logoURI || payToken?.symbol || '',
        },
        outputToken: {
          symbol: receiveToken?.symbol || quote.outputMint,
          amount: parseFloat(receiveAmount),
          decimals: receiveToken?.decimals || 6,
          mint: receiveToken?.address || quote.outputMint,
          price: receiveToken?.price || receiveToken?.usdPrice || '0',
          logo: receiveToken?.logoURI || receiveToken?.symbol || '',
        },
        slippageBps: Math.floor(slippage * 100),
        platformFeeBps: 50,
        timestamp: Date.now(),
      };

      const result = await saveSwapTransaction(
        swapDetails,
        accessToken
      );

      // Send notification via Socket.IO
      if (socket && socket.connected) {
        try {
          const notificationService =
            getWalletNotificationService(socket);

          notificationService.emitSwapCompleted({
            inputTokenSymbol: swapDetails.inputToken.symbol,
            inputAmount: swapDetails.inputToken.amount.toFixed(6),
            outputTokenSymbol: swapDetails.outputToken.symbol,
            outputAmount: swapDetails.outputToken.amount.toFixed(6),
            txSignature: signature,
            network: payToken?.chain || 'SOLANA',
            inputTokenLogo: swapDetails.inputToken.logo,
            outputTokenLogo: swapDetails.outputToken.logo,
            inputUsdValue: formatUSDValue(
              swapDetails.inputToken.amount,
              swapDetails.inputToken.price
            ),
            outputUsdValue: formatUSDValue(
              swapDetails.outputToken.amount,
              swapDetails.outputToken.price
            ),
          });
        } catch (notifError) {
          console.error(
            'Failed to send swap notification:',
            notifError
          );
        }
      } else {
        console.warn(
          '⚠️ Socket not connected, notification not sent'
        );
      }
    } catch (error) {
      console.error('Failed to save swap transaction:', error);
      // Don't throw error here to avoid disrupting the swap flow
    }
  };

  const utf8ToBase64 = (str: string) => {
    return window.btoa(unescape(encodeURIComponent(str)));
  };

  const getTokenIcon = (token: any) => {
    if (token?.logoURI) {
      return token?.logoURI.trim();
    }

    // Generate initials from symbol
    const initials = token.symbol.slice(0, 2).toUpperCase();
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#F9A826',
      '#6C5CE7',
    ];
    const colorIndex = token.symbol.length % colors.length;

    const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="${colors[colorIndex]}" rx="12"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">
        ${initials}
      </text>
    </svg>
  `;

    return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
  };

  // Helper function to sanitize image URLs by removing trailing whitespace
  const sanitizeImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    return url.trim();
  };

  return (
    <div className="flex justify-center mt-10 pb-4 relative">
      <Card className="w-full max-w-md p-4 rounded-2xl shadow-lg bg-white text-black">
        {/* Header with Settings */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-center flex-1">
            Swap
          </h2>
          <button
            onClick={() => setShowSlippageModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Quote refresh countdown indicator */}
        {lastQuoteTime &&
          payAmount &&
          payToken &&
          receiveToken &&
          !isQuoteLoading && (
            <div className="text-center mb-4">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                Refreshing in {quoteCountdown}s
              </span>
            </div>
          )}

        {/* Slippage Settings Panel - Phantom Style */}
        {showSlippageSettings && (
          <div className="mb-4 p-4 bg-gray-100 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Slippage
              </span>
              <div className="flex items-center gap-1">
                <Info className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {slippage === 0.5 ? 'Auto' : `${slippage}%`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              <button
                onClick={() => handleSlippageChange(0.1)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 0.1 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                0.1%
              </button>
              <button
                onClick={() => handleSlippageChange(0.5)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 0.5 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => handleSlippageChange(1.0)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 1.0 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                1%
              </button>
              <button
                onClick={() => handleSlippageChange(2.0)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 2.0 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                2%
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => handleSlippageChange(3.0)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 3.0 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                3%
              </button>
              <button
                onClick={() => handleSlippageChange(5.0)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 5.0 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                5%
              </button>
              <button
                onClick={() => handleSlippageChange(10.0)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 10.0 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                10%
              </button>
              <button
                onClick={() => handleSlippageChange(15.0)}
                className={`py-2 px-2 text-sm rounded-lg transition-all ${
                  slippage === 15.0 && !customSlippage
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                }`}
              >
                15%
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                value={customSlippage}
                onChange={(e) =>
                  handleCustomSlippageChange(e.target.value)
                }
                placeholder="Custom slippage"
                className={`w-full py-2 px-3 text-sm rounded-lg border transition-all ${
                  customSlippage
                    ? 'bg-black text-white border-black placeholder-gray-300'
                    : 'bg-white border-gray-200 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20`}
                step="0.01"
                min="0.01"
                max="50"
              />
              <span
                className={`absolute right-3 top-2 text-sm pointer-events-none ${
                  customSlippage ? 'text-gray-300' : 'text-gray-400'
                }`}
              >
                %
              </span>
            </div>
          </div>
        )}

        {/* Display swap method indicator */}
        {payToken && receiveToken && (
          <div className="text-center mb-4">
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              {isSolanaToSolanaSwap() ? 'Via Jupiter' : 'Via Li.Fi'}
            </span>
          </div>
        )}

        <div className="space-y-4">
          {/* Pay Section */}
          <div className="p-4 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
              <span>You Pay</span>
              <span
                className={`${
                  !balanceValidation.isValid ? 'text-red-500' : ''
                }`}
              >
                {payToken?.balance
                  ? `${parseFloat(payToken.balance).toFixed(4)} ${
                      payToken.symbol
                    }`
                  : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Input
                type="number"
                placeholder="0.00"
                value={payAmount}
                onChange={handlePayAmountChange}
                className="bg-transparent border-none text-2xl font-semibold w-full p-0
                  focus:outline-none focus:ring-0 focus:border-none"
              />
              <button
                onClick={() => {
                  setSelecting('pay');
                  setOpenDrawer(true);
                  setSearchQuery('');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <div className="relative min-w-max">
                    {payToken?.logoURI && (
                      <Image
                        src={sanitizeImageUrl(payToken.logoURI)}
                        alt={payToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    {payToken?.chain && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                        <Image
                          src={sanitizeImageUrl(
                            getChainIcon(payToken.chain || '') || ''
                          )}
                          alt={payToken.chain}
                          width={12}
                          height={12}
                          className="w-3 h-3 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center ml-2">
                    <span className="font-medium">
                      {payToken ? payToken.symbol : 'Select'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            </div>

            {/* USD Value */}
            {payAmount &&
              payToken &&
              getQuoteInfo()?.fromAmountUSD && (
                <div className="text-sm text-gray-500 mt-2">
                  ${getQuoteInfo()?.fromAmountUSD?.toFixed(2)}
                </div>
              )}

            <div className="flex gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-100 rounded-lg"
                onClick={() => handlePercentageClick(0.5)}
              >
                50%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-100 rounded-lg"
                onClick={() => handlePercentageClick(1)}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              disabled={!receiveToken}
            >
              <ArrowUpDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Receive Section */}
          <div className="p-4 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
              <span>You Receive</span>
              <span>
                {receiveToken?.balance
                  ? `${parseFloat(receiveToken.balance).toFixed(4)} ${
                      receiveToken.symbol
                    }`
                  : receiveToken
                  ? '0'
                  : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-base text-gray-800 font-medium">
                  {isCalculating || isQuoteLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
                  ) : (
                    receiveAmount || '0.00'
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelecting('receive');
                  setOpenDrawer(true);
                  setSearchQuery('');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm hover:bg-gray-100 transition-colors"
              >
                {receiveToken ? (
                  <div className="flex items-center">
                    <div className="relative min-w-max">
                      <Image
                        src={sanitizeImageUrl(receiveToken.logoURI)}
                        alt={receiveToken.symbol}
                        width={240}
                        height={240}
                        quality={100}
                        className="w-6 h-6 rounded-full"
                      />
                      {/* Use receiverChainId to determine which chain icon to show */}
                      {(() => {
                        const chainName = (() => {
                          switch (receiverChainId) {
                            case '1151111081099710':
                              return 'SOLANA';
                            case '1':
                              return 'ETHEREUM';
                            case '56':
                              return 'BSC';
                            case '137':
                              return 'POLYGON';
                            case '42161':
                              return 'ARBITRUM';
                            case '8453':
                              return 'BASE';
                            default:
                              return receiveToken.chain || 'SOLANA';
                          }
                        })();

                        return (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                            <Image
                              src={sanitizeImageUrl(
                                getChainIcon(chainName) || ''
                              )}
                              alt={chainName}
                              width={120}
                              height={120}
                              quality={100}
                              className="w-3 h-3 rounded-full"
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center ml-2">
                      <span className="font-medium">
                        {receiveToken.symbol}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">Select</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>

            {/* USD Value */}
            {receiveAmount &&
              receiveToken &&
              getQuoteInfo()?.toAmountUSD && (
                <div className="text-sm text-gray-500 mt-2">
                  ${getQuoteInfo()?.toAmountUSD?.toFixed(2)}
                </div>
              )}
          </div>

          {/* Pricing Information - Phantom Style */}
          {payToken &&
            receiveToken &&
            (quote || jupiterQuote) &&
            (() => {
              const quoteInfo = getQuoteInfo();
              const exchangeRate = quoteInfo?.exchangeRate;

              return (
                exchangeRate && (
                  <div className="space-y-3 text-sm">
                    {/* Pricing */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-600">
                        <span>Pricing</span>
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="text-right text-gray-900">
                        1 {payToken.symbol} ≈{' '}
                        {exchangeRate < 0.000001
                          ? exchangeRate.toExponential(4)
                          : exchangeRate.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}{' '}
                        {receiveToken.symbol}
                      </div>
                    </div>

                    {/* Slippage */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-600">
                        <span>Slippage</span>
                        <Info className="w-4 h-4" />
                      </div>
                      <span className="text-gray-900">
                        {customSlippage
                          ? `${customSlippage}%`
                          : `${slippage}%`}
                      </span>
                    </div>

                    {/* Price Impact */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-600">
                        <span>Price Impact</span>
                        <Info className="w-4 h-4" />
                      </div>
                      <span className="text-gray-900">
                        {quoteInfo &&
                        typeof quoteInfo?.priceImpact === 'number' ? (
                          <span
                            className={
                              quoteInfo.priceImpact < -3
                                ? 'text-red-500'
                                : 'text-gray-900'
                            }
                          >
                            {quoteInfo.priceImpact >= 0 ? '+' : ''}
                            {quoteInfo.priceImpact.toFixed(2)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </span>
                    </div>

                    {/* Fees */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-600">
                        <span>Fees</span>
                        <Info className="w-4 h-4" />
                      </div>
                      <span className="text-gray-900">
                        {isSolanaToSolanaSwap() ? '0.5%' : '0.5%'}
                      </span>
                    </div>

                    {/* Quote includes fee disclaimer */}
                    {(quote || jupiterQuote) && (
                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                        Quote includes a 0.5% platform fee
                      </div>
                    )}
                  </div>
                )
              );
            })()}

          {/* Error/Status Display */}
          {(swapError ||
            swapStatus ||
            !balanceValidation.isValid) && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              {!balanceValidation.isValid && (
                <div className="text-red-600 text-sm mb-2 text-center">
                  {balanceValidation.error}
                </div>
              )}
              {swapError && (
                <div className="text-red-600 text-sm mb-2 text-center flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {swapError}
                </div>
              )}
              {swapStatus && (
                <div
                  className={`text-sm text-center flex items-center justify-center gap-2 ${
                    swapStatus.includes('completed successfully') ||
                    swapStatus.includes('Transaction confirmed')
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : 'text-blue-600 bg-blue-50 border-blue-200'
                  }`}
                >
                  {swapStatus.includes('completed successfully') ||
                  swapStatus.includes('Transaction confirmed') ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  )}
                  {swapStatus}
                </div>
              )}
              {txHash && (
                <div className="text-green-600 text-xs text-center mt-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <a
                      href={getExplorerUrl(chainId, txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-700 transition-colors"
                    >
                      View on explorer
                    </a>
                  </div>
                  <div className="text-gray-500 mt-1 font-mono text-xs">
                    {txHash.length > 16
                      ? `${txHash.slice(0, 8)}...${txHash.slice(-8)}`
                      : txHash}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={
              swapStatus === 'Swap completed successfully!' ||
              swapStatus?.includes('Transaction confirmed')
                ? () => {
                    setSwapStatus(null);
                    setSwapError(null);
                    setTxHash(null);
                    setPayAmount('');
                    setReceiveAmount('');
                    setLastQuoteTime(null);
                  }
                : executeCrossChainSwap
            }
            className={`w-full py-4 font-semibold rounded-xl ${
              swapStatus === 'Swap completed successfully!' ||
              swapStatus?.includes('Transaction confirmed')
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-black hover:bg-gray-800'
            } disabled:opacity-50 transition-colors`}
            disabled={
              isSwapping ||
              (!balanceValidation.isValid &&
                !(
                  swapStatus === 'Swap completed successfully!' ||
                  swapStatus?.includes('Transaction confirmed')
                )) ||
              (isSwapButtonLoading() &&
                !(
                  swapStatus === 'Swap completed successfully!' ||
                  swapStatus?.includes('Transaction confirmed')
                )) ||
              !payToken ||
              !receiveToken
            }
          >
            {swapStatus === 'Swap completed successfully!' ||
            swapStatus?.includes('Transaction confirmed') ? (
              'New Swap'
            ) : isSwapping ? (
              'Swapping...'
            ) : !balanceValidation.isValid ? (
              'Insufficient Balance'
            ) : isSwapButtonLoading() ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Getting Quote...
              </div>
            ) : !payAmount || !receiveAmount ? (
              'Enter Amount'
            ) : !receiveToken ? (
              'Select Token'
            ) : (
              'Swap'
            )}
          </Button>

          {/* Loading state during swap */}
          {isSwapping && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
                <p className="text-center text-gray-700">
                  {swapStatus || 'Processing swap...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Token Select Drawer */}
      {openDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setOpenDrawer(false);
              setSearchQuery('');
            }}
          />
          <div className="w-full max-w-[30rem] bg-white rounded-2xl shadow-lg p-6 max-h-[80vh] z-50 mx-4">
            <div className="mb-4">
              <p className="font-semibold text-lg mb-3">
                {selecting === 'pay'
                  ? 'Select Token to Pay'
                  : 'Select Token to Receive'}
              </p>

              {/* Chain Selection Tabs - Show for both pay and receive tokens */}
              <div className="mb-4">
                <div className="flex gap-2 mb-4">
                  {selecting === 'pay'
                    ? // Pay token chain selection
                      PAY_CHAINS.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() =>
                            handlePayChainSelect(chain.id)
                          }
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            selectedPayChain === chain.id
                              ? 'bg-black text-white border-black'
                              : 'bg-white border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {chain.icon ? (
                            <Image
                              src={sanitizeImageUrl(chain.icon)}
                              alt={chain.name}
                              width={200}
                              height={200}
                              quality={100}
                              className="w-5 h-5 rounded-full bg-white"
                            />
                          ) : (
                            // All chains icon - you can customize this
                            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                *
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-sm">
                            {chain.name}
                          </span>
                        </button>
                      ))
                    : // Receive token chain selection (existing code)
                      RECEIVER_CHAINS.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() =>
                            handleReceiverChainSelect(chain.id)
                          }
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            selectedReceiverChain === chain.id
                              ? 'bg-black text-white border-black'
                              : 'bg-white border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <Image
                            src={sanitizeImageUrl(chain.icon)}
                            alt={chain.name}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full bg-white"
                          />
                          <span className="font-medium text-sm">
                            {chain.name}
                          </span>
                        </button>
                      ))}
                </div>
              </div>

              <Input
                placeholder="Search token name or symbol"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg border-gray-200 focus:border-black focus:ring-black"
              />
            </div>

            {isLoadingTokens ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <div className="space-y-0 overflow-y-auto max-h-[300px]">
                {selecting === 'pay' ? (
                  <>
                    {availableTokens
                      .filter((token: any) =>
                        selecting === 'pay'
                          ? token.address !== receiveToken?.address
                          : token.address !== payToken?.address
                      )
                      .map((token: any) => (
                        <button
                          key={token.address}
                          onClick={() =>
                            handleTokenSelect(token, selecting!)
                          }
                          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="relative w-8 h-8">
                            {token.symbol === 'SWOP' ? (
                              <Image
                                src={sanitizeImageUrl(token.logoURI)}
                                alt={token.symbol}
                                width={1020}
                                height={1020}
                                quality={100}
                                className="w-auto h-auto rounded-full border"
                              />
                            ) : (
                              <Image
                                src={sanitizeImageUrl(
                                  token?.marketData?.iconUrl ||
                                    token?.logoURI ||
                                    getTokenIcon(token)
                                )}
                                alt={token.symbol}
                                width={1020}
                                height={1020}
                                quality={100}
                                className="w-auto h-auto rounded-full"
                              />
                            )}
                            {token.chain && (
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                                <Image
                                  src={sanitizeImageUrl(
                                    getChainIcon(token.chain || '') ||
                                      ''
                                  )}
                                  alt={token.chain}
                                  width={120}
                                  height={120}
                                  quality={100}
                                  className="w-3 h-3 rounded-full"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between w-full items-center">
                            <div className="text-left">
                              <p className="font-semibold">
                                {token.symbol}
                              </p>
                              <p className="text-xs text-gray-500">
                                {token.name}
                              </p>
                            </div>
                            {token.balance && (
                              <span className="text-gray-400 text-sm font-medium">
                                {parseFloat(token.balance).toFixed(4)}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                  </>
                ) : (
                  <>
                    {filteredReceivedTokens
                      .filter((token: any) =>
                        selecting == 'pay'
                          ? token.address !== receiveToken?.address
                          : token.address !== payToken?.address
                      )
                      .map((token: any) => (
                        <button
                          key={token.address}
                          onClick={() =>
                            handleTokenSelect(token, selecting!)
                          }
                          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="relative w-8 h-8">
                            {token.symbol === 'SWOP' ? (
                              <Image
                                src={sanitizeImageUrl(token.logoURI)}
                                alt={token.symbol}
                                width={1020}
                                height={1020}
                                quality={100}
                                className="w-auto h-auto rounded-full border"
                              />
                            ) : (
                              <Image
                                src={sanitizeImageUrl(
                                  token?.marketData?.iconUrl ||
                                    token?.logoURI ||
                                    getTokenIcon(token)
                                )}
                                alt={token.symbol}
                                width={1020}
                                height={1020}
                                quality={100}
                                className="w-auto h-auto rounded-full"
                              />
                            )}
                            {token.chain && (
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                                <Image
                                  src={sanitizeImageUrl(
                                    getChainIcon(token.chain || '') ||
                                      ''
                                  )}
                                  alt={token.chain}
                                  width={120}
                                  height={120}
                                  quality={100}
                                  className="w-3 h-3 rounded-full"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between w-full items-center">
                            <div className="text-left">
                              <p className="font-semibold">
                                {token.symbol}
                              </p>
                              <p className="text-xs text-gray-500">
                                {token.name}
                              </p>
                            </div>
                            {token.balance && (
                              <span className="text-gray-400 text-sm font-medium">
                                {parseFloat(token.balance).toFixed(4)}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                  </>
                )}

                {!isLoadingTokens && availableTokens.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-2">
                      No tokens found for this Chain
                    </div>
                    <div className="text-xs">
                      Try adjusting your search or chain filter
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slippage Settings Modal */}
      {showSlippageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowSlippageModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md mx-4 z-50">
            <h3 className="text-lg font-semibold mb-4">
              Slippage Settings
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slippage tolerance
              </label>

              {/* Quick select buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <button
                  onClick={() => {
                    setSlippage(0.1);
                    setCustomSlippage('');
                  }}
                  className={`py-2 px-2 text-sm rounded-lg transition-all ${
                    slippage === 0.1 && !customSlippage
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  0.1%
                </button>
                <button
                  onClick={() => {
                    setSlippage(0.5);
                    setCustomSlippage('');
                  }}
                  className={`py-2 px-2 text-sm rounded-lg transition-all ${
                    slippage === 0.5 && !customSlippage
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  0.5%
                </button>
                <button
                  onClick={() => {
                    setSlippage(1.0);
                    setCustomSlippage('');
                  }}
                  className={`py-2 px-2 text-sm rounded-lg transition-all ${
                    slippage === 1.0 && !customSlippage
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  1.0%
                </button>
                <button
                  onClick={() => {
                    setSlippage(2.0);
                    setCustomSlippage('');
                  }}
                  className={`py-2 px-2 text-sm rounded-lg transition-all ${
                    slippage === 2.0 && !customSlippage
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  2.0%
                </button>
              </div>

              {/* Custom slippage input */}
              <div className="relative">
                <Input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomSlippage(value);
                    const numValue = parseFloat(value);
                    if (
                      !isNaN(numValue) &&
                      numValue >= 0.1 &&
                      numValue <= 50
                    ) {
                      setSlippage(numValue);
                    }
                  }}
                  placeholder="Custom"
                  className="pr-10"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">
                  %
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <p className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                Your transaction will revert if the price changes
                unfavorably by more than this percentage.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowSlippageModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowSlippageModal(false)}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
