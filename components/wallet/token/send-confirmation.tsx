'use client';

import { Button } from '@/components/ui/button';
import {
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { NFT } from '@/types/nft';
import Image from 'next/image';
import { Network } from '@/types/wallet-types';
import { TokenData } from '@/types/token';
import CustomModal from '@/components/modal/CustomModal';
import { useEffect, useMemo, useState } from 'react';
import { calculateEVMGasFee } from '../tools/gas_fee_evm';
import { calculateSolanaGasFee } from '../tools/gas_fee_solana';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';

interface SendConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  token: TokenData;
  recipient: string;
  recipientName: string;
  onConfirm: () => void;
  loading: boolean;
  nft: NFT | null;
  networkFee: string;
  network: Network;
  isUSD: boolean;
  nativeTokenPrice: number;
  /**
   * Whether the network fee is covered by Privy gas sponsorship.
   * The standard send flow always submits with `{ sponsor: true }`
   * through the Privy embedded wallet, so this defaults to true.
   */
  gasSponsored?: boolean;
}

const CHAIN_ICONS: Record<string, string> = {
  SOLANA: '/assets/icons/solana.png',
  ETHEREUM: '/images/IconShop/eTH@3x.png',
  POLYGON: '/images/IconShop/polygon@3x.png',
  BASE: '/assets/icons/base.png',
  ARBITRUM: '/assets/icons/arbitrum.png',
  BSC: '/images/IconShop/binance-smart-chain.png',
};

const getChainIcon = (chain: string) =>
  CHAIN_ICONS[chain?.toUpperCase?.() || ''] || null;

