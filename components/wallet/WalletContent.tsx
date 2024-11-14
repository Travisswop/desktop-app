'use client';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '../ui/skeleton';
import BalanceChart from './balance-chart';
import MessageBox from './message-interface';
import TokenList from './token/token-list';
import NFTSlider, { NFT } from './nft/nft-list';
import TransactionList from './transaction/transaction-list';
import { useEffect, useState, useMemo } from 'react';
import TokenDetails from './token/token-details-view';
import NFTDetailView from './nft/nft-details-view';
import ProfileHeader from './profile-header';
import {
  usePrivy,
  useSolanaWallets,
  WalletWithMetadata,
} from '@privy-io/react-auth';
import { WalletItem } from '@/types/wallet';
import { useMultiChainTokenData } from '@/lib/hooks/useTokenBalance';
import { TokenData } from '@/types/token';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function WalletContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContentInner />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function WalletContentInner() {
  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );
  const { user, loading, error } = useUser();
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const { createWallet } = useSolanaWallets();

  const [selectedToken, setSelectedToken] =
    useState<TokenData | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);

  const evmWallet = useMemo(
    () => walletData?.find((wallet) => wallet.isEVM),
    [walletData]
  );

  const walletAddress = evmWallet?.address || '';
  const network = 'POLYGON';

  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
  } = useMultiChainTokenData(walletAddress, [network]);

  useEffect(() => {
    const linkWallet = PrivyUser?.linkedAccounts
      .map((item) => {
        if (item.type === 'wallet') {
          if (item.chainType === 'ethereum') {
            return {
              address: item.address,
              isActive: true,
              isEVM: true,
            };
          } else if (item.chainType === 'solana') {
            return {
              address: item.address,
              isActive: false,
              isEVM: false,
            };
          }
        }
        return null;
      })
      .filter(Boolean);

    setWalletData(linkWallet as WalletItem[]);
  }, [PrivyUser]);

  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const hasExistingSolanaWallet = !!PrivyUser.linkedAccounts.find(
        (account): account is WalletWithMetadata =>
          account.type === 'wallet' &&
          account.walletClientType === 'privy' &&
          account.chainType === 'solana'
      );

      if (!hasExistingSolanaWallet) {
        createWallet();
      }
    }
  }, [authenticated, ready, PrivyUser, createWallet]);

  const handleTokenSelect = (token: TokenData) => {
    setSelectedToken(token);
  };

  const handleSelectNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };

  const handleBack = () => {
    setSelectedToken(null);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  return (
    <div className="">
      {/* <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 my-6">
        <WalletProfile
          name={user?.name || 'Your Name'}
          username={'Travis.Swop.ID'}
          imageUrl={
            user?.profilePic?.includes('https://')
              ? user.profilePic
              : `/assets/avatar/${user?.profilePic}.png`
          }
          points={3200}
        />
        <WalletManager walletData={walletData || WALLET_INFO} />
        <EmbeddedWallet />
      </div> */}
      <ProfileHeader
        name={user?.name || 'Your Name'}
        username={'Travis.Swop.ID'}
        location={user?.address || ''}
        followers={user?.connections.followers.length || 0}
        following={user?.connections.following.length || 0}
        messages={0}
        orders={40}
        points={31234}
        imageUrl={user?.profilePic || '/images/avatar.png'}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        <BalanceChart />
        <MessageBox />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        {selectedToken ? (
          <TokenDetails token={selectedToken} onBack={handleBack} />
        ) : (
          <TokenList
            tokens={tokens}
            loading={tokenLoading}
            error={tokenError!}
            onSelectToken={handleTokenSelect}
          />
        )}
        <div>
          <NFTSlider onSelectNft={handleSelectNFT} />
          <TransactionList
            address={walletAddress}
            network={network}
          />
          {selectedNFT && (
            <NFTDetailView
              isOpen={isNFTModalOpen}
              onClose={handleCloseNFTModal}
              nft={selectedNFT}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
