'use client';

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  Component,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrivy, useSendTransaction } from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useCreateWallet,
} from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import { ethers } from 'ethers';
import bs58 from 'bs58';
import { useToast } from '@/hooks/use-toast';

import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { CHAIN_ID } from '@/types/wallet-types';
import {
  PrivyLinkedAccount,
  isSolanaWalletAccount,
  isPrivyEmbeddedWallet,
} from '@/types/privy';

import {
  TransactionService,
  USDC_ADDRESS,
  SWOP_ADDRESS,
} from '@/services/transaction-service';
import { useSendFlow } from '@/lib/hooks/useSendFlow';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useNFT } from '@/lib/hooks/useNFT';
import { useUser } from '@/lib/UserContext';

// Custom hooks
import {
  useWalletData,
  useWalletAddresses,
} from './hooks/useWalletData';
import { useTransactionPayload } from './hooks/useTransactionPayload';
import { usePostTransactionEffects } from './hooks/usePostTransactionEffects';
import { TokenTicker } from './token-ticker';

// Constants
import { SUPPORTED_CHAINS, ERROR_MESSAGES } from './constants';

// UI Components
import TokenList from './token/token-list';
import TokenDetails from './token/token-details-view';
import ManageTokenModal from './token/ManageTokenModal';
import RedeemModal from './token/redeem-modal';
import NFTSlider from './nft/nft-list';
import NFTDetailView from './nft/nft-details-view';
import ManageNFTModal from './nft/ManageNFTModal';
import WalletModals from './WalletModals';
import { Toaster } from '../ui/toaster';
import BalanceChart from '../dashboard/BalanceChart';
import { PortfolioAsset } from '../dashboard/PortfolioChart';

// Perps
import {
  PerpsCard,
  PerpsPanel,
  DepositModal,
  useHyperliquidAgent,
} from './perps';
import { useHyperliquidBalanceCheck } from './perps/hooks/useHyperliquidBalanceCheck';
import SwapTokenModal from './SwapTokenModal';

// Predictions (Polymarket)
import WalletPredictionsSection from './WalletPredictionsSection';

// Blinks — redeemable token links (matches design's WireG screen 6)
import BlinksSection from './BlinksSection';

// Stores
import { useBalanceVisibilityStore } from '@/zustandStore/useBalanceVisibilityStore';

// Utilities
import Cookies from 'js-cookie';
import { calculateTransactionAmount } from '@/lib/utils/transactionUtils';
import {
  ArrowRight,
  Coins,
  Eye,
  EyeOff,
  Gift,
  ImageIcon,
  MoreHorizontal,
} from 'lucide-react';

// Token colors mapping for consistent visual representation
const TOKEN_COLORS: Record<string, string> = {
  SOL: '#10b981',
  SWOP: '#d1fae5',
  ETH: '#047857',
  BTC: '#f59e0b',
  USDC: '#2563eb',
  USDT: '#22c55e',
  BNB: '#eab308',
  XRP: '#06b6d4',
  MATIC: '#8b5cf6',
  POL: '#8b5cf6',
  ARB: '#12aaff',
  default: '#6b7280',
};

const getTokenColor = (symbol: string): string => {
  return TOKEN_COLORS[symbol] || TOKEN_COLORS.default;
};

const HIDDEN_NFTS_KEY = 'hiddenNfts';

const TOKEN_CHAIN_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Ethereum', value: 'ETHEREUM' },
  { label: 'Solana', value: 'SOLANA' },
  { label: 'Base', value: 'BASE' },
  { label: 'Polygon', value: 'POLYGON' },
  { label: 'Arbitrum', value: 'ARBITRUM' },
];

