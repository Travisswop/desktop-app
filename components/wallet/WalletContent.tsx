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
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useCreateWallet,
} from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { useToast } from '@/hooks/use-toast';

import { ChainType, TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { CHAIN_ID } from '@/types/wallet-types';
import {
  PrivyLinkedAccount,
  isSolanaWalletAccount,
  isEthereumWalletAccount,
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
import NFTSlider from './nft/nft-list';
import TokenDetails from './token/token-details-view';
import NFTDetailView from './nft/nft-details-view';
import WalletModals from './WalletModals';
import { Toaster } from '../ui/toaster';
import RedeemTokenList from './redeem/token-list';
import BalanceChart from '../dashboard/BalanceChart';
import PortfolioChart, {
  PortfolioAsset,
} from '../dashboard/PortfolioChart';
import {
  PortfolioChartSkeleton,
  PortfolioEmptyState,
} from './PortfolioStates';
// Utilities
import Cookies from 'js-cookie';
import { calculateTransactionAmount } from '@/lib/utils/transactionUtils';
import { Loader } from 'lucide-react';
import TransactionList from './transaction/transaction-list';
import { ScrollArea } from '../ui/scroll-area';
import CustomModal from '../modal/CustomModal';
import { BsThreeDots } from 'react-icons/bs';
import WalletAssetsSettings from './WalletAssetsSettings';
import { PredictionMarketsTab } from './prediction-markets';

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
  default: '#6b7280',
};

const getTokenColor = (symbol: string): string => {
  return TOKEN_COLORS[symbol] || TOKEN_COLORS.default;
};

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
    // TODO: Send to error tracking service (Sentry, etc.)
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

  const [walletSetting, setWalletSetting] = useState(false);

  // Ref to track wallet creation attempts
  const walletCreationAttempted = useRef(false);

  // Hooks
  const { authenticated, ready, user: PrivyUser, getAccessToken } =
    usePrivy();

  const { wallets: ethWallets } = useWallets();

  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();

  // Find the first Solana wallet with a valid address
  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;

    return directSolanaWallets[0];
  }, [solanaReady, directSolanaWallets]);

  const { createWallet } = useCreateWallet();

  // Privy's native sponsored transaction hook
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const { toast } = useToast();
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

    // Create Solana wallet if authenticated and doesn't exist
    if (
      authenticated &&
      ready &&
      PrivyUser &&
      !walletCreationAttempted.current
    ) {
      const linkedAccounts = (PrivyUser.linkedAccounts ||
        []) as PrivyLinkedAccount[];
      const hasExistingSolanaWallet = linkedAccounts.some(
        (account) =>
          isSolanaWalletAccount(account) &&
          isPrivyEmbeddedWallet(account)
      );

      if (!hasExistingSolanaWallet) {
        walletCreationAttempted.current = true;

        createWallet()
          .then(() => {
            console.log('Solana wallet created successfully');
          })
          .catch((error) => {
            console.error('Failed to create Solana wallet:', error);
            walletCreationAttempted.current = false; // Allow retry on next auth
            toast({
              variant: 'destructive',
              title: 'Wallet Creation Failed',
              description:
                'Failed to create Solana wallet. Please refresh and try again.',
            });
          });
      }
    }

    // Reset attempt flag when user logs out
    if (!authenticated) {
      walletCreationAttempted.current = false;
    }
  }, [authenticated, ready, PrivyUser, accessToken, toast]);

  // Data fetching hooks
  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
    refetch: refetchTokens,
  } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS
  );

  const {
    nfts,
    loading: nftLoading,
    error: nftError,
    refetch: refetchNFTs,
  } = useNFT(solWalletAddress, evmWalletAddress, SUPPORTED_CHAINS);

  // Create a stable hash of portfolio data to prevent unnecessary recalculations
  const portfolioHash = useMemo(() => {
    if (!tokens || tokens.length === 0) return 'empty';

    // Only hash the data that affects portfolio visualization
    return tokens
      .map(
        (t) =>
          `${t.symbol}:${t.balance}:${t.marketData?.price || '0'}`
      )
      .sort()
      .join('|');
  }, [tokens]);

  // Memoized portfolio summary (combines totalBalance and portfolioData)
  const portfolioSummary = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return {
        assets: [],
        totalBalance: 0,
        formattedBalance: '0.00',
      };
    }

    // Single pass to calculate everything
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

      if (value <= 0) continue; // Skip zero-value tokens early

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

    // Sort once after filtering
    assetsWithValue.sort((a, b) => b.value - a.value);

    // Take top 5 and group rest
    const topAssets = assetsWithValue.slice(0, 5);
    const otherAssets = assetsWithValue.slice(5);
    const assets: PortfolioAsset[] = [...topAssets];

    if (otherAssets.length > 0) {
      const othersValue = otherAssets.reduce(
        (sum, asset) => sum + asset.value,
        0
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
  }, [portfolioHash]); // Intentionally use hash to prevent recalculation when tokens reference changes

  // For backward compatibility, extract totalBalance
  const totalBalance = portfolioSummary.totalBalance;

  const nativeTokenPrice = useMemo(
    () =>
      tokens.find((token) => token.isNative)?.marketData?.price ||
      '0',
    [tokens]
  );

  // Get the native SOL balance for rent calculations
  const solBalance = useMemo(() => {
    const solToken = tokens.find(
      (token) =>
        token.isNative && token.chain?.toUpperCase() === 'SOLANA'
    );
    return solToken ? parseFloat(solToken.balance) || 0 : 0;
  }, [tokens]);

  const currentWalletAddress = useMemo(
    () => evmWalletAddress || solWalletAddress,
    [evmWalletAddress, solWalletAddress]
  );

  // Optimized transaction execution
  const executeTransaction = useCallback(async () => {
    try {
      // Validate RPC URL
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!rpcUrl) {
        throw new Error(
          'Solana RPC URL not configured. Please check environment settings.'
        );
      }

      const connection = new Connection(rpcUrl, 'confirmed');

      // Check if we have a Solana wallet when needed
      const isSolanaTransaction =
        sendFlow.token?.chain?.toUpperCase() === 'SOLANA' ||
        sendFlow.network.toUpperCase() === 'SOLANA';

      if (isSolanaTransaction) {
        // Log wallet state for debugging production issues
        console.log('=== Solana Transaction Debug ===');
        console.log('solanaReady:', solanaReady);
        console.log(
          'directSolanaWallets count:',
          directSolanaWallets.length
        );
        console.log(
          'selectedSolanaWallet address:',
          selectedSolanaWallet?.address
        );
        console.log('RPC URL configured:', !!rpcUrl);
        console.log('authenticated:', authenticated);

        // Verify authentication before signing
        if (!authenticated) {
          throw new Error(
            'Please log in to send transactions. Your session may have expired.'
          );
        }

        // Get fresh access token to ensure session is valid
        let privyAccessToken: string | null = null;
        try {
          privyAccessToken = await getAccessToken();
          console.log('Privy auth token available:', !!privyAccessToken);
        } catch (tokenError) {
          console.error('Failed to get Privy access token:', tokenError);
          throw new Error(
            'Authentication session expired. Please refresh the page and log in again.'
          );
        }

        if (!privyAccessToken) {
          throw new Error(
            'Authentication token not available. Please refresh the page and log in again.'
          );
        }

        if (!selectedSolanaWallet) {
          // Check if wallet exists in linked accounts but not in wallets array
          const linkedAccounts = (PrivyUser?.linkedAccounts ||
            []) as PrivyLinkedAccount[];
          const hasSolanaAccount = linkedAccounts.some(
            isSolanaWalletAccount
          );

          if (hasSolanaAccount) {
            throw new Error(
              'Solana wallet found in account but not accessible. Please refresh the page and try again.'
            );
          } else {
            throw new Error(
              'No Solana wallet found. Please connect a Solana wallet.'
            );
          }
        }

        // Verify wallet has a valid address
        if (!selectedSolanaWallet.address) {
          throw new Error(
            'Solana wallet address is not available. Please refresh the page and try again.'
          );
        }

        // Test RPC connection before proceeding
        try {
          await connection.getLatestBlockhash();
        } catch (rpcError) {
          console.error('RPC connection failed:', rpcError);
          throw new Error(
            'Unable to connect to Solana network. Please check your connection and try again.'
          );
        }
      } else if (!selectedSolanaWallet) {
        // Non-Solana transaction but still log for debugging
        console.log('=== Non-Solana Transaction ===');
      }

      // Find Ethereum wallet
      const allAccounts = (PrivyUser?.linkedAccounts ||
        []) as PrivyLinkedAccount[];
      const ethereumAccount = allAccounts.find(
        isEthereumWalletAccount
      );

      let evmWallet;

      if (ethereumAccount?.address) {
        evmWallet = ethWallets.find(
          (w) =>
            w.address?.toLowerCase() ===
            ethereumAccount.address.toLowerCase()
        );
      }

      let hash = '';

      if (sendFlow.nft) {
        // Handle NFT transfer
        if (sendFlow.network.toUpperCase() === 'SOLANA') {
          hash = await TransactionService.handleSolanaNFTTransfer(
            selectedSolanaWallet,
            sendFlow,
            connection
          );
        } else {
          await evmWallet?.switchChain(
            CHAIN_ID[
              sendFlow.network as keyof typeof CHAIN_ID as keyof typeof CHAIN_ID as keyof typeof CHAIN_ID
            ]
          );
          hash = await TransactionService.handleNFTTransfer(
            evmWallet,
            sendFlow
          );
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
                connection
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

              });

              hash = bs58.encode(result.signature);
            } catch (privyError) {
              // Fallback: Use backend relay for sponsored transactions
              console.warn(
                'Privy signAndSendTransaction failed, falling back to backend relay:',
                privyError
              );

              hash =
                await TransactionService.submitPrivyNativeSponsoredTransaction(
                  transaction,
                  selectedSolanaWallet,
                  connection
                );
              console.log(
                'Fallback sponsored transaction signature:',
                hash
              );
            }
        } else {
          // EVM token transfer
          await evmWallet?.switchChain(
            CHAIN_ID[
              sendFlow.network as keyof typeof CHAIN_ID as keyof typeof CHAIN_ID as keyof typeof CHAIN_ID
            ]
          );
          const result = await TransactionService.handleEVMSend(
            evmWallet,
            sendFlow,
            sendFlow.network
          );
          hash = result.hash;
        }
      }

      return { success: true, hash };
    } catch (error) {
      console.error('Transaction execution error:', error);
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
    ethWallets,
    refetchNFTs,
    signAndSendTransaction,
    selectedSolanaWallet,
    authenticated,
    getAccessToken,
  ]);

  // Main transaction handler
  const handleSendConfirm = useCallback(async () => {
    // Validation
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
      // Execute transaction
      const result = await executeTransaction();

      if (!result.success) {
        throw new Error(
          result.error || ERROR_MESSAGES.TRANSACTION_FAILED
        );
      }

      // All side effects in parallel (they're independent)
      await Promise.allSettled([
        handlePointsUpdate(sendFlow.recipient),
        result.hash && accessToken
          ? handleFeedPost(
              result.hash,
              sendFlow,
              Number(calculateTransactionAmount(sendFlow)),
              currentWalletAddress,
              payload,
              accessToken
            )
          : Promise.resolve(),
      ]);

      // Socket notification (fire and forget)
      if (result.hash) {
        const notificationSent = handleSocketNotification(
          result.hash,
          sendFlow,
          calculateTransactionAmount
        );

        if (!notificationSent) {
          console.warn(
            'Transaction notification not sent, socket unavailable'
          );
        }
      }

      // Update UI
      setSendFlow((prev) => ({
        ...prev,
        hash: result.hash || '',
        step: 'success',
      }));
    } catch (error) {
      console.error('Error sending token/NFT:', error);

      // Log structured error for debugging
      const errorContext = {
        error: error instanceof Error ? error.message : String(error),
        assetType: sendFlow.nft ? 'NFT' : 'Token',
        assetIdentifier:
          sendFlow.nft?.tokenId || sendFlow.token?.symbol,
        network: sendFlow.network,
        timestamp: new Date().toISOString(),
      };
      console.error('Transaction failure context:', errorContext);

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
    []
  );

  const handleSelectNFT = useCallback((nft: NFT) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  }, []);

  const handleCloseNFTModal = useCallback(() => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  }, []);

  const handleBack = useCallback(() => setSelectedToken(null), []);

  const handleQRClick = useCallback(
    () => setWalletQRModalOpen(true),
    []
  );

  const handleAssetSelect = useCallback(
    () =>
      setSendFlow((prev) => ({
        ...prev,
        step: 'select-method',
      })),
    [setSendFlow]
  );

  return (
    <div className="p-0">
      <TokenTicker />
      {/* Balance & Token Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl">
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
          </div>

          <div className="flex gap-3 h-[30rem] overflow-hidden">
            <div className="rounded-xl bg-white flex-1 h-full p-4 pb-2">
              <div className="flex items-start gap-2 justify-between">
                <div className="flex items-center gap-1 mb-2">
                  <span className="font-bold text-lg text-gray-700">
                    Assets
                  </span>
                  {tokenLoading && (
                    <Loader className="w-5 h-5 animate-spin" />
                  )}
                </div>
                <button onClick={() => setWalletSetting(true)}>
                  <BsThreeDots size={26} color="gray" />
                </button>
              </div>
              <ScrollArea className="h-full pr-3 overflow-y-auto pb-10">
                {selectedToken && (
                  <CustomModal
                    isOpen={selectedToken ? true : false}
                    onCloseModal={setSelectedToken}
                  >
                    <TokenDetails
                      token={selectedToken}
                      onBack={handleBack}
                      onSend={handleSendClick}
                    />
                  </CustomModal>
                )}
                <TokenList
                  tokens={tokens as unknown as TokenData[]}
                  loading={tokenLoading}
                  error={tokenError!}
                  onSelectToken={handleTokenSelect}
                />
              </ScrollArea>
            </div>
            <div className="rounded-xl h-full bg-white flex-1 p-4 pb-2">
              <TransactionList
                solWalletAddress={solWalletAddress}
                evmWalletAddress={evmWalletAddress}
                chains={SUPPORTED_CHAINS as ChainType[]}
                tokens={tokens as unknown as TokenData[]}
                newTransactions={[]}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl">
            {tokenLoading ? (
              <PortfolioChartSkeleton />
            ) : portfolioSummary.assets.length > 0 ? (
              <PortfolioChart
                assets={portfolioSummary.assets}
                balance={`$${portfolioSummary.formattedBalance}`}
                title="Portfolio"
                showViewButton={false}
              />
            ) : (
              <PortfolioEmptyState />
            )}
          </div>
          {/* NFT & Messages Section */}
          <div className="">
            <div>
              <NFTSlider
                onSelectNft={handleSelectNFT}
                address={currentWalletAddress}
                nfts={nfts}
                loading={nftLoading}
                error={nftError}
                refetch={refetchNFTs}
              />

              {selectedNFT && (
                <NFTDetailView
                  isOpen={isNFTModalOpen}
                  onClose={handleCloseNFTModal}
                  nft={selectedNFT}
                  onNext={() => handleNFTNext(selectedNFT)}
                />
              )}
            </div>
          </div>
          <RedeemTokenList />
        </div>
      </div>

      {/* Prediction Markets Section */}
      {/* <div className="mt-6">
        <PredictionMarketsTab />
      </div> */}

      {/* wallet asset settings  */}
      {walletSetting && (
        <CustomModal
          isOpen={walletSetting}
          onCloseModal={setWalletSetting}
        >
          <WalletAssetsSettings tokens={tokens} />
        </CustomModal>
      )}

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

      <Toaster />
    </div>
  );
};
