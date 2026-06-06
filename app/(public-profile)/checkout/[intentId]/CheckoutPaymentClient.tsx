'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  useConnectWallet,
  usePrivy,
  useSendTransaction,
  useWallets as useEvmWallets,
} from '@privy-io/react-auth';
import {
  useCreateWallet as useSolanaCreateWallet,
  useWallets as useSolanaWallets,
} from '@privy-io/react-auth/solana';
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
} from 'viem';
import { arbitrum, base, mainnet, polygon } from 'viem/chains';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  CheckoutIntent,
  getCheckoutIntent,
  prepareCheckoutLifiTransaction,
  prepareCheckoutTransaction,
  submitCheckoutLifiTransaction,
  submitCheckoutTransaction,
} from '@/lib/checkout-api';
import { getJupiterQuote as fetchJupiterQuote } from '@/actions/jupiterSwap';
import {
  calculateCheckoutTokenAmount,
  formatRawTokenAmount,
  getCheckoutAmounts,
  getProtectedCheckoutOutputRawAmount,
  isSolanaSettlementUsdc,
  SOL_MINT,
  SOLANA_USDC_MINT,
} from '@/lib/checkout-payment-amounts';
import { copyTextToClipboard } from '@/lib/clipboard';
import { getPhantomCheckoutUrl } from '@/lib/phantom-checkout';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';
import { TokenData } from '@/types/token';

const SUCCESS_STATUSES = new Set(['paid', 'settled']);
const FINAL_STATUSES = new Set([
  'paid',
  'settled',
  'expired',
  'cancelled',
  'conversion_failed',
  'settlement_failed',
]);

type Stage =
  | 'idle'
  | 'loading'
  | 'preparing'
  | 'signing'
  | 'confirming'
  | 'completed'
  | 'failed';

type RailFilter = 'all' | 'solana' | 'evm';

type LifiTransactionRequest = {
  to: string;
  data: string;
  value?: string;
  chainId?: number;
};

const NATIVE_EVM_TOKEN = '0x0000000000000000000000000000000000000000';
const CHAIN_CONFIG: Record<
  string,
  { id: string; name: string; explorer: string }
> = {
  ETHEREUM: {
    id: '1',
    name: 'Ethereum',
    explorer: 'https://etherscan.io/tx/',
  },
  POLYGON: {
    id: '137',
    name: 'Polygon',
    explorer: 'https://polygonscan.com/tx/',
  },
  BASE: {
    id: '8453',
    name: 'Base',
    explorer: 'https://basescan.org/tx/',
  },
  ARBITRUM: {
    id: '42161',
    name: 'Arbitrum',
    explorer: 'https://arbiscan.io/tx/',
  },
  SOLANA: {
    id: '1151111081099710',
    name: 'Solana',
    explorer: 'https://solscan.io/tx/',
  },
};

const VIEM_CHAINS = {
  '1': mainnet,
  '137': polygon,
  '8453': base,
  '42161': arbitrum,
};

