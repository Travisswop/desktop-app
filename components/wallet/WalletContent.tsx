'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  usePrivy,
  useWallets,
  useSolanaWallets,
  useAuthorizationSignature,
} from '@privy-io/react-auth';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import { Connection } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';

import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { CHAIN_ID, SendFlowState } from '@/types/wallet-types';

import {
  TransactionService,
  USDC_ADDRESS,
  SWOP_ADDRESS,
} from '@/services/transaction-service';
import { useSendFlow } from '@/lib/hooks/useSendFlow';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useNFT } from '@/lib/hooks/useNFT';
import { useUser } from '@/lib/UserContext';
import { addSwopPoint } from '@/actions/addPoint';
import { postFeed } from '@/actions/postFeed';

// Custom hooks
import {
  useWalletData,
  useWalletAddresses,
} from './hooks/useWalletData';
import { useTransactionPayload } from './hooks/useTransactionPayload';

// Constants
import {
  SUPPORTED_CHAINS,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  POINT_TYPES,
  ACTION_KEYS,
} from './constants';

// UI Components
import TokenList from './token/token-list';
import NFTSlider from './nft/nft-list';
import TokenDetails from './token/token-details-view';
import NFTDetailView from './nft/nft-details-view';
import WalletModals from './WalletModals';
import MessageList from './socket-message-list';
import { Toaster } from '../ui/toaster';
import ProfileHeader from '../dashboard/profile-header';
import RedeemTokenList from './redeem/token-list';
import WalletBalanceChartForWalletPage from './WalletBalanceChart';
// Utilities
import Cookies from 'js-cookie';
import { createTransactionPayload } from '@/lib/utils/transactionUtils';
import { Loader2 } from 'lucide-react';
import { useNewSocketChat } from '@/lib/context/NewSocketChatContext';
import {
  getWalletNotificationService,
  formatUSDValue,
} from '@/lib/utils/walletNotifications';

