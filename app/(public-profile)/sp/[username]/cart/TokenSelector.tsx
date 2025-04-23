'use client';

import { useState } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { TokenData } from '@/types/token';

export default function TokenSelector({
  assets,
  setSelectedToken,
}: any) {
  const [search, setSearch] = useState('');
  //   const [tab, setTab] = useState("crypto");

  // Memoize filtered results to avoid unnecessary re-renders
  const filteredAssets =
    assets?.filter(
      (asset: any) =>
        asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
        asset?.symbol?.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const renderAssetItem = (asset: TokenData) => {
    if (!asset) return null;
    return (
      <button
        key={asset.symbol}
        onClick={() => setSelectedToken(asset)}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors shadow-medium"
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

  return (
    <div className="p-3 rounded-3xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Choose asset</h3>
          {/* <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Close</span>
            </button> */}
        </div>
        
        {/* Order Confirmation */}
        <div className="bg-gray-50 p-3 rounded-md mb-4">
          <p className="text-sm font-medium mb-2">Order Confirmation</p>
          <p className="text-xs text-gray-600">
            Your order has been created. Please select a token to complete your payment.
          </p>
        </div>

        {/* <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="nft">NFT</TabsTrigger>
            </TabsList>
          </Tabs> */}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 py-5 rounded-xl"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-3">
        {filteredAssets.map(renderAssetItem)}
      </div>
    </div>
  );
}