function base64ToUint8Array(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function uint8ArrayToBase64(value: Uint8Array) {
  let binary = '';
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decimalToRawTokenAmount(value: string, decimals: number) {
  const [whole = '0', fraction = ''] = value.split('.');
  const safeWhole = whole.replace(/\D/g, '') || '0';
  const safeFraction = fraction.replace(/\D/g, '').slice(0, decimals);
  return `${safeWhole}${safeFraction.padEnd(decimals, '0')}`.replace(
    /^0+(?=\d)/,
    ''
  );
}

function formatCurrency(value?: number, currency = 'USDC') {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function tokenMintForCheckout(token: TokenData) {
  if (token.isNative || token.symbol?.toUpperCase() === 'SOL') return null;
  return token.address || null;
}

function tokenAddressForLifi(token: TokenData) {
  if (
    token.isNative ||
    ['ETH', 'POL', 'MATIC'].includes(token.symbol?.toUpperCase() || '')
  ) {
    return NATIVE_EVM_TOKEN;
  }

  return token.address || NATIVE_EVM_TOKEN;
}

function tokenRail(token: TokenData | null) {
  if (!token) return null;
  return token.chain === 'SOLANA' ? 'solana' : 'lifi';
}

function explorerUrlForToken(token: TokenData | null, txHash: string) {
  const chain = token?.chain || 'SOLANA';
  return `${CHAIN_CONFIG[chain]?.explorer || CHAIN_CONFIG.SOLANA.explorer}${txHash}`;
}

function chainNameById(chainId?: string | null) {
  if (!chainId) return '';
  const match = Object.values(CHAIN_CONFIG).find(
    (chain) => chain.id === String(chainId)
  );
  return match?.name || chainId;
}

function swopAppCheckoutUrl(intentId: string) {
  return `swop://pay/v1/checkout/${encodeURIComponent(intentId)}`;
}

function getPublicClient(chainId: string) {
  const chain = VIEM_CHAINS[chainId as keyof typeof VIEM_CHAINS];
  if (!chain) return null;
  return createPublicClient({ chain, transport: http() });
}

function statusCopy(intent?: CheckoutIntent | null) {
  switch (intent?.status) {
    case 'settled':
      return 'Paid and settled';
    case 'paid':
      return 'Paid';
    case 'conversion_failed':
      return 'Paid, conversion pending';
    case 'settlement_failed':
      return 'Paid, settlement pending';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    case 'pending_payment':
      return 'Awaiting signature';
    default:
      return 'Ready';
  }
}

function PhantomMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-white text-xs font-black text-[#5f4acb] ${className}`}
      aria-hidden="true"
    >
      P
    </span>
  );
}

export default function CheckoutPaymentClient({
  intentId,
}: {
  intentId: string;
}) {
  const { login, ready, authenticated } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { accessToken } = useUser();
  const { wallets: evmWallets } = useEvmWallets();
  const { sendTransaction } = useSendTransaction();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { createWallet } = useSolanaCreateWallet();
  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [search, setSearch] = useState('');
  const [railFilter, setRailFilter] = useState<RailFilter>('all');
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [copiedPayUri, setCopiedPayUri] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const copyFallbackInputRef = useRef<HTMLInputElement | null>(null);
  const [quotedTokenAmount, setQuotedTokenAmount] = useState('');
  const [tokenAmountLoading, setTokenAmountLoading] = useState(false);
  const [tokenAmountQuoteError, setTokenAmountQuoteError] = useState<
    string | null
  >(null);
  const [quoteSummary, setQuoteSummary] = useState<{
    quotedOutputAmount?: number;
    minOutputAmount?: number;
    requiredSettlementAmount?: number;
    destinationChain?: string;
    settlementMode?: string;
    platformFeeCollection?: string;
    lifiTool?: string | null;
    approvalAddress?: string | null;
  } | null>(null);

  const solanaWallet = useMemo(() => {
    return solanaWallets.find((wallet) => wallet.address) || null;
  }, [solanaWallets]);

  const evmWalletAddresses = useMemo(
    () =>
      Array.from(
        new Set(
          evmWallets
            .filter((wallet) => wallet.address && wallet.chainId?.includes('eip155:'))
            .map((wallet) => wallet.address)
        )
      ),
    [evmWallets]
  );

  const { tokens, loading: tokensLoading, refetch } = useMultiChainTokenData(
    solanaWallet?.address,
    evmWalletAddresses,
    ['SOLANA', 'ETHEREUM', 'POLYGON', 'BASE', 'ARBITRUM']
  );

  const payable = Boolean(
    intent && !FINAL_STATUSES.has(intent.status)
  );

  const payableTokens = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return (tokens as TokenData[])
      .filter((token) => {
        if (railFilter === 'solana') return token.chain === 'SOLANA';
        if (railFilter === 'evm') return token.chain !== 'SOLANA';
        return true;
      })
      .filter((token) => Number(token.balance || 0) > 0)
      .filter((token) => Number(token.marketData?.price || 0) > 0)
      .filter((token) => {
        if (!lowerSearch) return true;
        return (
          token.name?.toLowerCase().includes(lowerSearch) ||
          token.symbol?.toLowerCase().includes(lowerSearch)
        );
      });
  }, [railFilter, search, tokens]);

  const estimatedTokenAmount = useMemo(
    () => (intent ? calculateCheckoutTokenAmount(intent, selectedToken) : ''),
    [intent, selectedToken]
  );

  const needsSolanaSettlementQuote = Boolean(
    intent &&
      selectedToken &&
      selectedToken.chain === 'SOLANA' &&
      !isSolanaSettlementUsdc(selectedToken)
  );
  const tokenAmount = needsSolanaSettlementQuote
    ? quotedTokenAmount
    : estimatedTokenAmount;

  const checkoutAmounts = useMemo(
    () => (intent ? getCheckoutAmounts(intent) : null),
    [intent]
  );

  const selectedRail = tokenRail(selectedToken);
  const appCheckoutUrl = useMemo(
    () => swopAppCheckoutUrl(intentId),
    [intentId]
  );
  const phantomCheckoutUrl = useMemo(
    () =>
      getPhantomCheckoutUrl({
        checkoutUrl: intent?.checkoutUrl,
        intentId: intent?.intentId || intentId,
      }),
    [intent?.checkoutUrl, intent?.intentId, intentId]
  );
  const marketplaceOrderId = intent?.marketplaceOrder?.orderId || '';

  const hasSufficientBalance = useMemo(() => {
    if (!selectedToken || !tokenAmount) return false;
    return Number(selectedToken.balance || 0) >= Number(tokenAmount);
  }, [selectedToken, tokenAmount]);

  useEffect(() => {
    let cancelled = false;

    async function loadIntent() {
      setStage('loading');
      try {
        const nextIntent = await getCheckoutIntent(intentId);
        if (cancelled) return;
        setIntent(nextIntent);
        setStage(SUCCESS_STATUSES.has(nextIntent.status) ? 'completed' : 'idle');
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load checkout'
        );
        setStage('failed');
      }
    }

    loadIntent();
    return () => {
      cancelled = true;
    };
  }, [intentId]);

  useEffect(() => {
    if (!selectedToken && payableTokens.length > 0) {
      const preferred =
        payableTokens.find(
          (token) =>
            token.chain === 'SOLANA' &&
            token.symbol?.toUpperCase() === 'USDC'
        ) ||
        payableTokens.find((token) => token.symbol?.toUpperCase() === 'USDC') ||
        payableTokens[0];
      setSelectedToken(preferred);
    }
  }, [payableTokens, selectedToken]);

  useEffect(() => {
    if (!copyFallback) return;
    window.setTimeout(() => {
      copyFallbackInputRef.current?.focus();
      copyFallbackInputRef.current?.select();
    }, 0);
  }, [copyFallback]);

  useEffect(() => {
    setQuoteSummary(null);
  }, [selectedToken, tokenAmount]);

  useEffect(() => {
    let cancelled = false;

    setQuotedTokenAmount('');
    setTokenAmountQuoteError(null);

    async function quoteSolanaSettlementAmount() {
      if (!intent || !selectedToken || !needsSolanaSettlementQuote) {
        setTokenAmountLoading(false);
        return;
      }

      const inputMint =
        selectedToken.isNative ||
        selectedToken.symbol?.toUpperCase() === 'SOL'
          ? SOL_MINT
          : selectedToken.address;

      if (!inputMint) {
        setTokenAmountQuoteError('Unable to quote selected token.');
        setTokenAmountLoading(false);
        return;
      }

      setTokenAmountLoading(true);

      try {
        const result = await fetchJupiterQuote({
          inputMint,
          outputMint: intent.merchantCurrency.mint || SOLANA_USDC_MINT,
          amount: getProtectedCheckoutOutputRawAmount(
            intent,
            intent.merchantCurrency.decimals || 6
          ),
          slippageBps: getCheckoutAmounts(intent).slippageBps,
          swapMode: 'ExactOut',
        });

        if (cancelled) return;

        if (!result.success || !result.data?.inAmount) {
          throw new Error(
            result.error || 'Unable to quote selected token into USDC.'
          );
        }

        setQuotedTokenAmount(
          formatRawTokenAmount(
            result.data.inAmount,
            selectedToken.decimals || 9
          )
        );
      } catch (quoteError) {
        if (cancelled) return;
        setTokenAmountQuoteError(
          quoteError instanceof Error
            ? quoteError.message
            : 'Unable to quote selected token into USDC.'
        );
      } finally {
        if (!cancelled) setTokenAmountLoading(false);
      }
    }

    quoteSolanaSettlementAmount();

    return () => {
      cancelled = true;
    };
  }, [intent, needsSolanaSettlementQuote, selectedToken]);

  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    setError(null);
    try {
      await createWallet();
      toast.success('Wallet created');
      await refetch();
    } catch (walletError) {
      setError(
        walletError instanceof Error
          ? walletError.message
          : 'Unable to create wallet'
      );
    } finally {
      setCreatingWallet(false);
    }
  };

  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    setError(null);
    try {
      await connectWallet();
      await refetch();
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Unable to connect wallet'
      );
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleOpenSwopApp = () => {
    window.location.href = appCheckoutUrl;
  };

  const handleOpenPhantom = () => {
    if (!phantomCheckoutUrl) return;
    window.location.href = phantomCheckoutUrl;
  };

  const copySolanaPayUri = async () => {
    if (!intent?.paymentRequest?.url) return;
    const copiedToClipboard = await copyTextToClipboard(intent.paymentRequest.url);
    if (copiedToClipboard) {
      setCopyFallback('');
      setCopiedPayUri(true);
      toast.success('Solana Pay URI copied');
      window.setTimeout(() => setCopiedPayUri(false), 1600);
      return;
    }

    setCopyFallback(intent.paymentRequest.url);
    toast('Payment URI selected. Press Cmd+C to copy.');
  };

  const executeLifiTransaction = async (
    transactionRequest: LifiTransactionRequest,
    spenderAddress?: string | null
  ) => {
    if (!selectedToken || selectedToken.chain === 'SOLANA') {
      throw new Error('Select a supported token for Swop Pay');
    }

    const chainConfig = CHAIN_CONFIG[selectedToken.chain];
    if (!chainConfig) throw new Error('Unsupported payment network');

    const sourceChainId = Number(chainConfig.id);
    const sourceWalletAddress = selectedToken.walletAddress;
    const evmWallet = evmWallets.find(
      (wallet) =>
        wallet.address?.toLowerCase() ===
        sourceWalletAddress?.toLowerCase()
    );
    if (!evmWallet || !sourceWalletAddress) {
      throw new Error('Wallet not found');
    }

    if (evmWallet.chainId !== `eip155:${sourceChainId}`) {
      await evmWallet.switchChain(sourceChainId);
    }

    const publicClient = getPublicClient(chainConfig.id);
    if (!publicClient) {
      throw new Error(`Unsupported source chain: ${selectedToken.chain}`);
    }

    const fromTokenAddress = tokenAddressForLifi(selectedToken);
    const isNativeToken = fromTokenAddress === NATIVE_EVM_TOKEN;

    if (!isNativeToken) {
      const approvalAddress =
        spenderAddress && /^0x[a-fA-F0-9]{40}$/.test(spenderAddress)
          ? spenderAddress
          : null;
      if (approvalAddress) {
        const rawAmount = BigInt(
          decimalToRawTokenAmount(tokenAmount, selectedToken.decimals || 18)
        );
        const currentAllowance = await publicClient.readContract({
          address: fromTokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [
            sourceWalletAddress as `0x${string}`,
            approvalAddress as `0x${string}`,
          ],
        });

        if (currentAllowance < rawAmount) {
          setStage('signing');
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [
              approvalAddress as `0x${string}`,
              BigInt(
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
              ),
            ],
          });
          const approval = await sendTransaction(
            {
              to: fromTokenAddress as `0x${string}`,
              data: approveData,
              chainId: sourceChainId,
            },
            { sponsor: false }
          );
          await publicClient.waitForTransactionReceipt({
            hash: approval.hash as `0x${string}`,
          });
        }
      }
    }

    setStage('signing');
    const txValue = transactionRequest.value
      ? BigInt(transactionRequest.value)
      : undefined;
    const result = await sendTransaction(
      {
        to: transactionRequest.to as `0x${string}`,
        data: transactionRequest.data as `0x${string}`,
        ...(txValue ? { value: txValue } : {}),
        chainId: transactionRequest.chainId || sourceChainId,
      },
      { sponsor: false }
    );

    return result.hash;
  };

  const pollLifiSettlement = async (txHash: string) => {
    let latestIntent: CheckoutIntent | undefined;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const result = await submitCheckoutLifiTransaction(
        intentId,
        { txHash },
        accessToken || ''
      );
      if (result.intent) {
        latestIntent = result.intent;
        setIntent(result.intent);
      }
      if (result.settlementStatus !== 'pending_payment') {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }

    return {
      transactionHash: txHash,
      settlementStatus: 'pending_payment',
      intent: latestIntent,
    };
  };

  const handlePay = async () => {
    if (!intent || !selectedToken || !tokenAmount) {
      return;
    }

    setError(null);
    setTransactionHash('');
    setQuoteSummary(null);

    try {
      setStage('preparing');
      if (selectedRail === 'lifi') {
        const chainConfig = CHAIN_CONFIG[selectedToken.chain];
        const fromAddress = selectedToken.walletAddress;
        if (!chainConfig || !fromAddress) {
          throw new Error('Wallet not ready');
        }

        const prepared = await prepareCheckoutLifiTransaction(
          intent.intentId,
          {
            fromAddress,
            fromChain: chainConfig.id,
            fromToken: tokenAddressForLifi(selectedToken),
            tokenDecimals: selectedToken.decimals ?? 18,
            tokenAmount,
          },
          accessToken || ''
        );
        setQuoteSummary(prepared.quote || null);
        const hash = await executeLifiTransaction(
          prepared.transactionRequest,
          prepared.quote?.approvalAddress
        );
        setTransactionHash(hash);

        setStage('confirming');
        const result = await pollLifiSettlement(hash);
        if (result.intent) setIntent(result.intent);
        if (result.settlementStatus === 'pending_payment') {
          toast.success('Payment sent. Settlement is still confirming.');
        } else {
          toast.success('Payment sent');
        }
        setStage('completed');
        return;
      }

      if (!solanaWallet?.address) {
        throw new Error('Solana wallet not ready');
      }

      const prepared = await prepareCheckoutTransaction(
        intent.intentId,
        {
          fromAddress: solanaWallet.address,
          tokenMint: tokenMintForCheckout(selectedToken),
          tokenDecimals: selectedToken.decimals ?? 9,
          tokenAmount,
        },
        accessToken || ''
      );
      setQuoteSummary(prepared.quote || null);

      setStage('signing');
      const signed = await solanaWallet.signTransaction({
        transaction: base64ToUint8Array(prepared.serializedTransaction),
      });

      setStage('confirming');
      const result = await submitCheckoutTransaction(
        intent.intentId,
        {
          signedTransaction: uint8ArrayToBase64(
            new Uint8Array(signed.signedTransaction)
          ),
        },
        accessToken || ''
      );

      setTransactionHash(result.transactionHash || '');
      if (result.intent) setIntent(result.intent);
      setStage('completed');
      toast.success('Payment sent');
    } catch (payError) {
      const message =
        payError instanceof Error ? payError.message : 'Payment failed';
      setError(message);
      setStage('failed');
      toast.error(message);
    }
  };

  const loading = stage === 'loading';
  const busy = ['preparing', 'signing', 'confirming'].includes(stage);

  return (
    <main className="min-h-screen bg-[#f7f7f9] px-4 py-6 text-[#101114] sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dde1e6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6574]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Swop Pay
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#101114]">
                {loading
                  ? 'Loading checkout'
                  : intent?.description || 'Checkout payment'}
              </h1>
              <p className="mt-2 text-sm text-[#646b78]">
                {intent?.merchant.name || 'Merchant'} receives{' '}
                {intent
                  ? formatCurrency(
                      getCheckoutAmounts(intent).merchantReceivesAmount,
                      intent.merchantCurrency.symbol
                    )
                  : 'USDC'}.
              </p>
            </div>
            <div className="min-w-[180px] rounded-md border border-[#eceef2] bg-[#fafafa] p-3 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                Amount due
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {intent
                  ? formatCurrency(
                      getCheckoutAmounts(intent).totalDueAmount,
                      intent.amount.currency
                    )
                  : '--'}
              </p>
              <p className="mt-2 text-xs font-medium text-[#5d6574]">
                {statusCopy(intent)}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-[#ffd0d0] bg-[#fff5f5] p-3 text-sm text-[#b42318]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && intent?.lineItems && intent.lineItems.length > 0 && (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#101114]">
                Order
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                {intent.lineItems.length}{' '}
                {intent.lineItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="mt-3 divide-y divide-[#edf0f3]">
              {intent.lineItems.map((item) => (
                <div
                  key={`${item.productId || item.templateId || item.name}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.image ? (
                      <Image
                        src={sanitizeNextImageSrc(item.image)}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#f0f2f5]">
                        <Package className="h-4 w-4 text-[#737b8c]" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-[#737b8c]">
                        {item.quantity} x{' '}
                        {formatCurrency(item.unitAmount, item.currency)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(item.totalAmount, item.currency)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && intent?.paymentRequest?.url && payable && (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
              <div className="mx-auto rounded-lg border border-[#dfe4eb] bg-white p-3 shadow-sm">
                <QRCodeSVG
                  value={phantomCheckoutUrl || intent.paymentRequest.url}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#101114"
                  level="M"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                  Phantom checkout
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Pay with Phantom
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#646b78]">
                  Scan or open the provider link, then approve the payment from
                  Phantom. The unique checkout reference lets Swop reconcile the
                  exact payment.
                </p>
                <div className="mt-4 rounded-md border border-[#edf0f3] bg-[#fbfcfd] p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#737b8c]">Recipient</span>
                    <span className="font-semibold">
                      {intent.paymentRequest.recipientRole === 'merchant'
                        ? 'Merchant wallet'
                        : 'Swop settlement wallet'}
                    </span>
                  </div>
                  <p className="mt-2 break-all font-mono text-[11px] text-[#737b8c]">
                    Ref {intent.paymentRequest.reference}
                  </p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleOpenPhantom}
                    disabled={!phantomCheckoutUrl}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#5f4acb] px-3 text-sm font-semibold text-white transition hover:bg-[#523db8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PhantomMark className="h-5 w-5" />
                    Open Phantom
                  </button>
                  <button
                    type="button"
                    onClick={copySolanaPayUri}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa]"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedPayUri ? 'Copied' : 'Copy payment URI'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-6">
            <div className="flex items-center gap-3 text-sm text-[#646b78]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading checkout...
            </div>
          </section>
        ) : !intent ? null : SUCCESS_STATUSES.has(intent.status) ||
          stage === 'completed' ? (
          <section className="rounded-lg border border-[#d8f5e4] bg-white p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-6 w-6 flex-shrink-0 text-[#16a34a]" />
              <div>
                <h2 className="text-lg font-semibold">Payment complete</h2>
                <p className="mt-1 text-sm text-[#646b78]">
                  Settlement status: {statusCopy(intent)}
                </p>
                {(transactionHash || intent.payment?.txHash) && (
                  <a
                    href={explorerUrlForToken(
                      selectedToken,
                      transactionHash || intent.payment?.txHash || ''
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#101114] px-3 py-2 text-sm font-semibold text-white"
                  >
                    View transaction
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                {marketplaceOrderId && (
                  <a
                    href={`/order/${encodeURIComponent(marketplaceOrderId)}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm font-semibold text-[#101114]"
                  >
                    View order
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </section>
        ) : !payable ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-[#737b8c]" />
              <div>
                <h2 className="text-lg font-semibold">
                  Checkout {statusCopy(intent).toLowerCase()}
                </h2>
                <p className="mt-1 text-sm text-[#646b78]">
                  This checkout cannot accept another payment.
                </p>
              </div>
            </div>
          </section>
        ) : !ready || !authenticated ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                  Pay your way
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Pay with Swop Pay
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#646b78]">
                  Open this request in Swop or continue here to choose the
                  wallet that pays.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3 lg:max-w-[640px]">
                <button
                  type="button"
                  onClick={handleOpenPhantom}
                  disabled={!phantomCheckoutUrl}
                  className="flex min-h-[84px] items-center gap-3 rounded-md border border-[#5f4acb] bg-[#5f4acb] p-3 text-left text-white transition hover:bg-[#523db8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    <PhantomMark className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      Phantom
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Open wallet browser
                    </span>
                  </span>
                  <ExternalLink className="ml-auto h-4 w-4 flex-shrink-0 text-white/70" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenSwopApp}
                  className="flex min-h-[84px] items-center gap-3 rounded-md border border-[#dde1e6] bg-white p-3 text-left transition hover:border-[#101114]"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#101114] text-white">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#101114]">
                      Open Swop app
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[#737b8c]">
                      Use your Swop wallet
                    </span>
                  </span>
                  <ExternalLink className="ml-auto h-4 w-4 flex-shrink-0 text-[#8b93a3]" />
                </button>
                <button
                  type="button"
                  onClick={login}
                  disabled={!ready}
                  className="flex min-h-[84px] items-center gap-3 rounded-md border border-[#101114] bg-[#101114] p-3 text-left text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      Sign in or connect
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Choose wallet on this link
                    </span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-white/70" />
                </button>
              </div>
            </div>
          </section>
        ) : !solanaWallet && evmWalletAddresses.length === 0 ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                  Wallet selection
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Choose a wallet to pay
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#646b78]">
                  Connect an existing wallet or create a Swop wallet, then
                  Swop Pay will show the balances you can use.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3 lg:max-w-[640px]">
                <button
                  type="button"
                  onClick={handleOpenPhantom}
                  disabled={!phantomCheckoutUrl}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#5f4acb] bg-[#5f4acb] p-3 text-left text-white transition hover:bg-[#523db8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    <PhantomMark className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      Phantom
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Open provider
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={connectingWallet}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#101114] bg-[#101114] p-3 text-left text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    {connectingWallet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      Connect wallet
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Select an external wallet
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateWallet}
                  disabled={creatingWallet}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#dde1e6] bg-white p-3 text-left transition hover:border-[#101114] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#f0f2f5] text-[#101114]">
                    {creatingWallet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#101114]">
                      Create Swop wallet
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[#737b8c]">
                      Use a new Swop wallet
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-[#e7e8ec] bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Choose wallet</h2>
                  <p className="mt-1 text-xs font-medium text-[#737b8c]">
                    {selectedToken?.walletAddress || solanaWallet?.address
                      ? `Wallet ${truncateWalletAddress(
                          selectedToken?.walletAddress ||
                            solanaWallet?.address ||
                            ''
                        )}`
                      : 'Choose a funded wallet balance'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex h-9 w-10 items-center justify-center self-start rounded-md border border-[#dde1e6] px-3 text-sm font-semibold text-[#303642] sm:w-auto sm:self-auto"
                  title="Refresh balances"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 inline-flex rounded-md border border-[#dde1e6] bg-[#fafafa] p-1">
                {[
                  ['all', 'All'],
                  ['solana', 'Solana'],
                  ['evm', 'Other chains'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRailFilter(value as RailFilter);
                      setSelectedToken(null);
                    }}
                    className={`h-8 rounded px-3 text-xs font-semibold ${
                      railFilter === value
                        ? 'bg-white text-[#101114] shadow-sm'
                        : 'text-[#737b8c]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a3]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search wallet or token"
                  className="h-10 w-full rounded-md border border-[#dde1e6] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#101114]"
                />
              </div>

              <div className="mt-3 max-h-[420px] overflow-y-auto">
                {tokensLoading ? (
                  <div className="flex items-center gap-3 py-8 text-sm text-[#646b78]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading tokens...
                  </div>
                ) : payableTokens.length === 0 ? (
                  <p className="py-8 text-sm text-[#646b78]">
                    No supported tokens found for this filter.
                  </p>
                ) : (
                  <div className="divide-y divide-[#edf0f3]">
                    {payableTokens.map((token) => {
                      const isSelected =
                        selectedToken?.address === token.address &&
                        selectedToken?.symbol === token.symbol &&
                        selectedToken?.chain === token.chain;
                      return (
                        <button
                          key={`${token.chain}-${token.walletAddress || ''}-${
                            token.symbol
                          }-${token.address || 'native'}`}
                          type="button"
                          onClick={() => setSelectedToken(token)}
                          className={`flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition ${
                            isSelected ? 'bg-[#f4fff8]' : 'hover:bg-[#fafafa]'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {token.logoURI ? (
                              <Image
                                src={sanitizeNextImageSrc(token.logoURI)}
                                alt={token.symbol || ''}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <span className="h-8 w-8 rounded-full bg-[#eceef2]" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {token.symbol}
                              </p>
                              <p className="truncate text-xs text-[#737b8c]">
                                {token.name} ·{' '}
                                {CHAIN_CONFIG[token.chain]?.name || token.chain}
                                {token.walletAddress
                                  ? ` · ${truncateWalletAddress(token.walletAddress)}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {Number(token.balance || 0).toFixed(4)}
                            </p>
                            <p className="text-xs text-[#737b8c]">
                              $
                              {Number(token.marketData?.price || 0).toFixed(4)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-lg border border-[#e7e8ec] bg-white p-4">
              <h2 className="text-lg font-semibold">Review</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">Merchant</dt>
                  <dd className="font-semibold">{intent.merchant.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">Receives</dt>
                  <dd className="font-semibold">
                    {formatCurrency(
                      checkoutAmounts?.merchantReceivesAmount,
                      intent.merchantCurrency.symbol
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">
                    Checkout fee{' '}
                    {checkoutAmounts
                      ? `(${(checkoutAmounts.platformFeeBps / 100).toFixed(2)}%)`
                      : ''}
                  </dt>
                  <dd className="font-semibold">
                    {formatCurrency(
                      checkoutAmounts?.platformFeeAmount,
                      intent.merchantCurrency.symbol
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#edf0f3] pt-3">
                  <dt className="font-semibold text-[#303642]">Total due</dt>
                  <dd className="font-semibold">
                    {formatCurrency(
                      checkoutAmounts?.totalDueAmount,
                      intent.merchantCurrency.symbol
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">You pay</dt>
                  <dd className="font-semibold">
                    {tokenAmountLoading
                      ? 'Quoting...'
                      : selectedToken && tokenAmount
                      ? `${tokenAmount} ${selectedToken.symbol}`
                      : '--'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">Payment</dt>
                  <dd className="font-semibold">
                    {selectedRail === 'lifi'
                      ? 'Same-network USDC'
                      : 'Solana USDC'}
                  </dd>
                </div>
              </dl>

              {quoteSummary?.minOutputAmount ? (
                <div className="mt-4 rounded-md border border-[#dde1e6] bg-[#fafafa] p-3 text-xs font-medium text-[#646b78]">
                  Merchant minimum:{' '}
                  {formatCurrency(
                    quoteSummary.requiredSettlementAmount ||
                      quoteSummary.minOutputAmount,
                    intent.merchantCurrency.symbol
                  )}
                  {quoteSummary.destinationChain
                    ? ` on ${chainNameById(quoteSummary.destinationChain)}`
                    : ''}
                  . Quote minimum:{' '}
                  {formatCurrency(
                    quoteSummary.minOutputAmount,
                    intent.merchantCurrency.symbol
                  )}
                </div>
              ) : null}

              {tokenAmountLoading && selectedToken ? (
                <div className="mt-4 rounded-md border border-[#dde1e6] bg-[#fafafa] p-3 text-xs font-medium text-[#646b78]">
                  Getting a payout-safe {selectedToken.symbol} quote...
                </div>
              ) : null}

              {tokenAmountQuoteError ? (
                <div className="mt-4 rounded-md border border-[#ffd0d0] bg-[#fff5f5] p-3 text-xs font-medium text-[#b42318]">
                  {tokenAmountQuoteError}
                </div>
              ) : null}

              {selectedToken && tokenAmount && !hasSufficientBalance && (
                <div className="mt-4 rounded-md border border-[#ffd0d0] bg-[#fff5f5] p-3 text-xs font-medium text-[#b42318]">
                  Insufficient {selectedToken.symbol} balance.
                </div>
              )}

              {stage !== 'idle' && stage !== 'failed' && (
                <div className="mt-4 rounded-md border border-[#dde1e6] bg-[#fafafa] p-3 text-xs font-medium text-[#646b78]">
                  {stage === 'preparing' && 'Preparing Swop Pay...'}
                  {stage === 'signing' && 'Waiting for wallet signature...'}
                  {stage === 'confirming' && 'Confirming payment...'}
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={
                  busy ||
                  tokenAmountLoading ||
                  Boolean(tokenAmountQuoteError) ||
                  !selectedToken ||
                  !tokenAmount ||
                  !hasSufficientBalance ||
                  !accessToken ||
                  (selectedRail === 'solana' && !solanaWallet?.address) ||
                  (selectedRail === 'lifi' && !selectedToken.walletAddress)
                }
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101114] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Pay with Swop Pay
              </button>
            </aside>
          </section>
        )}
      </div>
      {copyFallback ? (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-2xl rounded-lg border border-[#dfe4eb] bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#101114]">
                Copy manually
              </p>
              <p className="mt-1 text-xs text-[#737b8c]">
                Browser clipboard access was blocked, so the value is selected.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCopyFallback('')}
              className="inline-flex h-8 items-center justify-center rounded-md border border-[#dfe4eb] px-3 text-xs font-semibold"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              ref={copyFallbackInputRef}
              readOnly
              value={copyFallback}
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-md border border-[#dfe4eb] px-3 font-mono text-xs font-semibold outline-none focus:border-[#101114]"
            />
            <button
              type="button"
              onClick={() => {
                copyFallbackInputRef.current?.focus();
                copyFallbackInputRef.current?.select();
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#101114] px-4 text-sm font-semibold text-white"
            >
              Select
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
