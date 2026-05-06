"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import TokenValueChangeFetcher from "../wallet/TokenValueChangeFetched";
import { useUser } from "@/lib/UserContext";
import SwapTransactionShowGraph from "./SwapTransactionShowGraph";
dayjs.extend(relativeTime);

// ---------------------------------------------------------------------------
// formatNumber — mirrors RN TokenSwapHelper
// Shows compact notation for large numbers, enough decimals for small ones
// ---------------------------------------------------------------------------
function formatNumber(value: any): string {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) return "0";
  if (num === 0) return "0";

  const abs = Math.abs(num);

  if (abs >= 1_000_000_000)
    return (num / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (abs >= 1_000_000)
    return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (abs >= 1_000) return (num / 1_000).toFixed(2).replace(/\.?0+$/, "") + "K";
  if (abs >= 1) return num.toFixed(4).replace(/\.?0+$/, "");

  // Very small numbers — show up to 8 significant decimals
  const str = num.toPrecision(4);
  return str.replace(/\.?0+$/, "");
}

// ---------------------------------------------------------------------------
// Chain map — same as RN TransactionSwapCard
// ---------------------------------------------------------------------------
const CHAIN_MAP: Record<number, string> = {
  1: "ethereum",
  137: "polygon",
  8453: "base",
  1151111081099710: "solana",
  //need to add arbitram
};

