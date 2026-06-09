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
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
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
import type { HyperliquidAgentOrderPrefill } from '@/lib/chat/agentActionHandoff';

// Custom hooks
import {
  getPortfolioEvmWalletInput,
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
import BlinksSection from './BlinksSection';

// Swap (Jupiter limit orders + LiFi/Jupiter market swaps)
import WalletSwapSection from './swap/WalletSwapSection';

// Stores
import { useBalanceVisibilityStore } from '@/zustandStore/useBalanceVisibilityStore';

// Utilities
import { calculateTransactionAmount } from '@/lib/utils/transactionUtils';
import {
  ArrowRight,
  Coins,
  Eye,
  EyeOff,
  Gift,
  ImageIcon,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

// Token colors mapping for consistent visual representation
const TOKEN_COLORS: Record<string, string> = {
  SOL: '#10b981',
  SWOP: '#14b8a6',
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

type RewardWalletData = {
  token?: {
    symbol?: string;
    mint?: string;
    chain?: string;
    decimals?: number;
  };
  claimableAmount?: number;
  claimableUsd?: number;
  pendingAmount?: number;
  pendingUsd?: number;
  claimedAmount?: number;
  claimedUsd?: number;
  lifetimeEarnedAmount?: number;
  lifetimeEarnedUsd?: number;
  lastCreditAt?: string | null;
  lastClaimAt?: string | null;
};

type RewardClaimData = {
  _id?: string;
  amount?: number;
  estimatedUsd?: number;
  destinationWallet?: string;
  status?: string;
  createdAt?: string;
  requestedAt?: string;
};

type SearchParamReader = {
  get: (name: string) => string | null;
};

const CHART_TOKEN_PARAM_KEYS = [
  'chartToken',
  'chartTokenId',
  'chartTokenName',
  'chartTokenImage',
  'chartTokenPrice',
  'chartTokenChange',
  'chartTokenChain',
] as const;

const MARKET_TOKEN_CHAIN_BY_SYMBOL: Partial<
  Record<string, TokenData['chain']>
> = {
  ETH: 'ETHEREUM',
  SOL: 'SOLANA',
  MATIC: 'POLYGON',
  POL: 'POLYGON',
};

const EMPTY_TIME_SERIES: TokenData['timeSeriesData'] = {
  '1H': [],
  '1D': [],
  '1W': [],
  '1M': [],
  '1Y': [],
};

function parseChartNumber(value?: string | null) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePerpsPanelSide(value?: string | null): 'long' | 'short' | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'long' || normalized === 'short'
    ? normalized
    : null;
}

function parsePerpsPanelLeverage(value?: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePerpsPanelCoin(
  params?: SearchParamReader | null,
): string | null {
  const value = params?.get('coin')?.trim();
  return value ? value.toUpperCase() : null;
}

function getChartTokenSymbol(params?: SearchParamReader | null) {
  return params?.get('chartToken')?.trim().toUpperCase() || '';
}

function normalizeChartTokenChain(
  value?: string | null,
): TokenData['chain'] | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  return SUPPORTED_CHAINS.includes(normalized as TokenData['chain'])
    ? (normalized as TokenData['chain'])
    : undefined;
}

function tokenUsdValue(token: TokenData) {
  if (typeof token.value === 'number' && Number.isFinite(token.value)) {
    return token.value;
  }

  const balance = parseFloat(token.balance || '0');
  const price = parseFloat(String(token.marketData?.price || '0'));
  const value = balance * price;
  return Number.isFinite(value) ? value : 0;
}

function findChartWalletToken(
  tokens: TokenData[],
  symbol: string,
  preferredChain?: TokenData['chain'],
) {
  const matches = tokens.filter(
    (token) => token.symbol?.toUpperCase() === symbol,
  );
  if (!matches.length) return null;

  return matches.sort((a, b) => {
    const chainScoreA = preferredChain && a.chain === preferredChain ? 1000 : 0;
    const chainScoreB = preferredChain && b.chain === preferredChain ? 1000 : 0;
    const nativeScoreA = a.isNative ? 100 : 0;
    const nativeScoreB = b.isNative ? 100 : 0;
    return (
      chainScoreB +
      nativeScoreB +
      tokenUsdValue(b) -
      (chainScoreA + nativeScoreA + tokenUsdValue(a))
    );
  })[0];
}

function chartTokenMetadataFromParams(
  params: SearchParamReader,
  symbol: string,
): {
  name: string;
  image: string;
  chain: TokenData['chain'];
  marketId?: string;
  priceText: string;
  changeText: string;
} {
  const name = params.get('chartTokenName')?.trim() || symbol;
  const image = params.get('chartTokenImage')?.trim() || '';
  const price = parseChartNumber(params.get('chartTokenPrice'));
  const change = parseChartNumber(params.get('chartTokenChange'));
  const chain =
    normalizeChartTokenChain(params.get('chartTokenChain')) ||
    MARKET_TOKEN_CHAIN_BY_SYMBOL[symbol] ||
    'ETHEREUM';
  const marketId = params.get('chartTokenId')?.trim() || undefined;
  const priceText = price == null ? '0' : String(price);
  const changeText = change == null ? '0' : String(change);

  return {
    name,
    image,
    chain,
    marketId,
    priceText,
    changeText,
  };
}

function withChartTokenMarketData(
  token: TokenData,
  params: SearchParamReader,
  symbol: string,
): TokenData {
  const metadata = chartTokenMetadataFromParams(params, symbol);

  return {
    ...token,
    name: token.name || metadata.name,
    logoURI:
      token.logoURI || metadata.image || `/assets/crypto-icons/${symbol}.png`,
    marketData: {
      ...(token.marketData || {}),
      id: metadata.marketId,
      symbol,
      name: token.marketData?.name || metadata.name,
      image: token.marketData?.image || metadata.image || undefined,
      price: token.marketData?.price || metadata.priceText,
      change: token.marketData?.change || metadata.changeText,
      priceChangePercentage24h:
        token.marketData?.priceChangePercentage24h || metadata.changeText,
    },
  };
}

function buildMarketOnlyChartToken(
  params: SearchParamReader,
  symbol: string,
): TokenData {
  const metadata = chartTokenMetadataFromParams(params, symbol);

  return {
    name: metadata.name,
    symbol,
    balance: '0',
    decimals: 0,
    address: null,
    logoURI: metadata.image || `/assets/crypto-icons/${symbol}.png`,
    chain: metadata.chain,
    marketData: {
      id: metadata.marketId,
      symbol,
      name: metadata.name,
      image: metadata.image || undefined,
      price: metadata.priceText,
      change: metadata.changeText,
      priceChangePercentage24h: metadata.changeText,
    },
    timeSeriesData: EMPTY_TIME_SERIES,
    isMarketOnly: true,
  };
}

function isSameChartToken(a: TokenData, b: TokenData) {
  if (a.isMarketOnly !== b.isMarketOnly) return false;
  if (a.address || b.address) {
    if (b.marketData?.id && a.marketData?.id !== b.marketData.id) {
      return false;
    }

    return (
      a.address?.toLowerCase() === b.address?.toLowerCase() &&
      a.chain === b.chain
    );
  }

  return (
    a.symbol?.toUpperCase() === b.symbol?.toUpperCase() &&
    a.chain === b.chain &&
    a.marketData?.id === b.marketData?.id
  );
}

function removeChartTokenParams(params: URLSearchParams) {
  const source = params.get('source');
  CHART_TOKEN_PARAM_KEYS.forEach((key) => params.delete(key));
  if (source === 'feedTicker') params.delete('source');
}

function rewardNumber(value?: number | string | null) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function formatRewardAmount(value?: number | string | null) {
  const amount = rewardNumber(value);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount >= 1 ? 4 : 6,
  }).format(amount);
}

