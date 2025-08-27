'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  usePrivy,
  useWallets,
  useSolanaWallets,
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
  const { wallets: ethWallets } = useWallets();
  const {
    wallets: directSolanaWallets,
    createWallet: createSolanaWallet,
  } = useSolanaWallets();
  const { createWallet, solanaWallets } = useSolanaWalletContext();
  const { toast } = useToast();
  const { user } = useUser();

  // Custom hooks
  const walletData = useWalletData(authenticated, ready, PrivyUser);
  const { solWalletAddress, evmWalletAddress } =
    useWalletAddresses(walletData);
  const { payload } = useTransactionPayload(user);
  const { wallets: ethWalletsData } = useWallets();
  console.log(ethWalletsData, 'ethWalletsData');

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
            connection
          );
          
          hash = result;
          
          // For sponsored transactions (USDC/SWOP), Privy handles confirmation
          // For regular transactions, we need to confirm manually
          const isSponsored = sendFlow.token?.address === USDC_ADDRESS || 
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

      // Update UI state
      setSendFlow((prev) => ({
        ...prev,
        hash: result.hash || '',
        step: 'success',
      }));
    } catch (error) {
      console.error('Error sending token/NFT:', error);
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
