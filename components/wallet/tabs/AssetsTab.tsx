'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { BsThreeDots } from 'react-icons/bs';
import { Coins, ImageIcon, Gift, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import CustomModal from '@/components/modal/CustomModal';
import TokenList from '../token/token-list';
import TokenDetails from '../token/token-details-view';
import ManageTokenModal from '../token/ManageTokenModal';
import NFTSlider from '../nft/nft-list';
import NFTDetailView from '../nft/nft-details-view';
import RedeemTokenList from '../redeem/token-list';
import RedeemModal from '../token/redeem-modal';
import ManageNFTModal from '../nft/ManageNFTModal';
import { useBalanceVisibilityStore } from '@/zustandStore/useBalanceVisibilityStore';

type AssetTabType = 'assets' | 'nfts' | 'blinks';

const HIDDEN_NFTS_KEY = 'hiddenNfts';

interface AssetsTabProps {
  tokens: TokenData[];
  tokenLoading: boolean;
  tokenError: Error | null;
  nfts: NFT[];
  nftLoading: boolean;
  nftError: Error | null;
  walletAddress: string;
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
  onSendClick,
  onNFTNext,
  refetchNFTs,
}: AssetsTabProps) {
  const [activeTab, setActiveTab] = useState<AssetTabType>('assets');
  const [selectedToken, setSelectedToken] =
    useState<TokenData | null>(null);
  const [manageTokensOpen, setManageTokensOpen] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [manageNFTModalOpen, setManageNFTModalOpen] = useState(false);

  // Hidden NFTs state — lifted from NFTSlider, persisted to localStorage
  const [hiddenNfts, setHiddenNfts] = useState<Set<string>>(
    new Set(),
  );

  const { showBalance, toggleBalance } = useBalanceVisibilityStore();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load hidden NFTs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_NFTS_KEY);
      if (stored) setHiddenNfts(new Set(JSON.parse(stored)));
    } catch {
      // ignore
    }
  }, []);

  // Persist hidden NFTs whenever they change
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleTokenSelect = (token: TokenData) =>
    setSelectedToken(token);
  const handleBack = () => setSelectedToken(null);
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

  const tabs: { key: AssetTabType; label: string }[] = [
    { key: 'assets', label: 'Assets' },
    { key: 'nfts', label: 'NFTs' },
    { key: 'blinks', label: 'Blinks' },
  ];

  const menuItems = [
    {
      icon: <Coins className="w-4 h-4" />,
      label: 'Manage Tokens',
      onClick: () => {
        setManageTokensOpen(true);
        setDropdownOpen(false);
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
        setDropdownOpen(false);
      },
    },
    {
      icon: <ImageIcon className="w-4 h-4" />,
      label: 'Manage NFT',
      onClick: () => {
        setManageNFTModalOpen(true);
        setDropdownOpen(false);
      },
    },
    {
      icon: <Gift className="w-4 h-4" />,
      label: 'Create Redeem',
      onClick: () => {
        setRedeemModalOpen(true);
        setDropdownOpen(false);
      },
    },
  ];

  return (
    <div className="bg-white rounded-xl p-4 drop-shadow-lg">
      {/* Header with tabs and dropdown */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'text-gray-800'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Three-dot dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <BsThreeDots size={22} color="gray" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-8 z-50 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-500">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'assets' && (
        <ScrollArea className="h-[320px] pr-3">
          <TokenList
            tokens={tokens}
            loading={tokenLoading}
            error={tokenError!}
            onSelectToken={handleTokenSelect}
          />
        </ScrollArea>
      )}

      {activeTab === 'nfts' && (
        <div className="h-[320px]">
          <NFTSlider
            onSelectNft={handleSelectNFT}
            address={walletAddress}
            nfts={nfts}
            loading={nftLoading}
            error={nftError}
            refetch={refetchNFTs}
            hiddenNfts={hiddenNfts}
          />
        </div>
      )}

      {activeTab === 'blinks' && (
        <div className="h-[320px] overflow-auto">
          <RedeemTokenList />
        </div>
      )}

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

      {/* Manage Tokens Modal */}
      <ManageTokenModal
        isOpen={manageTokensOpen}
        onClose={() => setManageTokensOpen(false)}
        tokens={tokens}
      />

      {/* Manage NFT Modal */}
      <ManageNFTModal
        isOpen={manageNFTModalOpen}
        onClose={() => setManageNFTModalOpen(false)}
        nfts={nfts}
        hiddenNfts={hiddenNfts}
        onToggle={toggleNftVisibility}
      />

      {/* Create Redeem Modal */}
      <RedeemModal
        isOpen={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        mode="wallet"
      />
    </div>
  );
}
