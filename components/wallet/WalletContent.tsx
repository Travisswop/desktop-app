'use client';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '../ui/skeleton';

import BalanceChart from './balance-chart';
import MessageBox from './message-interface';
import TokenList, { Token } from './token/token-list';
import NFTSlider, { NFT } from './nft/nft-list';
import TransactionList from './transaction/transaction-list';
import { useState } from 'react';
import TokenDetails from './token/token-details-view';
import NFTDetailView from './nft/nft-details-view';
import WalletManager from './wallet-manager';
import EmbeddedWallet from './embedded-wallet';
import ProfileHeader from './profile-header';

export default function WalletContent() {
  const { user, loading, error } = useUser();

  const [selectedToken, setSelectedToken] = useState<Token | null>(
    null
  );
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);

  const handleSelectToken = (token: Token) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 my-6">
        <ProfileHeader
          name={user?.name || 'Your Name'}
          username={'Travis.Swop.ID'}
          imageUrl={user?.profilePic || '/images/avatar.png'}
          points={3200}
        />
        <WalletManager />

        <EmbeddedWallet />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        <BalanceChart />
        <MessageBox />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        {selectedToken ? (
          <TokenDetails token={selectedToken} onBack={handleBack} />
        ) : (
          <TokenList onSelectToken={handleSelectToken} />
        )}
        <div>
          <NFTSlider onSelectNft={handleSelectNFT} />
          <TransactionList />
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
