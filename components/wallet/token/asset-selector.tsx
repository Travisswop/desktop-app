'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';

interface AssetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: TokenData[];
  nfts: NFT[];
  onNext: (asset: TokenData) => void;
  onNFTNext: (nft: NFT) => void;
}

export default function AssetSelector({
  open,
  onOpenChange,
  assets,
  nfts,
  onNext,
  onNFTNext,
}: AssetSelectorProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('crypto');

  // Memoize filtered results to avoid unnecessary re-renders
  const filteredAssets =
    assets?.filter(
      (asset) =>
        asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
        asset?.symbol?.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const filteredNfts =
    nfts?.filter(
      (nft, index, self) =>
        // First filter for unique names
        index === self.findIndex((n) => n.name === nft.name) &&
        // Then filter by search term
        nft?.name?.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const renderAssetItem = (asset: TokenData) => {
    if (!asset) return null;
    return (
      <button
        key={asset.symbol}
        onClick={() => onNext(asset)}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors shadow-md"
      >
        <div className="flex items-center gap-3">
          {asset.logoURI && (
            <Image
              src={asset.logoURI}
              alt={asset.symbol || ''}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <span className="font-medium">{asset.name}</span>
        </div>
        <div className="text-right">
          <div className="font-medium">
            {asset.marketData?.price && (
              <>${parseFloat(asset.marketData.price).toFixed(4)}</>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {asset.balance && (
              <>
                {parseFloat(asset.balance).toFixed(4)} {asset.symbol}
              </>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderNFTItem = (nft: NFT) => {
    if (!nft) return null;
    return (
      <button
        key={`${nft.name}-${nft.tokenId}`}
        onClick={() => onNFTNext(nft)}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors shadow-md"
      >
        <div className="flex items-center gap-3">
          {nft.image && (
            <Image
              src={nft.image}
              alt={nft.name || ''}
              width={40}
              height={40}
              className="rounded-lg"
            />
          )}
          <div>
            <div className="font-medium">{nft.name}</div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Choose asset
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Close</span>
            </button>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="nft">NFT</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 py-5 rounded-xl"
            />
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
          {tab === 'crypto' && filteredAssets.length > 0 ? (
            filteredAssets.map(renderAssetItem)
          ) : tab === 'crypto' ? (
            <div className="text-center text-gray-500 py-4">
              No crypto assets found
            </div>
          ) : null}

          {tab === 'nft' && filteredNfts.length > 0 ? (
            filteredNfts.map(renderNFTItem)
          ) : tab === 'nft' ? (
            <div className="text-center text-gray-500 py-4">
              No NFTs found
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