// ---------------------------------------------------------------------------
// Token image helper — handles SVG + PNG/JPG (mirrors RN RenderTokenImage)
// ---------------------------------------------------------------------------
const TokenImage: React.FC<{ uri: string; size?: number }> = ({
  uri,
  size = 40,
}) => {
  const isSvg = uri?.toLowerCase().endsWith(".svg");
  return (
    <div
      className="rounded-full overflow-hidden border-2 border-white"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {isSvg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uri}
          alt="token"
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Image
          src={
            uri?.startsWith("https")
              ? uri
              : `/assets/crypto-icons/${uri?.split("/").pop()}`
          }
          alt="token"
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Props — mirrors RN postCardProps
// ---------------------------------------------------------------------------
interface SwapTransactionCardProps {
  feed: any;
  currentSmartSiteId?: string;
  refetchPosts?: () => void;
  secondaryFontColor?: string;
  onPress?: () => void;
  onTransactionPress?: () => void;
  setIsTipOpen?: (v: boolean) => void;
  setCurrentPost?: (v: any) => void;
  navigateBack?: () => void;
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const SwapTransactionCard: React.FC<SwapTransactionCardProps> = ({
  feed,
  onPress,
  onTransactionPress,
  refreshKey,
}) => {
  const { accessToken } = useUser();

  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [growth, setGrowth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const hasFetchedPrice = useRef(false);

  const inputToken = feed?.content?.inputToken;
  const outputToken = feed?.content?.outputToken;

  const profilePic =
    feed?.smartsiteId?.profilePic ||
    feed?.smartsiteDetails?.profilePic ||
    feed?.smartsiteProfilePic ||
    null;

  // Resolve full image URL (same logic as RN)
  const resolveTokenImg = (token: any): string => {
    const img = token?.tokenImg ?? "";
    return img.startsWith("https")
      ? img
      : `/assets/crypto-icons/${token?.symbol}.png`;
  };

  // ---------------------------------------------------------------------------
  // Live price fetch — exact port of RN fetchPrice
  // ---------------------------------------------------------------------------
  const fetchPrice = useCallback(async () => {
    if (!outputToken?.chain) {
      setLivePrice(Number(outputToken?.price) || null);
      return;
    }
    const chain = CHAIN_MAP[outputToken.chain];
    if (!chain) {
      setLivePrice(Number(outputToken?.price) || null);
      return;
    }
    const address = outputToken?.mint ?? null;
    const key = address ? address.toLowerCase() : "native";
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/market/prices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ tokens: [{ address, chain }] }),
        },
      );
      if (!res.ok) throw new Error("Price fetch failed");
      const json = await res.json();
      const price = json?.data?.prices?.[key]?.price;
      setLivePrice(
        price !== undefined && price !== null
          ? Number(price)
          : Number(outputToken?.price) || null,
      );
    } catch {
      setLivePrice(Number(outputToken?.price) || null);
    }
  }, [outputToken, accessToken]);

  // On mount — guarded by ref (mirrors RN hasFetchedPrice pattern)
  useEffect(() => {
    if (hasFetchedPrice.current) return;
    hasFetchedPrice.current = true;
    fetchPrice();
  }, [fetchPrice]);

  // Re-fetch on pull-to-refresh equivalent
  useEffect(() => {
    if (!refreshKey) return;
    hasFetchedPrice.current = false;
    fetchPrice();
  }, [refreshKey, fetchPrice]);

  // ---------------------------------------------------------------------------
  // Measure card width — mirrors RN onLayout
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!cardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w !== cardWidth) setCardWidth(w);
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [cardWidth]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full flex justify-start mt-1">
      <div className="w-full max-w-xl">
        <div
          ref={cardRef}
          className="rounded-[18px] bg-white overflow-hidden cursor-pointer"
          style={{
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          }}
          onClick={onTransactionPress}
        >
          {/* ── Top padded section ───────────────────────────────────────── */}
          <div className="px-4 pt-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              {/* Overlapping token pair */}
              <div className="flex items-center">
                <div className="shadow rounded-full">
                  <TokenImage uri={resolveTokenImg(inputToken)} size={40} />
                </div>
                <div
                  className="-ml-3 rounded-full bg-white"
                  style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}
                >
                  <TokenImage uri={resolveTokenImg(outputToken)} size={40} />
                </div>
              </div>

              {/* Live price */}
              <div className="flex flex-col items-end">
                <span className="text-xl font-semibold text-gray-900 leading-tight">
                  ${livePrice ? livePrice.toFixed(3) : "0.000"}
                </span>
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                  {outputToken?.symbol} PRICE
                </span>
              </div>
            </div>

            {/* Price change badge */}
            <div className="mb-3">
              <TokenValueChangeFetcher
                outputToken={outputToken}
                token={accessToken || ""}
              />
            </div>
          </div>

          {/* ── Full-bleed graph (no horizontal padding) ─────────────────── */}
          <div className="overflow-hidden">
            {cardWidth > 0 && (
              <SwapTransactionShowGraph
                setGrowth={setGrowth}
                createdAt={feed?.createdAt}
                profilePic={profilePic}
                chartWidth={cardWidth}
                outputToken={outputToken}
                authToken={accessToken || ""}
                apiBase={`${process.env.NEXT_PUBLIC_API_URL}/api/v5` || ""}
              />
            )}
          </div>

          {/* ── Bottom padded section ─────────────────────────────────────── */}
          <div className="px-4 pb-4 pt-3">
            {/* QUANTITY / PRICE columns */}
            <div className="flex items-start justify-around mb-4">
              <div className="flex flex-col items-center">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "#949494" }}
                >
                  QUANTITY
                </span>
                <span className="text-[15px] font-bold text-green-500">
                  {formatNumber(outputToken?.amount)} {outputToken?.symbol}
                </span>
              </div>

              <div className="w-px self-stretch bg-gray-100" />

              <div className="flex flex-col items-center">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "#949494" }}
                >
                  PRICE
                </span>
                <span className="text-[15px] font-bold text-red-500">
                  {formatNumber(inputToken?.amount)} {inputToken?.symbol}
                </span>
              </div>
            </div>

            {/* Copy Trade button */}
            <div
              className="flex items-center justify-end pt-3 border-t border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {onPress ? (
                <button
                  onClick={onPress}
                  className="px-7 py-2 rounded-full text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Copy Trade
                </button>
              ) : (
                <Link
                  href={`/wallet?inputToken=${inputToken?.symbol}&inputMint=${inputToken?.mint}&inputChain=${inputToken?.chain || inputToken?.chainId}&inputImg=${encodeURIComponent(resolveTokenImg(inputToken))}&inputDecimals=${inputToken?.decimals}&outputToken=${outputToken?.symbol}&outputMint=${outputToken?.mint}&outputChain=${outputToken?.chain || outputToken?.chainId}&outputImg=${encodeURIComponent(resolveTokenImg(outputToken))}&outputDecimals=${outputToken?.decimals}&amount=${inputToken?.amount}`}
                  className="px-7 py-2 rounded-lg text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Copy Trade
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapTransactionCard;
