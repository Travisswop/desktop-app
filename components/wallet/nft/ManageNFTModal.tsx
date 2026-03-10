'use client';

import { NFT } from '@/types/nft';
import { Switch } from '@/components/ui/switch';
import CustomModal from '@/components/modal/CustomModal';
import NFTImage from './nft-image';

interface ManageNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nfts: NFT[];
  hiddenNfts: Set<string>;
  onToggle: (nftId: string) => void;
}

export default function ManageNFTModal({
  isOpen,
  onClose,
  nfts,
  hiddenNfts,
  onToggle,
}: ManageNFTModalProps) {
  const getNftId = (nft: NFT) => `${nft.contract}-${nft.tokenId}`;

  return (
    <CustomModal isOpen={isOpen} onCloseModal={onClose}>
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Manage NFTs</h2>
        <p className="text-sm text-gray-500 mb-4">
          Toggle NFTs to show or hide them from your collection
        </p>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {nfts.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              No NFTs found in your wallet
            </p>
          ) : (
            nfts.map((nft) => {
              const nftId = getNftId(nft);
              const isVisible = !hiddenNfts.has(nftId);
              return (
                <div
                  key={nftId}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <NFTImage
                      src={nft.image}
                      alt={nft.name}
                      className="object-cover rounded-lg"
                      width={48}
                      height={48}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium truncate text-gray-900 text-sm">
                      {nft.name}
                    </h4>
                    {nft.collection?.collectionName &&
                      nft.collection.collectionName !==
                        'Unknown Collection' && (
                        <p className="text-xs text-gray-500 truncate">
                          {nft.collection.collectionName}
                        </p>
                      )}
                  </div>
                  <Switch
                    checked={isVisible}
                    onCheckedChange={() => onToggle(nftId)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </CustomModal>
  );
}