function formatRewardUsd(value?: number | string | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rewardNumber(value));
}

function shortenWallet(address?: string | null) {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

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

function RewardsBox({
  rewardWallet,
  pendingClaimCount,
  recentClaims,
  loading,
  claiming,
  error,
  destinationWallet,
  onClaim,
  onRefresh,
}: {
  rewardWallet: RewardWalletData | null;
  pendingClaimCount: number;
  recentClaims: RewardClaimData[];
  loading: boolean;
  claiming: boolean;
  error: string | null;
  destinationWallet: string;
  onClaim: () => void;
  onRefresh: () => void;
}) {
  const claimableAmount = rewardNumber(rewardWallet?.claimableAmount);
  const claimableUsd = rewardNumber(rewardWallet?.claimableUsd);
  const pendingAmount = rewardNumber(rewardWallet?.pendingAmount);
  const pendingUsd = rewardNumber(rewardWallet?.pendingUsd);
  const claimedAmount = rewardNumber(rewardWallet?.claimedAmount);
  const lifetimeAmount = rewardNumber(rewardWallet?.lifetimeEarnedAmount);
  const tokenSymbol = rewardWallet?.token?.symbol || 'SWOP';
  const canClaim = claimableAmount > 0 && Boolean(destinationWallet) && !claiming;
  const latestClaim = recentClaims[0];
  const statusLabel =
    pendingClaimCount > 0
      ? 'Claim pending'
      : claimableAmount > 0
        ? 'Ready'
        : pendingAmount > 0
          ? 'Processing'
          : 'Empty';

  return (
    <section className="mt-6">
      <SectionHead
        title="Rewards"
        caption="SWOP from copy-trade fee buybacks"
        action={
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh rewards"
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-black/[0.06] bg-white text-gray-700 hover:border-black/[0.15] disabled:opacity-50 transition"
            disabled={loading}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        }
      />
      <BentoCard padding="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Claimable
                </p>
                <p className="truncate text-[24px] font-semibold leading-tight text-gray-950">
                  {formatRewardAmount(claimableAmount)} {tokenSymbol}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-gray-500">
              {formatRewardUsd(claimableUsd)} ready after confirmed SWOP
              buybacks.
            </p>
            {error && (
              <p className="mt-2 text-[12px] font-medium text-red-500">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:min-w-[170px]">
            <button
              type="button"
              onClick={onClaim}
              disabled={!canClaim}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gray-950 px-4 text-[13px] font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              <Gift className="h-4 w-4" />
              {claiming ? 'Claiming' : 'Claim SWOP'}
            </button>
            <p className="text-center text-[11px] font-medium text-gray-400">
              {destinationWallet
                ? `To ${shortenWallet(destinationWallet)}`
                : 'Connect a Solana wallet'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-black/[0.06] pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Status
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-gray-900">
              {statusLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Pending
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-gray-900">
              {formatRewardAmount(pendingAmount)} {tokenSymbol}
            </p>
            <p className="text-[11px] text-gray-400">
              {formatRewardUsd(pendingUsd)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Earned
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-gray-900">
              {formatRewardAmount(lifetimeAmount || claimedAmount)} {tokenSymbol}
            </p>
            {latestClaim?.status && (
              <p className="truncate text-[11px] text-gray-400">
                Latest {latestClaim.status}
              </p>
            )}
          </div>
        </div>
      </BentoCard>
    </section>
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
  const [rewardWallet, setRewardWallet] =
    useState<RewardWalletData | null>(null);
  const [recentRewardClaims, setRecentRewardClaims] = useState<
    RewardClaimData[]
  >([]);
  const [pendingRewardClaimCount, setPendingRewardClaimCount] = useState(0);
  const [rewardWalletLoading, setRewardWalletLoading] = useState(false);
  const [rewardWalletError, setRewardWalletError] = useState<string | null>(
    null,
  );
  const [rewardClaimLoading, setRewardClaimLoading] = useState(false);

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
  const [perpsAgentPrefill, setPerpsAgentPrefill] =
    useState<HyperliquidAgentOrderPrefill | null>(null);
  // Coin requested by the row the user clicked in PerpsCard; null = let the
  // panel use its own default. Cleared back to null on close so the next
  // top-level "Trade" press doesn't re-open on a stale coin.
  const [perpsInitialCoin, setPerpsInitialCoin] = useState<
    string | null
  >(null);

  const openPerpsPanel = (coin?: string) => {
    setPerpsInitialCoin(coin ?? null);
    setPerpsAgentPrefill(null);
    setPerpsPanelOpen(true);
  };

  const closePerpsPanel = () => {
    setPerpsPanelOpen(false);
    setPerpsInitialCoin(null);
    setPerpsAgentPrefill(null);
  };

  const [arbitrumBridgeOpen, setArbitrumBridgeOpen] = useState(false);

  // Ref to track wallet creation attempts
  const walletCreationAttempted = useRef(false);
  const rewardWalletRequestRef = useRef(0);
  const assetsMenuRef = useRef<HTMLDivElement>(null);
  const autoOpenedPerpsQueryRef = useRef('');

  // Hooks
  const {
    authenticated,
    ready,
    user: PrivyUser,
    getAccessToken,
  } = usePrivy();

  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();

  const { createWallet } = useCreateWallet();

  // Privy's native sponsored transaction hooks
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { sendTransaction: sendEVMTransaction } =
    useSendTransaction();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, accessToken: userAccessToken } = useUser();
  const accessToken = userAccessToken || '';
  const searchParams = useSearchParams();
  const perpsQueryString = searchParams?.toString() || '';
  const pathname = usePathname();
  const router = useRouter();

  // Custom hooks
  const walletData = useWalletData(
    authenticated,
    ready,
    PrivyUser,
    user,
  );
  const { solWalletAddress, evmWalletAddress, evmWalletAddresses } =
    useWalletAddresses(walletData);
  // Hyperliquid agent — lives here so the ExchangeClient persists across
  // PerpsPanel open/close cycles and never triggers repeated sign messages.
  const hlAgent = useHyperliquidAgent({
    preferredMasterAddress: evmWalletAddress || undefined,
  });
  const portfolioEvmWalletInput = useMemo(
    () =>
      getPortfolioEvmWalletInput(
        evmWalletAddress,
        evmWalletAddresses,
      ),
    [evmWalletAddress, evmWalletAddresses],
  );
  const [loadCollectibles, setLoadCollectibles] = useState(false);
  // Find the Solana wallet that matches the selected wallet-data address.
  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    const selectedAddress = solWalletAddress.toLowerCase();
    return (
      directSolanaWallets.find(
        (wallet) =>
          wallet.address.toLowerCase() === selectedAddress,
      ) ?? directSolanaWallets[0]
    );
  }, [solanaReady, directSolanaWallets, solWalletAddress]);
  const perpsMasterAddress =
    evmWalletAddress || hlAgent.masterAddress || null;

  // Balance check — shared between PerpsPanel (gates approveAgent) and
  // DepositModal (starts polling after a deposit tx is submitted).
  const {
    status: hlDepositStatus,
    check: hlRecheckBalance,
    startPolling: hlStartDepositPolling,
  } = useHyperliquidBalanceCheck(perpsMasterAddress);
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

  useEffect(() => {
    setLoadCollectibles(false);

    if (!solWalletAddress && !evmWalletAddress) return;

    const timeoutId = window.setTimeout(() => {
      setLoadCollectibles(true);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [solWalletAddress, evmWalletAddress]);

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
    portfolioEvmWalletInput,
    SUPPORTED_CHAINS,
  );

  const {
    nfts,
    loading: nftLoading,
    error: nftError,
    refetch: refetchNFTs,
  } = useNFT(solWalletAddress, evmWalletAddress, SUPPORTED_CHAINS, {
    enabled: loadCollectibles,
  });
  const collectiblesPending =
    !loadCollectibles && Boolean(solWalletAddress || evmWalletAddress);

  // Filter tokens by selected chain chip.
  const filteredTokens = useMemo(() => {
    if (tokenChain === 'all') return tokens;
    return tokens.filter(
      (t) =>
        (t.chain || '').toUpperCase() === tokenChain.toUpperCase(),
    );
  }, [tokens, tokenChain]);

  useEffect(() => {
    if (!searchParams) return;

    const symbol = getChartTokenSymbol(searchParams);
    if (!symbol) return;

    const preferredChain = normalizeChartTokenChain(
      searchParams?.get('chartTokenChain'),
    );
    const walletToken = findChartWalletToken(
      tokens as unknown as TokenData[],
      symbol,
      preferredChain,
    );
    const tokenForDetail = walletToken
      ? withChartTokenMarketData(
          walletToken,
          searchParams as SearchParamReader,
          symbol,
        )
      : buildMarketOnlyChartToken(searchParams as SearchParamReader, symbol);

    if (walletToken) {
      setTokenChain(walletToken.chain);
    }

    setSelectedToken((current) => {
      if (current && isSameChartToken(current, tokenForDetail)) {
        return current;
      }
      return tokenForDetail;
    });
  }, [searchParams, tokens]);

  useEffect(() => {
    if (!searchParams || !perpsQueryString) {
      autoOpenedPerpsQueryRef.current = '';
      return;
    }

    const shouldOpenPerps = searchParams.get('perps') === '1';
    if (!shouldOpenPerps) {
      autoOpenedPerpsQueryRef.current = '';
      return;
    }

    if (autoOpenedPerpsQueryRef.current === perpsQueryString) return;

    const coin = parsePerpsPanelCoin(searchParams);
    const side = parsePerpsPanelSide(searchParams.get('side'));
    const leverage = parsePerpsPanelLeverage(searchParams.get('leverage'));
    const now = Date.now();

    setPerpsInitialCoin(coin);
    setPerpsAgentPrefill(
      coin || side || leverage != null
        ? {
            proposalId: `wallet:${now}`,
            proposalNonce: `${now}${Math.floor(Math.random() * 1_000_000)}`,
            coin: coin ?? undefined,
            side: side ?? undefined,
            leverage: leverage ?? undefined,
            orderMode: 'market',
          }
        : null,
    );
    setPerpsPanelOpen(true);
    autoOpenedPerpsQueryRef.current = perpsQueryString;
  }, [perpsMasterAddress, perpsQueryString, searchParams]);

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
          `${t.symbol}:${t.balance}:${t.marketData?.price || '0'}:${(t as any).value ?? '0'}`,
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
      const tokenValue = (token as any).value;
      const backendValue =
        typeof tokenValue === 'number'
          ? tokenValue
          : parseFloat(String(tokenValue ?? '0'));
      const value =
        Number.isFinite(backendValue) && backendValue > 0
          ? backendValue
          : balance * price;

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

  const rewardDestinationWallet = useMemo(
    () =>
      selectedSolanaWallet?.address ||
      solWalletAddress ||
      user?.solanaWallet ||
      user?.solanaAddress ||
      '',
    [selectedSolanaWallet, solWalletAddress, user],
  );

  const fetchRewardWallet = useCallback(async () => {
    if (!authenticated || !accessToken) return;

    const requestId = rewardWalletRequestRef.current + 1;
    rewardWalletRequestRef.current = requestId;
    const isCurrentRequest = () => rewardWalletRequestRef.current === requestId;

    setRewardWalletLoading(true);
    setRewardWalletError(null);

    // The backend (localhost:4000 / API host) is restarted periodically by the
    // sync process, leaving a ~10s window where this client-side fetch throws a
    // native "Failed to fetch". Unlike the rest of the wallet (server actions /
    // React Query), this request runs once on mount, so a single blip used to
    // leave the box stuck. Retry transient failures (network error or 5xx) with
    // a short backoff so it self-heals. Do NOT retry 4xx (e.g. 401) — those are
    // legitimate responses, not transient.
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        // A newer request superseded this one — abandon silently.
        if (!isCurrentRequest()) return;

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/reward-wallet`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          );
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            // Retry only transient server-side failures (5xx); surface 4xx now.
            if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
              await sleep(RETRY_DELAY_MS * attempt);
              continue;
            }
            throw new Error(
              data?.message || data?.error || 'Could not load rewards.',
            );
          }

          if (isCurrentRequest()) {
            setRewardWallet(data.rewardWallet || null);
            setPendingRewardClaimCount(Number(data.pendingClaimCount || 0));
            setRecentRewardClaims(
              Array.isArray(data.recentClaims) ? data.recentClaims : [],
            );
          }
          return;
        } catch (error) {
          // fetch() throws a TypeError on network-level failures (backend
          // mid-restart, offline). Retry those; rethrow once attempts run out.
          const isNetworkError = error instanceof TypeError;
          if (isNetworkError && attempt < MAX_ATTEMPTS) {
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      if (isCurrentRequest()) {
        setRewardWalletError(
          error instanceof Error
            ? error.message
            : 'Could not load rewards.',
        );
      }
    } finally {
      if (isCurrentRequest()) {
        setRewardWalletLoading(false);
      }
    }
  }, [accessToken, authenticated]);

  useEffect(() => {
    fetchRewardWallet();
  }, [fetchRewardWallet]);

  const handleClaimRewards = useCallback(async () => {
    if (!accessToken) {
      toast({
        variant: 'destructive',
        title: 'Rewards unavailable',
        description: 'Please log in again to claim SWOP rewards.',
      });
      return;
    }

    if (!rewardDestinationWallet) {
      toast({
        variant: 'destructive',
        title: 'Solana wallet required',
        description: 'Connect a Solana wallet before claiming SWOP rewards.',
      });
      return;
    }

    setRewardClaimLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/reward-wallet/claim`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destinationWallet: rewardDestinationWallet,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || 'Could not request reward claim.',
        );
      }

      setRewardWallet(data.rewardWallet || null);
      await fetchRewardWallet();
      const paid = data?.claim?.status === 'paid';
      toast({
        title: paid ? 'SWOP claimed' : 'Claim requested',
        description: paid
          ? 'Your SWOP rewards were sent from the rewards vault.'
          : 'Your SWOP reward claim is queued for vault payout.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Claim failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not request reward claim.',
      });
    } finally {
      setRewardClaimLoading(false);
    }
  }, [accessToken, fetchRewardWallet, rewardDestinationWallet, toast]);

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
              options: { sponsor: true },
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
              { sponsor: true },
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
                sponsor: true,
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
                { sponsor: true },
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
                { sponsor: true },
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

  const handleBack = useCallback(() => {
    setSelectedToken(null);

    if (!searchParams || !pathname) return;
    if (!getChartTokenSymbol(searchParams)) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    removeChartTokenParams(nextParams);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

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

  const collectiblesCaption = collectiblesPending
    ? 'Loading items'
    : `${visibleNftCount} ${
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

        <RewardsBox
          rewardWallet={rewardWallet}
          pendingClaimCount={pendingRewardClaimCount}
          recentClaims={recentRewardClaims}
          loading={rewardWalletLoading}
          claiming={rewardClaimLoading}
          error={rewardWalletError}
          destinationWallet={rewardDestinationWallet}
          onClaim={handleClaimRewards}
          onRefresh={fetchRewardWallet}
        />

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

        {/* ───────── SWAP ───────── */}
        <section className="mt-8">
          <SectionHead
            title="Swap"
            caption="Trade tokens at the best route · limit orders"
          />
          <WalletSwapSection
            tokens={tokens}
            accessToken={accessToken}
            onTokenRefresh={refetchTokens}
            solWalletAddress={solWalletAddress}
            evmWalletAddress={evmWalletAddress}
            chains={SUPPORTED_CHAINS}
          />
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
            masterAddress={perpsMasterAddress ?? undefined}
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
              loading={collectiblesPending || nftLoading}
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
            masterClient={hlAgent.masterClient}
            masterAddress={perpsMasterAddress}
            isInitialized={hlAgent.isInitialized}
            isInitializing={hlAgent.isInitializing}
            isReconnecting={hlAgent.isReconnecting}
            agentError={hlAgent.error}
            initializeAgent={hlAgent.initializeAgent}
            initialCoin={perpsInitialCoin}
            agentOrderPrefill={perpsAgentPrefill}
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
          masterAddress={perpsMasterAddress}
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
