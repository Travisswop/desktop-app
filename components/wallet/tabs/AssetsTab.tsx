'use client';

import { useState } from 'react';
import { ChainType, TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { Loader } from 'lucide-react';
import { BsThreeDots } from 'react-icons/bs';
import { ScrollArea } from '@/components/ui/scroll-area';
import CustomModal from '@/components/modal/CustomModal';
import TokenList from '../token/token-list';
import TokenDetails from '../token/token-details-view';
import WalletAssetsSettings from '../WalletAssetsSettings';
import NFTSlider from '../nft/nft-list';
import NFTDetailView from '../nft/nft-details-view';
import RedeemTokenList from '../redeem/token-list';
import TransactionList from '../transaction/transaction-list';

interface AssetsTabProps {
  tokens: TokenData[];
  tokenLoading: boolean;
  tokenError: Error | null;
  nfts: NFT[];
  nftLoading: boolean;
  nftError: Error | null;
  walletAddress: string;
  solWalletAddress: string;
  evmWalletAddress: string;
  chains: ChainType[];
  onSendClick: (token: TokenData) => void;
  onNFTNext: (nft: NFT) => void;
  refetchNFTs: () => void;
}

export default function AssetsTab({
  tokens,
  tokenLoading,
  tokenError,
  nfts,
  nftLoading,
  nftError,
  walletAddress,
  solWalletAddress,
  evmWalletAddress,
  chains,
  onSendClick,
  onNFTNext,
  refetchNFTs,
}: AssetsTabProps) {
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);

  const handleTokenSelect = (token: TokenData) => {
    setSelectedToken(token);
  };

  const handleBack = () => {
    setSelectedToken(null);
  };

  const handleSend = (token: TokenData) => {
    setSelectedToken(null);
    onSendClick(token);
  };

  const handleSelectNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };

  const handleNFTNextClick = () => {
    if (selectedNFT) {
      onNFTNext(selectedNFT);
      handleCloseNFTModal();
    }
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Tokens (left) and NFTs (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tokens Section */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-start gap-2 justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-gray-700">Tokens</span>
              {tokenLoading && (
                <Loader className="w-5 h-5 animate-spin text-gray-400" />
              )}
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BsThreeDots size={22} color="gray" />
            </button>
          </div>

          <ScrollArea className="h-[320px] pr-3">
            <TokenList
              tokens={tokens}
              loading={tokenLoading}
              error={tokenError!}
              onSelectToken={handleTokenSelect}
            />
          </ScrollArea>
        </div>

        {/* NFTs Section */}
        <div className="bg-white rounded-xl">
          <NFTSlider
            onSelectNft={handleSelectNFT}
            address={walletAddress}
            nfts={nfts}
            loading={nftLoading}
            error={nftError}
            refetch={refetchNFTs}
          />
        </div>
      </div>

      {/* Row 2: Transactions (left) and Redeemable Tokens (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transactions Section */}
        <div className="bg-white rounded-xl p-4 h-[380px]">
          <TransactionList
            solWalletAddress={solWalletAddress}
            evmWalletAddress={evmWalletAddress}
            chains={chains}
            tokens={tokens}
            newTransactions={[]}
          />
        </div>

        {/* Redeemable Tokens Section */}
        <div className="bg-white rounded-xl h-[380px] overflow-auto">
          <RedeemTokenList />
        </div>
      </div>

      {/* Token Details Modal */}
      {selectedToken && (
        <CustomModal
          isOpen={!!selectedToken}
          onCloseModal={() => setSelectedToken(null)}
        >
          <TokenDetails
            token={selectedToken}
            onBack={handleBack}
            onSend={handleSend}
          />
        </CustomModal>
      )}

      {/* NFT Details Modal */}
      {selectedNFT && (
        <NFTDetailView
          isOpen={isNFTModalOpen}
          onClose={handleCloseNFTModal}
          nft={selectedNFT}
          onNext={handleNFTNextClick}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <CustomModal
          isOpen={settingsOpen}
          onCloseModal={() => setSettingsOpen(false)}
        >
          <WalletAssetsSettings tokens={tokens} />
        </CustomModal>
      )}
    </div>
  );
}
