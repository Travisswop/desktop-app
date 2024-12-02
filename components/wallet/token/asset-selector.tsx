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
import { Search, X } from 'lucide-react';
import Image from 'next/image';
import { TokenData } from '@/types/token';

interface AssetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: TokenData[];
  onNext: (token: TokenData) => void;
}

export default function AssetSelector({
  open,
  onOpenChange,
  assets,
  onNext,
}: AssetSelectorProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('crypto');

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(search.toLowerCase())
  );

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

        <div className="mt-4 space-y-2">
          {filteredAssets.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => {
                onNext(asset);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors  shadow-md"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={asset.logoURI}
                  alt={asset.symbol}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <span className="font-medium">{asset.name}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  $
                  {asset.marketData.price &&
                    parseFloat(asset.marketData.price).toFixed(4)}
                </div>
                <div className="text-sm text-gray-500">
                  {parseFloat(asset.balance).toFixed(4)}{' '}
                  {asset.symbol}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}