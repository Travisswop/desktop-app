'use client';

import { Check, ExternalLink } from 'lucide-react';
import { NFT } from '@/types/nft';
import { TokenData } from '@/types/token';
import Image from 'next/image';
import Link from 'next/link';
import CustomModal from '@/components/modal/CustomModal';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';

interface TransactionSuccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  nft: NFT | null;
  token: TokenData | null;
  isUSD: boolean;
  hash: string;
}

export default function TransactionSuccess({
  open,
  onOpenChange,
  amount,
  nft,
  token,
  isUSD,
  hash,
}: TransactionSuccessProps) {
  const getExplorerUrl = () => {
    switch (token?.chain) {
      case 'ETHEREUM':
        return `https://etherscan.io/tx/${hash}`;
      case 'SOLANA':
        return `https://solscan.io/tx/${hash}`;
      case 'POLYGON':
        return `https://polygonscan.com/tx/${hash}`;
      case 'BASE':
        return `https://basescan.org/tx/${hash}`;
      default:
        return '';
    }
  };

  const explorerUrl = hash ? getExplorerUrl() : '';

  const price = token?.marketData?.price
    ? parseFloat(token.marketData.price)
    : 0;
  const parsedAmount = parseFloat(amount || '0');
  const tokenAmount = isUSD
    ? price
      ? (parsedAmount / price).toFixed(2)
      : '0.00'
    : parsedAmount.toFixed(2);
  const usdAmount = price
    ? isUSD
      ? parsedAmount.toFixed(2)
      : (parsedAmount * price).toFixed(2)
    : null;

  return (
    <CustomModal
      isOpen={open}
      onCloseModal={() => onOpenChange(false)}
      ariaLabel="Transaction complete"
      width="max-w-md"
      removeCloseButton
    >
      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        {/* ── Success icon ─────────────────────────────────────── */}
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_28px_-8px_rgba(16,185,129,0.55)]">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>

        {/* ── Message ──────────────────────────────────────────── */}
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-gray-900">
          Transaction complete
        </h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Your transfer has been submitted to the network.
        </p>

        {/* ── Asset ────────────────────────────────────────────── */}
        {nft ? (
          <div className="mt-5 flex flex-col items-center gap-3">
            <Image
              src={sanitizeNextImageSrc(nft.image) || nft.image}
              alt={nft.name}
              width={112}
              height={112}
              className="h-28 w-28 rounded-2xl object-cover shadow-sm"
            />
            <p className="text-[15px] font-semibold text-gray-900">
              {nft.name}
            </p>
          </div>
        ) : (
          token && (
            <div className="mt-5">
              <p className="text-[24px] font-semibold leading-tight text-gray-950 font-mono">
                {tokenAmount}{' '}
                <span className="text-[16px] font-semibold text-gray-500">
                  {token.symbol}
                </span>
              </p>
              {usdAmount && (
                <p className="mt-1 text-[13px] text-gray-500 font-mono">
                  ≈ ${usdAmount} USD
                </p>
              )}
            </div>
          )
        )}

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="mt-7 w-full space-y-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gray-950 text-[13px] font-semibold text-white transition hover:bg-gray-800"
          >
            Done
          </button>
          {explorerUrl && (
            <Link
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-black/[0.06] bg-white text-[13px] font-medium text-gray-700 transition hover:border-black/[0.15]"
            >
              View on Explorer
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </CustomModal>
  );
}