// Section header — matches the wallet design's title + caption + action layout.
function SectionHead({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900">
          {title}
        </h2>
        {caption && (
          <p className="text-[13px] text-gray-500 mt-0.5 tracking-tight">
            {caption}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// Pill-shaped chip used for filters and section actions.
function Chip({
  children,
  active = false,
  onClick,
  className = '',
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-900 border-black/[0.06] hover:border-black/[0.15]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

// Hairline-bordered card matching the design's bento aesthetic.
function BentoCard({
  children,
  className = '',
  padding = '',
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

// Error Boundary for Wallet Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WalletErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Wallet component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Wallet Error
            </h2>
            <p className="text-red-600 mb-4">
              {this.state.error?.message ||
                'Something went wrong loading your wallet'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function WalletContent() {
  return (
    <WalletErrorBoundary>
      <WalletContentInner />
    </WalletErrorBoundary>
  );
}

const WalletContentInner = () => {
  // UI state
  const [selectedToken, setSelectedToken] =
    useState<TokenData | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  // QR code modals state
  const [walletQRModalOpen, setWalletQRModalOpen] = useState(false);
  const [walletQRShareModalOpen, setWalletQRShareModalOpen] =
    useState(false);
  const [walletShareAddress, setWalletShareAddress] = useState('');
  const [qrcodeShareUrl, setQrcodeShareUrl] = useState('');
  const [QRCodeShareModalOpen, setQRCodeShareModalOpen] =
    useState(false);

  // Section management state (lifted from the old AssetsTab)
  const [tokenChain, setTokenChain] = useState<string>('all');
  const [manageTokensOpen, setManageTokensOpen] = useState(false);
  const [manageNFTModalOpen, setManageNFTModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [assetsMenuOpen, setAssetsMenuOpen] = useState(false);
  const [hiddenNfts, setHiddenNfts] = useState<Set<string>>(
    new Set(),
  );

  const { showBalance, toggleBalance } = useBalanceVisibilityStore();

  const [perpsPanelOpen, setPerpsPanelOpen] = useState(false);
  const [perpsDepositOpen, setPerpsDepositOpen] = useState(false);
  // Coin requested by the row the user clicked in PerpsCard; null = let the
  // panel use its own default. Cleared back to null on close so the next
  // top-level "Trade" press doesn't re-open on a stale coin.
  const [perpsInitialCoin, setPerpsInitialCoin] = useState<
    string | null
  >(null);

  const openPerpsPanel = (coin?: string) => {
    setPerpsInitialCoin(coin ?? null);
    setPerpsPanelOpen(true);
  };

  const closePerpsPanel = () => {
    setPerpsPanelOpen(false);
    setPerpsInitialCoin(null);
  };

  // Hyperliquid agent — lives here so the ExchangeClient persists across
  // PerpsPanel open/close cycles and never triggers repeated sign messages.
  const hlAgent = useHyperliquidAgent();

  // Balance check — shared between PerpsPanel (gates approveAgent) and
  // DepositModal (starts polling after a deposit tx is submitted).
  const {
    status: hlDepositStatus,
    check: hlRecheckBalance,
    startPolling: hlStartDepositPolling,
  } = useHyperliquidBalanceCheck(hlAgent.masterAddress);

  const [arbitrumBridgeOpen, setArbitrumBridgeOpen] = useState(false);

  // Ref to track wallet creation attempts
  const walletCreationAttempted = useRef(false);
  const assetsMenuRef = useRef<HTMLDivElement>(null);

  // Hooks
  const {
    authenticated,
    ready,
    user: PrivyUser,
    getAccessToken,
  } = usePrivy();

  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();

  // Find the first Solana wallet with a valid address
  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    return directSolanaWallets[0];
  }, [solanaReady, directSolanaWallets]);

  const { createWallet } = useCreateWallet();

  // Privy's native sponsored transaction hooks
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { sendTransaction: sendEVMTransaction } =
    useSendTransaction();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  // Custom hooks
  const walletData = useWalletData(authenticated, ready, PrivyUser);
  const { solWalletAddress, evmWalletAddress } =
    useWalletAddresses(walletData);
  const { payload } = useTransactionPayload(user);
  const {
    handlePointsUpdate,
    handleFeedPost,
    handleSocketNotification,
  } = usePostTransactionEffects();

  const {
    sendFlow,
    setSendFlow,
    sendLoading,
    setSendLoading,
    handleAmountConfirm,
    handleRecipientSelect,
    handleSendClick,
    handleNFTNext,
    resetSendFlow,
  } = useSendFlow();

  // Initialize access token and create Solana wallet
  useEffect(() => {
    // Get access token from cookies
    const token = Cookies.get('access-token');
    if (token && token !== accessToken) {
      setAccessToken(token);
    }
  }, [accessToken]);

  // Solana wallet auto-creation.
  // Persists the "already attempted" flag in localStorage so it survives
  // component unmount/remount cycles (Next.js page navigation), which
  // previously caused createWallet() to be called on every visit and
  // accumulated duplicate embedded wallets.
  useEffect(() => {
    if (!authenticated || !ready || !PrivyUser) return;

    const storageKey = `sol-wallet-created:${PrivyUser.id}`;
    const alreadyAttempted = localStorage.getItem(storageKey) === '1';
    if (alreadyAttempted || walletCreationAttempted.current) return;

    const linkedAccounts = (PrivyUser.linkedAccounts ||
      []) as PrivyLinkedAccount[];
    const hasExistingSolanaWallet = linkedAccounts.some(
      (account) =>
        isSolanaWalletAccount(account) &&
        isPrivyEmbeddedWallet(account),
    );

    if (hasExistingSolanaWallet) {
      // Wallet already exists — stamp the flag so we never check again.
      localStorage.setItem(storageKey, '1');
      return;
    }

    walletCreationAttempted.current = true;
    localStorage.setItem(storageKey, '1');

    createWallet()
      .then(() => {
        console.log('Solana wallet created successfully');
      })
      .catch((error) => {
        console.error('Failed to create Solana wallet:', error);
        // Remove the flag so the user can retry on next login.
        localStorage.removeItem(storageKey);
        walletCreationAttempted.current = false;
        toast({
          variant: 'destructive',
          title: 'Wallet Creation Failed',
          description:
            'Failed to create Solana wallet. Please refresh and try again.',
        });
      });
  }, [authenticated, ready, PrivyUser, createWallet, toast]);

  // Hidden NFT persistence (lifted from the old AssetsTab).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_NFTS_KEY);
      if (stored) setHiddenNfts(new Set(JSON.parse(stored)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      HIDDEN_NFTS_KEY,
      JSON.stringify([...hiddenNfts]),
    );
  }, [hiddenNfts]);

  const toggleNftVisibility = useCallback((nftId: string) => {
    setHiddenNfts((prev) => {
      const next = new Set(prev);
      if (next.has(nftId)) next.delete(nftId);
      else next.add(nftId);
      return next;
    });
  }, []);

  // Outside-click for the assets menu dropdown.
  useEffect(() => {
    if (!assetsMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        assetsMenuRef.current &&
        !assetsMenuRef.current.contains(e.target as Node)
      ) {
        setAssetsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, [assetsMenuOpen]);

  // Data fetching hooks
  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
    refetch: refetchTokens,
  } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS,
  );

  const {
    nfts,
    loading: nftLoading,
    error: nftError,
    refetch: refetchNFTs,
  } = useNFT(solWalletAddress, evmWalletAddress, SUPPORTED_CHAINS);

  // Filter tokens by selected chain chip.
  const filteredTokens = useMemo(() => {
    if (tokenChain === 'all') return tokens;
    return tokens.filter(
      (t) =>
        (t.chain || '').toUpperCase() === tokenChain.toUpperCase(),
    );
  }, [tokens, tokenChain]);

  const visibleNftCount = useMemo(
    () =>
      ((nfts || []) as unknown as NFT[]).filter(
        (n) => !hiddenNfts.has(String(n.tokenId ?? '')),
      ).length,
    [nfts, hiddenNfts],
  );

  // Create a stable hash of portfolio data
  const portfolioHash = useMemo(() => {
    if (!tokens || tokens.length === 0) return 'empty';

    // Only hash the data that affects portfolio visualization
    return tokens
      .map(
        (t) =>
          `${t.symbol}:${t.balance}:${t.marketData?.price || '0'}`,
      )
      .sort()
      .join('|');
  }, [tokens]);

  // Memoized portfolio summary
  const portfolioSummary = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return {
        assets: [] as PortfolioAsset[],
        totalBalance: 0,
        formattedBalance: '0.00',
      };
    }

    let total = 0;
    const assetsWithValue: Array<{
      name: string;
      value: number;
      color: string;
      amount: string;
    }> = [];

    for (const token of tokens) {
      const balance = parseFloat(token.balance || '0');
      const price = parseFloat(token.marketData?.price || '0');
      const value = balance * price;

      if (value <= 0) continue;

      total += value;

      assetsWithValue.push({
        name: token.symbol,
        value: value,
        color: getTokenColor(token.symbol),
        amount: `${balance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })} ${token.symbol}`,
      });
    }

    assetsWithValue.sort((a, b) => b.value - a.value);

    const topAssets = assetsWithValue.slice(0, 5);
    const otherAssets = assetsWithValue.slice(5);
    const assets: PortfolioAsset[] = [...topAssets];

    if (otherAssets.length > 0) {
      const othersValue = otherAssets.reduce(
        (sum, asset) => sum + asset.value,
        0,
      );
      assets.push({
        name: 'Others',
        value: othersValue,
        color: '#94a3b8',
        amount: `${otherAssets.length} tokens`,
      });
    }

    return {
      assets,
      totalBalance: total,
      formattedBalance: total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioHash]);

  const totalBalance = portfolioSummary.totalBalance;

  const nativeTokenPrice = useMemo(
    () =>
      tokens.find((token) => token.isNative)?.marketData?.price ||
      '0',
    [tokens],
  );

  const solBalance = useMemo(() => {
    const solToken = tokens.find(
      (token) =>
        token.isNative && token.chain?.toUpperCase() === 'SOLANA',
    );
    return solToken ? parseFloat(solToken.balance) || 0 : 0;
  }, [tokens]);

  const currentWalletAddress = useMemo(
    () => evmWalletAddress || solWalletAddress,
    [evmWalletAddress, solWalletAddress],
  );

  // Transaction execution
  const executeTransaction = useCallback(async () => {
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!rpcUrl) {
        throw new Error(
          'Solana RPC URL not configured. Please check environment settings.',
        );
      }

      const connection = new Connection(rpcUrl, 'confirmed');

      const isSolanaTransaction =
        sendFlow.token?.chain?.toUpperCase() === 'SOLANA' ||
        sendFlow.network.toUpperCase() === 'SOLANA';

      if (isSolanaTransaction) {
        // Verify authentication before signing
        if (!authenticated) {
          throw new Error(
            'Please log in to send transactions. Your session may have expired.',
          );
        }

        let privyAccessToken: string | null = null;
        try {
          privyAccessToken = await getAccessToken();
        } catch (tokenError) {
          throw new Error(
            'Authentication session expired. Please refresh the page and log in again.',
          );
        }

        if (!privyAccessToken) {
          throw new Error(
            'Authentication token not available. Please refresh the page and log in again.',
          );
        }

        if (!selectedSolanaWallet) {
          const linkedAccounts = (PrivyUser?.linkedAccounts ||
            []) as PrivyLinkedAccount[];
          const hasSolanaAccount = linkedAccounts.some(
            isSolanaWalletAccount,
          );

          if (hasSolanaAccount) {
            throw new Error(
              'Solana wallet found in account but not accessible. Please refresh the page and try again.',
            );
          } else {
            throw new Error(
              'No Solana wallet found. Please connect a Solana wallet.',
            );
          }
        }

        if (!selectedSolanaWallet.address) {
          throw new Error(
            'Solana wallet address is not available. Please refresh the page and try again.',
          );
        }

        try {
          await connection.getLatestBlockhash();
        } catch (rpcError) {
          throw new Error(
            'Unable to connect to Solana network. Please check your connection and try again.',
          );
        }
      } else if (!selectedSolanaWallet) {
        // Non-Solana transaction but still log for debugging
        console.log('=== Non-Solana Transaction ===');
      }

      let hash = '';

      if (sendFlow.nft) {
        // Handle NFT transfer
        if (sendFlow.network.toUpperCase() === 'SOLANA') {
          // Build Solana NFT transaction and send via Privy with gas sponsorship
          const nftTransaction =
            await TransactionService.buildSolanaNFTTransfer(
              selectedSolanaWallet,
              sendFlow,
              connection,
            );

          const serializedNFTTransaction = nftTransaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });

          try {
            const result = await signAndSendTransaction({
              transaction: new Uint8Array(serializedNFTTransaction),
              wallet: selectedSolanaWallet!,
              options: { sponsor: false },
            });
            hash = bs58.encode(result.signature);
          } catch (privyError) {
            return {
              success: false,
              error:
                privyError instanceof Error
                  ? privyError.message
                  : ERROR_MESSAGES.TRANSACTION_FAILED,
            };
          }
        } else {
          // EVM NFT transfer via Privy with gas sponsorship
          const chainId =
            CHAIN_ID[sendFlow.network as keyof typeof CHAIN_ID];

          let nftData: string;
          if (sendFlow.nft?.tokenType === 'ERC721') {
            const erc721Interface = new ethers.Interface([
              'function transferFrom(address from, address to, uint256 tokenId)',
            ]);
            nftData = erc721Interface.encodeFunctionData(
              'transferFrom',
              [
                evmWalletAddress,
                sendFlow.recipient?.address,
                sendFlow.nft.tokenId,
              ],
            );
          } else if (sendFlow.nft?.tokenType === 'ERC1155') {
            const erc1155Interface = new ethers.Interface([
              'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
            ]);
            nftData = erc1155Interface.encodeFunctionData(
              'safeTransferFrom',
              [
                evmWalletAddress,
                sendFlow.recipient?.address,
                sendFlow.nft.tokenId,
                1,
                '0x',
              ],
            );
          } else {
            throw new Error('Unsupported NFT type');
          }

          try {
            const result = await sendEVMTransaction(
              {
                to: sendFlow.nft.contract as `0x${string}`,
                data: nftData as `0x${string}`,
                chainId,
              },
              { sponsor: false },
            );
            hash = result.hash;
          } catch (evmError) {
            return {
              success: false,
              error:
                evmError instanceof Error
                  ? evmError.message
                  : ERROR_MESSAGES.TRANSACTION_FAILED,
            };
          }
        }
        refetchNFTs();
      } else if (sendFlow.token) {
        // Handle token transfer
        if (sendFlow.token.chain.toUpperCase() === 'SOLANA') {
          // Use Privy's native gas sponsorship

          // Build the transaction without sending
          const transaction =
            await TransactionService.buildSolanaTokenTransfer(
              selectedSolanaWallet,
              sendFlow,
              connection,
            );

          // Use Privy's sendTransaction with sponsor: true
          // Transaction must be passed as Uint8Array per Privy docs
          const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });

          try {
            const result = await signAndSendTransaction({
              transaction: new Uint8Array(serializedTransaction),
              wallet: selectedSolanaWallet!,
              options: {
                sponsor: false,
              },
            });

            hash = bs58.encode(result.signature);
          } catch (privyError) {
            return {
              success: false,
              error:
                privyError instanceof Error
                  ? privyError.message
                  : ERROR_MESSAGES.TRANSACTION_FAILED,
            };
          }
        } else {
          // EVM token transfer via Privy with gas sponsorship
          const chainId =
            CHAIN_ID[sendFlow.network as keyof typeof CHAIN_ID];

          try {
            if (!sendFlow.token?.address) {
              // Native token transfer (ETH/MATIC/etc.)
              const result = await sendEVMTransaction(
                {
                  to: sendFlow.recipient?.address as `0x${string}`,
                  value: ethers.parseEther(sendFlow.amount),
                  chainId,
                },
                { sponsor: false },
              );
              hash = result.hash;
            } else {
              // ERC20 token transfer
              const erc20Interface = new ethers.Interface([
                'function transfer(address to, uint256 amount) returns (bool)',
              ]);
              const amountInWei = ethers.parseUnits(
                sendFlow.amount,
                sendFlow.token.decimals,
              );
              const tokenData = erc20Interface.encodeFunctionData(
                'transfer',
                [sendFlow.recipient?.address, amountInWei],
              );
              const result = await sendEVMTransaction(
                {
                  to: sendFlow.token.address as `0x${string}`,
                  data: tokenData as `0x${string}`,
                  chainId,
                },
                { sponsor: false },
              );
              hash = result.hash;
            }
          } catch (evmError) {
            return {
              success: false,
              error:
                evmError instanceof Error
                  ? evmError.message
                  : ERROR_MESSAGES.TRANSACTION_FAILED,
            };
          }
        }
      }

      return { success: true, hash };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.UNKNOWN_ERROR,
      };
    }
  }, [
    solanaReady,
    directSolanaWallets,
    sendFlow,
    PrivyUser,
    evmWalletAddress,
    refetchNFTs,
    signAndSendTransaction,
    sendEVMTransaction,
    selectedSolanaWallet,
    authenticated,
    getAccessToken,
  ]);

  // Main transaction handler
  const handleSendConfirm = useCallback(async () => {
    if (
      (!sendFlow.token && !sendFlow.nft) ||
      !sendFlow.recipient ||
      !sendFlow.amount
    ) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: ERROR_MESSAGES.MISSING_TRANSACTION_INFO,
      });
      return;
    }

    setSendLoading(true);

    try {
      const result = await executeTransaction();

      if (!result.success) {
        throw new Error(
          result.error || ERROR_MESSAGES.TRANSACTION_FAILED,
        );
      }

      await Promise.allSettled([
        handlePointsUpdate(sendFlow.recipient),
        result.hash && accessToken
          ? handleFeedPost(
              result.hash,
              sendFlow,
              Number(calculateTransactionAmount(sendFlow)),
              currentWalletAddress,
              payload,
              accessToken,
            )
          : Promise.resolve(),
      ]);

      if (result.hash) {
        handleSocketNotification(
          result.hash,
          sendFlow,
          calculateTransactionAmount,
        );
      }

      setSendFlow((prev) => ({
        ...prev,
        hash: result.hash || '',
        step: 'success',
      }));

      // Invalidate the transaction cache so the new outgoing tx appears
      // immediately without requiring a page reload.
      // Solana confirms in ~1s; EVM chains take longer so we refetch twice.
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }, 5000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.SEND_TRANSACTION_FAILED,
      });
      resetSendFlow();
    } finally {
      setSendLoading(false);
    }
  }, [
    sendFlow,
    setSendLoading,
    executeTransaction,
    handlePointsUpdate,
    handleFeedPost,
    handleSocketNotification,
    payload,
    accessToken,
    currentWalletAddress,
    toast,
    resetSendFlow,
    setSendFlow,
  ]);

  // Memoized event handlers
  const handleTokenSelect = useCallback(
    (token: TokenData) => setSelectedToken(token),
    [],
  );

  const handleSelectNFT = useCallback((nft: NFT) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  }, []);

  const handleCloseNFTModal = useCallback(() => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  }, []);

  const handleNFTNextClick = useCallback(() => {
    if (selectedNFT) {
      handleNFTNext(selectedNFT);
      handleCloseNFTModal();
    }
  }, [selectedNFT, handleNFTNext, handleCloseNFTModal]);

  const handleBack = useCallback(() => setSelectedToken(null), []);

  const handleTokenSend = useCallback(
    (token: TokenData) => {
      setSelectedToken(null);
      handleSendClick(token);
    },
    [handleSendClick],
  );

  const handleQRClick = useCallback(
    () => setWalletQRModalOpen(true),
    [],
  );

  const handleAssetSelect = useCallback(
    () =>
      setSendFlow((prev) => ({
        ...prev,
        step: 'select-method',
      })),
    [setSendFlow],
  );

  const tokensCaption = `${tokens?.length ?? 0} ${
    (tokens?.length ?? 0) === 1 ? 'asset' : 'assets'
  } across ${SUPPORTED_CHAINS.length} chains`;

  const collectiblesCaption = `${visibleNftCount} ${
    visibleNftCount === 1 ? 'item' : 'items'
  }${hiddenNfts.size > 0 ? ` · ${hiddenNfts.size} hidden` : ''}`;

  const assetsMenuItems = [
    {
      icon: <Coins className="w-4 h-4" />,
      label: 'Manage Tokens',
      onClick: () => {
        setManageTokensOpen(true);
        setAssetsMenuOpen(false);
      },
    },
    {
      icon: showBalance ? (
        <EyeOff className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      ),
      label: showBalance ? 'Hide Balance' : 'Show Balance',
      onClick: () => {
        toggleBalance();
        setAssetsMenuOpen(false);
      },
    },
    {
      icon: <ImageIcon className="w-4 h-4" />,
      label: 'Manage NFT',
      onClick: () => {
        setManageNFTModalOpen(true);
        setAssetsMenuOpen(false);
      },
    },
    {
      icon: <Gift className="w-4 h-4" />,
      label: 'Create Redeem',
      onClick: () => {
        setRedeemModalOpen(true);
        setAssetsMenuOpen(false);
      },
    },
  ];

  return (
    <div className="w-full">
      <div className="max-w-[855px] w-full mx-auto pb-8">
        {/* <TokenTicker /> */}

        {/* ───────── BALANCE HERO ───────── */}
        <BentoCard className="my-4">
          <BalanceChart
            userId={user?._id}
            currency="$"
            totalBalance={totalBalance}
            onSelectAsset={handleAssetSelect}
            onQRClick={handleQRClick}
            walletData={walletData || []}
            tokens={tokens}
            accessToken={accessToken}
            onTokenRefresh={refetchTokens}
            isButtonVisible={true}
          />
        </BentoCard>

        {/* ───────── TOKENS ───────── */}
        <section className="mt-8">
          <SectionHead
            title="Tokens"
            caption={tokensCaption}
            action={
              <>
                <div className="hidden sm:flex items-center gap-1.5">
                  {TOKEN_CHAIN_FILTERS.slice(0, 4).map((c) => (
                    <Chip
                      key={c.value}
                      active={tokenChain === c.value}
                      onClick={() => setTokenChain(c.value)}
                    >
                      {c.label}
                    </Chip>
                  ))}
                </div>
                <div className="relative" ref={assetsMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAssetsMenuOpen((v) => !v)}
                    aria-label="Asset settings"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-black/[0.06] bg-white text-gray-700 hover:border-black/[0.15] transition"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {assetsMenuOpen && (
                    <div className="absolute right-0 top-9 z-50 w-44 bg-white border border-black/[0.06] rounded-xl shadow-lg py-1 overflow-hidden">
                      {assetsMenuItems.map((item) => (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <span className="text-gray-500">
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            }
          />
          <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
            {TOKEN_CHAIN_FILTERS.map((c) => (
              <Chip
                key={c.value}
                active={tokenChain === c.value}
                onClick={() => setTokenChain(c.value)}
              >
                {c.label}
              </Chip>
            ))}
          </div>
          <BentoCard>
            <TokenList
              tokens={filteredTokens as unknown as TokenData[]}
              loading={tokenLoading}
              error={tokenError as Error}
              onSelectToken={handleTokenSelect}
            />
          </BentoCard>
        </section>

        {/* ───────── PERPS ───────── */}
        <section className="mt-8">
          <SectionHead
            title="Perps"
            caption="Open positions and margin account"
            action={
              <Chip onClick={() => openPerpsPanel()}>
                Trade
                <ArrowRight className="w-3 h-3" />
              </Chip>
            }
          />
          <PerpsCard
            masterAddress={hlAgent.masterAddress ?? undefined}
            isReconnecting={hlAgent.isReconnecting}
            onOpenTrading={openPerpsPanel}
            onBridgeToArbitrum={() => setArbitrumBridgeOpen(true)}
            onDepositSubmitted={hlStartDepositPolling}
          />
        </section>

        {/* ───────── PREDICTIONS ───────── */}
        <WalletPredictionsSection />

        {/* ───────── BLINKS ───────── */}
        <BlinksSection />

        {/* ───────── COLLECTIBLES ───────── */}
        <section className="mt-8">
          <SectionHead
            title="Collectibles"
            caption={collectiblesCaption}
            action={
              <Chip onClick={() => setManageNFTModalOpen(true)}>
                Manage
                <ArrowRight className="w-3 h-3" />
              </Chip>
            }
          />
          <BentoCard padding="p-4">
            <NFTSlider
              onSelectNft={handleSelectNFT}
              address={currentWalletAddress}
              nfts={nfts as unknown as NFT[]}
              loading={nftLoading}
              error={nftError as Error | null}
              refetch={refetchNFTs}
              hiddenNfts={hiddenNfts}
            />
          </BentoCard>
        </section>

        {/* All Modals */}
        <WalletModals
          sendFlow={sendFlow}
          resetSendFlow={resetSendFlow}
          tokens={tokens as unknown as TokenData[]}
          nfts={nfts as unknown as NFT[]}
          handleSendClick={handleSendClick}
          handleNFTNext={handleNFTNext}
          handleAmountConfirm={handleAmountConfirm}
          handleRecipientSelect={handleRecipientSelect}
          handleSendConfirm={handleSendConfirm}
          network={sendFlow.network}
          currentWalletAddress={currentWalletAddress}
          sendLoading={sendLoading}
          nativeTokenPrice={Number(nativeTokenPrice) || 0}
          walletQRModalOpen={walletQRModalOpen}
          setWalletQRModalOpen={setWalletQRModalOpen}
          walletData={walletData || []}
          setWalletShareAddress={setWalletShareAddress}
          setWalletQRShareModalOpen={setWalletQRShareModalOpen}
          walletQRShareModalOpen={walletQRShareModalOpen}
          walletShareAddress={walletShareAddress}
          setQrcodeShareUrl={setQrcodeShareUrl}
          setQRCodeShareModalOpen={setQRCodeShareModalOpen}
          QRCodeShareModalOpen={QRCodeShareModalOpen}
          qrcodeShareUrl={qrcodeShareUrl}
          setSendFlow={setSendFlow}
          solBalance={solBalance}
        />

        {/* Token details panel — full-screen overlay like PerpsPanel,
            so the layered Swap / QR modals (z-50) appear above it. */}
        {selectedToken && (
          <TokenDetails
            token={selectedToken}
            onBack={handleBack}
            onSend={handleTokenSend}
          />
        )}

        {/* NFT details modal */}
        {selectedNFT && (
          <NFTDetailView
            isOpen={isNFTModalOpen}
            onClose={handleCloseNFTModal}
            nft={selectedNFT}
            onNext={handleNFTNextClick}
          />
        )}

        {/* Manage tokens modal */}
        <ManageTokenModal
          isOpen={manageTokensOpen}
          onClose={() => setManageTokensOpen(false)}
          tokens={tokens as unknown as TokenData[]}
        />

        {/* Manage NFTs modal */}
        <ManageNFTModal
          isOpen={manageNFTModalOpen}
          onClose={() => setManageNFTModalOpen(false)}
          nfts={nfts as unknown as NFT[]}
          hiddenNfts={hiddenNfts}
          onToggle={toggleNftVisibility}
        />

        {/* Create redeem modal */}
        <RedeemModal
          isOpen={redeemModalOpen}
          onClose={() => setRedeemModalOpen(false)}
          mode="wallet"
        />

        {/* Perps full-screen panel */}
        {perpsPanelOpen && (
          <PerpsPanel
            agentClient={hlAgent.agentClient}
            masterAddress={hlAgent.masterAddress}
            isInitialized={hlAgent.isInitialized}
            isInitializing={hlAgent.isInitializing}
            isReconnecting={hlAgent.isReconnecting}
            agentError={hlAgent.error}
            initializeAgent={hlAgent.initializeAgent}
            initialCoin={perpsInitialCoin}
            onClose={closePerpsPanel}
            onOpenDeposit={() => {
              setPerpsDepositOpen(true);
              // Begin polling so PerpsPanel re-enables "Enable Trading"
              // automatically once the bridge settles.
              hlStartDepositPolling();
            }}
            depositStatus={hlDepositStatus}
            onRecheckBalance={hlRecheckBalance}
          />
        )}

        {/* Perps Deposit Modal — rendered at root so fixed positioning is unobstructed */}
        <DepositModal
          isOpen={perpsDepositOpen}
          onClose={() => setPerpsDepositOpen(false)}
          masterAddress={hlAgent.masterAddress}
          onBridgeToArbitrum={() => {
            setPerpsDepositOpen(false);
            setArbitrumBridgeOpen(true);
          }}
          onDepositSubmitted={hlStartDepositPolling}
        />

        {/* Arbitrum Bridge Modal — uses existing SwapTokenModal pre-set to Arbitrum USDC */}
        {arbitrumBridgeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setArbitrumBridgeOpen(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Bridge to Arbitrum USDC
                </h2>
                <button
                  onClick={() => setArbitrumBridgeOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <SwapTokenModal
                tokens={tokens}
                defaultReceiveToken={{
                  symbol: 'USDC',
                  name: 'USD Coin',
                  address:
                    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                  decimals: 6,
                  chain: 'ARBITRUM',
                  chainId: 42161,
                  logoURI:
                    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png',
                }}
                defaultReceiveChainId="42161"
                onSwapComplete={() => {
                  setArbitrumBridgeOpen(false);
                  setPerpsDepositOpen(true);
                }}
              />
            </div>
          </div>
        )}

        <Toaster />
      </div>
    </div>
  );
};