const getInitialAvatar = (label: string) => {
  const initials = (label || '??').slice(0, 2).toUpperCase();
  const svg = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><rect width="44" height="44" fill="#0a0a0c" rx="22"/><text x="22" y="28" text-anchor="middle" fill="white" font-size="15" font-weight="bold" font-family="sans-serif">${initials}</text></svg>`;
  if (typeof window === 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;
  }
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const shortenAddress = (address: string) =>
  address && address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;

export default function SendConfirmation({
  open,
  onOpenChange,
  amount,
  token,
  recipient,
  recipientName,
  onConfirm,
  loading,
  nft,
  networkFee,
  network,
  isUSD,
  nativeTokenPrice,
  gasSponsored = true,
}: SendConfirmationProps) {
  const [gasFeeUSD, setGasFeeUSD] = useState(0);
  const [dynamicNetworkFee, setDynamicNetworkFee] =
    useState(networkFee);

  useEffect(() => {
    const fetchGasFee = async () => {
      if (token.chain.toUpperCase() === 'SOLANA') {
        const fee = await calculateSolanaGasFee();
        setDynamicNetworkFee(fee);
        setGasFeeUSD(
          Number((Number(fee) * nativeTokenPrice).toFixed(5)),
        );
      } else {
        const fee = await calculateEVMGasFee(network);
        setDynamicNetworkFee(fee);
        setGasFeeUSD(
          Number((Number(fee) * nativeTokenPrice).toFixed(5)),
        );
      }
    };

    fetchGasFee();
  }, [network, nativeTokenPrice, token.chain]);

  const chainUpper = token.chain.toUpperCase();
  const nativeFeeSymbol =
    chainUpper === 'SOLANA'
      ? 'SOL'
      : chainUpper === 'POLYGON'
        ? 'MATIC'
        : 'ETH';

  const chainIcon = getChainIcon(chainUpper);

  // Token amount + USD equivalents
  const { tokenAmount, usdAmount } = useMemo(() => {
    const price = token.marketData?.price
      ? parseFloat(token.marketData.price)
      : 0;
    const parsedAmount = parseFloat(amount || '0');

    if (isUSD) {
      return {
        tokenAmount: price
          ? (parsedAmount / price).toFixed(6)
          : '0.000000',
        usdAmount: parsedAmount.toFixed(2),
      };
    }
    return {
      tokenAmount: parsedAmount.toFixed(6),
      usdAmount: price ? (parsedAmount * price).toFixed(2) : null,
    };
  }, [amount, isUSD, token.marketData?.price]);

  const tokenImage =
    sanitizeNextImageSrc(
      token.logoURI || token.marketData?.iconUrl,
    ) || getInitialAvatar(token.symbol);

  const recipientLabel = recipientName || 'Recipient';
  const recipientAvatar = getInitialAvatar(recipientLabel);

  return (
    <CustomModal
      isOpen={open}
      onCloseModal={() => onOpenChange(false)}
      title=""
      width="max-w-md"
    >
      <div className="px-5 pb-5 pt-1">
        {/* ── Asset being sent ───────────────────────────────── */}
        <div className="rounded-[14px] border border-black/[0.06] bg-[#fafafa] p-4">
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-[1.2px] text-[#6e6e76]">
            You send
          </span>

          {nft ? (
            <div className="mt-3 flex items-center gap-3">
              <Image
                src={sanitizeNextImageSrc(nft.image) || nft.image}
                alt={nft.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-xl object-cover shadow-sm"
              />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold text-[#0a0a0c]">
                  {nft.name}
                </div>
                <div className="mt-0.5 inline-block rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-[#6e6e76]">
                  Token ID: {nft.tokenId}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold leading-none tracking-tight text-[#0a0a0c]">
                    {tokenAmount}
                  </span>
                  <span className="text-[14px] font-semibold text-[#6e6e76]">
                    {token.symbol}
                  </span>
                </div>
                {usdAmount && (
                  <div className="mt-1.5 text-[12.5px] font-medium text-[#6e6e76]">
                    ≈ ${usdAmount}
                  </div>
                )}
              </div>
              <div className="relative h-11 w-11 flex-shrink-0">
                <Image
                  src={tokenImage}
                  alt={token.symbol}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                />
                {chainIcon && (
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
                    <Image
                      src={sanitizeNextImageSrc(chainIcon)}
                      alt={chainUpper}
                      width={14}
                      height={14}
                      className="h-3.5 w-3.5 rounded-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Direction arrow ────────────────────────────────── */}
        <div className="relative flex justify-center">
          <div className="-my-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-sm">
            <ArrowDown className="h-4 w-4 text-[#6e6e76]" />
          </div>
        </div>

        {/* ── Recipient ──────────────────────────────────────── */}
        <div className="rounded-[14px] border border-black/[0.06] bg-white p-4">
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-[1.2px] text-[#6e6e76]">
            To
          </span>
          <div className="mt-3 flex items-center gap-3">
            <Image
              src={recipientAvatar}
              alt={recipientLabel}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full"
            />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-[#0a0a0c]">
                {recipientLabel}
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-[#6e6e76]">
                {shortenAddress(recipient)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Transaction details ────────────────────────────── */}
        <div className="mt-3 rounded-[14px] border border-black/[0.06] bg-white px-4 py-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-[11.5px] text-[#6e6e76]">
              Network
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11.5px] font-medium text-[#0a0a0c]">
              {chainIcon && (
                <Image
                  src={sanitizeNextImageSrc(chainIcon)}
                  alt={chainUpper}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 rounded-full"
                />
              )}
              {chainUpper.charAt(0) +
                chainUpper.slice(1).toLowerCase()}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[11.5px] text-[#6e6e76]">
              Network fee
            </span>
            {gasSponsored ? (
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] text-[#6e6e76] line-through">
                  {dynamicNetworkFee} {nativeFeeSymbol}
                </span>
                <span className="rounded-full bg-[#19a974]/10 px-[7px] py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-wide text-[#19a974]">
                  Free
                </span>
              </span>
            ) : (
              <span className="text-right">
                <span className="block font-mono text-[11.5px] font-medium text-[#0a0a0c]">
                  {dynamicNetworkFee} {nativeFeeSymbol}
                </span>
                <span className="block font-mono text-[10.5px] text-[#6e6e76]">
                  ${gasFeeUSD}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* ── Sponsorship / warning banner ───────────────────── */}
        {gasSponsored ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-[12px] border border-[#19a974]/20 bg-[#19a974]/[0.07] p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#19a974]" />
            <p className="text-[12px] leading-relaxed text-[#0a0a0c]">
              <span className="font-semibold">
                Gas sponsored by SWOP.
              </span>{' '}
              <span className="text-[#6e6e76]">
                You won&apos;t pay any network fee for this transfer.
              </span>
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-[12px] leading-relaxed text-amber-700">
              Transactions can&apos;t be reversed. Make sure the
              recipient address is correct before confirming.
            </p>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-[1fr_1.6fr] gap-2.5 border-t border-black/[0.04] pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl border border-black/[0.06] bg-[#fafafa] py-3.5 text-sm font-semibold text-[#0a0a0c] transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-[#0a0a0c] py-3.5 text-sm font-bold -tracking-[0.1px] text-white transition-colors hover:bg-black/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </span>
            ) : (
              'Confirm & send'
            )}
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
