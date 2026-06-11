'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { TokenData } from '@/types/token';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';

const isSolanaAsset = (asset: TokenData) =>
  asset?.chain === 'SOLANA' &&
  (!asset.address || !asset.address.startsWith('0x'));

export default function TokenSelector({
  assets,
  setSelectedToken,
}: any) {
  const [search, setSearch] = useState('');

  const filteredAssets =
    assets?.filter(
      (asset: any) =>
        isSolanaAsset(asset) &&
        (asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
          asset?.symbol?.toLowerCase().includes(search.toLowerCase()))
    ) || [];

  const renderAssetItem = (asset: TokenData) => {
    if (!asset) return null;
    return (
      <button
        key={asset.symbol}
        onClick={() => setSelectedToken(asset)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-gray-200 hover:bg-gray-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          {asset.logoURI ? (
            <Image
              src={sanitizeNextImageSrc(asset.logoURI)}
              alt={asset.symbol || ''}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
              {asset.symbol?.slice(0, 1) || '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-950">
              {asset.name || asset.symbol}
            </p>
            <p className="text-xs font-medium text-gray-500">
              {asset.symbol}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold text-gray-950">
            {asset.marketData?.price ? (
              <>${parseFloat(asset.marketData.price).toFixed(4)}</>
            ) : (
              <span className="text-gray-400">No price</span>
            )}
          </div>
          <div className="text-xs font-medium text-gray-500">
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
    <div className="px-5 pb-5">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-gray-950">
            Choose asset
          </h3>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Select a Solana wallet asset to use for this order.
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-1 text-sm font-semibold text-gray-950">
            Order Confirmation
          </p>
          <p className="text-xs leading-5 text-gray-500">
            Your order has been created. Choose SOL or a Solana SPL token to
            complete your payment.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border-gray-200 py-5 pl-9"
          />
        </div>
      </div>
      <div className="mt-4 flex max-h-[48vh] flex-col gap-2 overflow-y-auto pr-1">
        {filteredAssets.length > 0 ? (
          filteredAssets.map(renderAssetItem)
        ) : (
          <div className="rounded-xl bg-gray-50 p-4 text-center text-sm font-medium text-gray-500">
            No assets found.
          </div>
        )}
      </div>
    </div>
  );
}