export default function WalletContent() {
  return <WalletContentInner />;
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

  // Hooks
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const { generateAuthorizationSignature } =
    useAuthorizationSignature();

  const { wallets: ethWallets } = useWallets();

  const {
    wallets: directSolanaWallets,
    createWallet: createSolanaWallet,
  } = useSolanaWallets();

  const { createWallet, solanaWallets } = useSolanaWalletContext();
  const { toast } = useToast();
  const { user } = useUser();

  // Socket connection for wallet notifications
  const { socket: chatSocket, isConnected: socketConnected } =
    useNewSocketChat();
  const socket = chatSocket;

  console.log('🔌 [WalletContent] Socket status:', {
    socketId: socket?.id,
    connected: socketConnected,
    socketExists: !!socket,
  });
  // Custom hooks
  const walletData = useWalletData(authenticated, ready, PrivyUser);
  const { solWalletAddress, evmWalletAddress } =
    useWalletAddresses(walletData);
  const { payload } = useTransactionPayload(user);
  const { wallets: ethWalletsData } = useWallets();

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

  // Get access token from cookies
  useEffect(() => {
    const token = Cookies.get('access-token');
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Create Solana wallet if it doesn't exist
  useEffect(() => {
    if (!authenticated || !ready || !PrivyUser) return;

    const hasExistingSolanaWallet = PrivyUser.linkedAccounts.some(
      (account: any) =>
        account.type === 'wallet' &&
        account.walletClientType === 'privy' &&
        account.chainType === 'solana'
    );

    if (!hasExistingSolanaWallet) {
      createSolanaWallet();
    }
  }, [authenticated, ready, PrivyUser, createSolanaWallet]);

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

  // Memoized calculations
  const totalBalance = useMemo(() => {
    return tokens.reduce((total, token) => {
      const value =
        parseFloat(token.balance) *
        (token.marketData?.price
          ? parseFloat(token.marketData.price)
          : 0);
      return isNaN(value) ? total : total + value;
    }, 0);
  }, [tokens]);

  const nativeTokenPrice = useMemo(
    () =>
      tokens.find((token) => token.isNative)?.marketData?.price ||
      '0',
    [tokens]
  );

  const currentWalletAddress = useMemo(
    () => evmWalletAddress || solWalletAddress,
    [evmWalletAddress, solWalletAddress]
  );

  // Optimized calculation function
  const calculateTransactionAmount = useCallback(
    (flowData: SendFlowState): string => {
      if (flowData.isUSD && flowData.token?.marketData.price) {
        return (
          Number(flowData.amount) /
          Number(flowData.token.marketData.price)
        ).toString();
      }
      return flowData.amount;
    },
    []
  );

  // Helper function to convert relative URLs to absolute URLs
  const convertToAbsoluteUrl = useCallback((imageUrl: string | undefined): string | undefined => {
    if (!imageUrl) return undefined;

    // If already absolute URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Convert relative path to absolute URL using API base URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${apiUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }, []);

  // Optimized transaction execution
  const executeTransaction = useCallback(async () => {
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
        'confirmed'
      );

      // Use direct Solana wallets from Privy (more reliable)
      const availableSolanaWallets =
        directSolanaWallets || solanaWallets || [];

      const solanaWallet =
        availableSolanaWallets.find(
          (w: any) =>
            w.walletClientType === 'privy' ||
            w.connectorType === 'embedded'
        ) || availableSolanaWallets[0];

      // Check if we have a Solana wallet when needed
      if (
        (sendFlow.token?.chain === 'SOLANA' ||
          sendFlow.network === 'SOLANA') &&
        !solanaWallet
      ) {
        // Check if wallet exists in linked accounts but not in wallets array
        const hasSolanaAccount = PrivyUser?.linkedAccounts?.some(
          (account: any) =>
            account.chainType === 'solana' &&
            account.type === 'wallet'
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

      // Find Ethereum wallet with explicit type casting
      const allAccounts = PrivyUser?.linkedAccounts || [];
      const ethereumAccount = allAccounts.find(
        (account: any) =>
          account.chainType === 'ethereum' &&
          account.type === 'wallet' &&
          account.address
      );

      let evmWallet;

      if ((ethereumAccount as any)?.address) {
        evmWallet = ethWallets.find(
          (w) =>
            w.address?.toLowerCase() ===
            (ethereumAccount as any).address.toLowerCase()
        );
      }

      let hash = '';

      if (sendFlow.nft) {
        // Handle NFT transfer
        if (sendFlow.network === 'SOLANA') {
          hash = await TransactionService.handleSolanaNFTTransfer(
            solanaWallet,
            sendFlow,
            connection
          );
        } else {
          await evmWallet?.switchChain(CHAIN_ID[sendFlow.network]);
          hash = await TransactionService.handleNFTTransfer(
            evmWallet,
            sendFlow
          );
        }
        refetchNFTs();
      } else if (sendFlow.token) {
        // Handle token transfer
        if (sendFlow.token.chain === 'SOLANA') {
          // Special handling for USDC and SWOP tokens on Solana
          // if (
          //   sendFlow.token.address === USDC_ADDRESS ||
          //   sendFlow.token.address === SWOP_ADDRESS
          // ) {
          //   const serializedTransaction =
          //     await TransactionService.handleSolanaSend(
          //       solanaWallet,
          //       sendFlow,
          //       connection
          //     );

          //   const response = await fetch(
          //     `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.SPONSOR_TRANSACTION}`,
          //     {
          //       method: 'POST',
          //       headers: { 'Content-Type': 'application/json' },
          //       body: JSON.stringify({
          //         transaction: serializedTransaction,
          //       }),
          //     }
          //   );

          //   if (!response.ok) {
          //     throw new Error(
          //       `${ERROR_MESSAGES.SERVER_ERROR}: ${response.status}`
          //     );
          //   }

          //   const { transactionHash } = await response.json();
          //   hash = transactionHash.signature;
          //   await connection.confirmTransaction(hash);
          // } else {
          //   hash = await TransactionService.handleSolanaSend(
          //     solanaWallet,
          //     sendFlow,
          //     connection
          //   );
          //   await connection.confirmTransaction(hash);
          // }

          const result = await TransactionService.handleSolanaSend(
            solanaWallet,
            sendFlow,
            connection,
            PrivyUser,
            generateAuthorizationSignature
          );

          hash = result;

          // For sponsored transactions (USDC/SWOP), Privy handles confirmation
          // For regular transactions, we need to confirm manually
          const isSponsored =
            sendFlow.token?.address === USDC_ADDRESS ||
            sendFlow.token?.address === SWOP_ADDRESS;

          if (hash && !isSponsored) {
            await connection.confirmTransaction(hash);
          }
          // If sponsored, the transaction is already confirmed by Privy
        } else {
          // EVM token transfer
          await evmWallet?.switchChain(CHAIN_ID[sendFlow.network]);
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
    sendFlow,
    ethWallets,
    directSolanaWallets,
    solanaWallets,
    PrivyUser,
    refetchNFTs,
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
          result.error || ERROR_MESSAGES.TRANSACTION_FAILED
        );
      }

      // Update points if using Swop.ID
      if (sendFlow.recipient.isEns && user?._id) {
        await addSwopPoint({
          userId: user._id,
          pointType: POINT_TYPES.USING_SWOP_ID,
          actionKey: ACTION_KEYS.LAUNCH_SWOP,
        });
      }

      // Create and post transaction feed
      if (result.hash && accessToken) {
        const amount = Number(calculateTransactionAmount(sendFlow));
        const transactionPayload = createTransactionPayload({
          basePayload: payload,
          sendFlow,
          hash: result.hash,
          amount,
          walletAddress: currentWalletAddress,
        });

        await postFeed(transactionPayload, accessToken);
      }

      // Send success notification via Socket.IO
      console.log('🔔 [WalletContent] Attempting to send notification...', {
        hasSocket: !!socket,
        socketConnected: socket?.connected,
        hasHash: !!result.hash,
        socketId: socket?.id,
        hasNFT: !!sendFlow.nft,
        hasToken: !!sendFlow.token,
      });

      if (socket && socket.connected && result.hash) {
        try {
          console.log('🔔 [WalletContent] Socket is connected, preparing notification...');
          const notificationService =
            getWalletNotificationService(socket);

          console.log('🔔 [WalletContent] Notification service initialized:', {
            serviceExists: !!notificationService,
            isConnected: notificationService.isConnected(),
          });

          if (sendFlow.nft) {
            // NFT transfer notification
            const networkName =
              sendFlow.network?.toUpperCase() || 'SOLANA';

            const nftData = {
              nftName: sendFlow.nft.name || 'NFT',
              nftImage: convertToAbsoluteUrl(sendFlow.nft.image),
              recipientAddress: sendFlow.recipient.address,
              recipientEnsName:
                sendFlow.recipient.ensName ||
                sendFlow.recipient.address,
              txSignature: result.hash,
              network: networkName,
              tokenId: sendFlow.nft.tokenId,
              collectionName: sendFlow.nft.collection?.collectionName,
            };

            console.log('🔔 [WalletContent] Emitting NFT sent notification:', nftData);
            notificationService.emitNFTSent(nftData);

            console.log(
              '✅ NFT transfer notification sent via Socket.IO'
            );
          } else if (sendFlow.token) {
            // Token transfer notification
            const amount = calculateTransactionAmount(sendFlow);
            const networkName =
              sendFlow.token.chain?.toUpperCase() || 'SOLANA';
            const usdValue = sendFlow.token.marketData?.price
              ? formatUSDValue(
                  amount,
                  sendFlow.token.marketData.price
                )
              : undefined;

            const tokenData = {
              tokenSymbol: sendFlow.token.symbol,
              tokenName: sendFlow.token.name,
              amount: amount,
              recipientAddress: sendFlow.recipient.address,
              recipientEnsName:
                sendFlow.recipient.ensName ||
                sendFlow.recipient.address,
              txSignature: result.hash,
              network: networkName,
              tokenLogo: convertToAbsoluteUrl(sendFlow.token.logoURI),
              usdValue: usdValue,
            };

            console.log('🔔 [WalletContent] Emitting token sent notification:', tokenData);
            notificationService.emitTokenSent(tokenData);

            console.log(
              '✅ Token transfer notification sent via Socket.IO'
            );
          }
        } catch (notifError) {
          console.error(
            '❌ [WalletContent] Failed to send transfer notification:',
            notifError
          );
        }
      } else {
        console.warn(
          '⚠️ [WalletContent] Socket not connected or missing data, transfer notification not sent:',
          {
            hasSocket: !!socket,
            socketConnected: socket?.connected,
            hasHash: !!result.hash,
          }
        );
      }

      // Update UI state
      setSendFlow((prev) => ({
        ...prev,
        hash: result.hash || '',
        step: 'success',
      }));
    } catch (error) {
      console.error('Error sending token/NFT:', error);

      // Send failure notification via Socket.IO
      if (socket && socket.connected) {
        try {
          const notificationService =
            getWalletNotificationService(socket);
          const errorMessage =
            error instanceof Error
              ? error.message
              : ERROR_MESSAGES.SEND_TRANSACTION_FAILED;

          if (sendFlow.nft) {
            // For NFT failures, we can emit a generic failure event
            // Since walletNotifications.ts doesn't have a specific NFT failure handler,
            // we'll log it for now
            console.log('❌ NFT transfer failed:', {
              nft: sendFlow.nft.name,
              recipient: sendFlow.recipient?.address,
              reason: errorMessage,
            });
          } else if (sendFlow.token) {
            // For token transfers, we can log the failure
            console.log('❌ Token transfer failed:', {
              token: sendFlow.token.symbol,
              amount: sendFlow.amount,
              recipient: sendFlow.recipient?.address,
              reason: errorMessage,
            });
          }
        } catch (notifError) {
          console.error(
            'Failed to send failure notification:',
            notifError
          );
        }
      }

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
    user,
    payload,
    accessToken,
    currentWalletAddress,
    calculateTransactionAmount,
    convertToAbsoluteUrl,
    toast,
    resetSendFlow,
    setSendFlow,
    socket,
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
    <div className="">
      <ProfileHeader />

      {/* Balance & Token Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        <WalletBalanceChartForWalletPage
          tokens={tokens}
          walletData={walletData || []}
          totalBalance={totalBalance}
          onSelectAsset={handleAssetSelect}
          onQRClick={handleQRClick}
          onTokenRefresh={refetchTokens}
        />

        <div className="rounded-xl bg-white">
          <div className="flex items-center justify-between pl-6 pt-6 mb-2">
            <div className="flex items-center">
              <span className="font-bold text-xl text-gray-700">
                Tokens
              </span>
              {tokenLoading && (
                <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
              )}
            </div>
            {/* <ViewToggle viewMode={viewMode} onViewChange={setViewMode} /> */}
          </div>
          <div className="max-h-[35.5rem] overflow-y-auto rounded-xl">
            {selectedToken ? (
              <TokenDetails
                token={selectedToken}
                onBack={handleBack}
                onSend={handleSendClick}
              />
            ) : (
              <TokenList
                tokens={tokens}
                loading={tokenLoading}
                error={tokenError!}
                onSelectToken={handleTokenSelect}
              />
            )}
          </div>
        </div>
      </div>

      {/* NFT & Messages Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
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
        <MessageList tokens={tokens} />
      </div>

      {/* All Modals */}
      <WalletModals
        sendFlow={sendFlow}
        resetSendFlow={resetSendFlow}
        tokens={tokens}
        nfts={nfts}
        handleSendClick={handleSendClick}
        handleNFTNext={handleNFTNext}
        handleAmountConfirm={handleAmountConfirm}
        handleRecipientSelect={handleRecipientSelect}
        handleSendConfirm={handleSendConfirm}
        network={sendFlow.network}
        currentWalletAddress={currentWalletAddress}
        sendLoading={sendLoading}
        nativeTokenPrice={nativeTokenPrice}
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
      />

      <RedeemTokenList />
      <Toaster />
    </div>
  );
};
