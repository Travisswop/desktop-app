"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import TokenValueChangeFetcher from "../wallet/TokenValueChangeFetched";
import { useUser } from "@/lib/UserContext";
import SwapTransactionShowGraph from "./SwapTransactionShowGraph";
import { fetchTokenLivePrice } from "@/lib/utils/marketPriceClient";
import { getTokenFallbackPrice } from "@/lib/utils/tokenMarketData";
import { sanitizeNextImageSrc } from "@/lib/sanitizeNextImageSrc";
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

const TOKEN_IMAGE_SYMBOL_ALIASES: Record<string, string[]> = {
  PUSD: ["PUSD"],
};

const unique = (values: string[]) =>
  values.filter((value, index, array) => value && array.indexOf(value) === index);

const cryptoIconPath = (symbolOrFile: string) => {
  const clean = symbolOrFile.trim();
  if (!clean) return "";
  const fileName = /\.(png|jpe?g|gif|webp|svg)$/i.test(clean)
    ? clean
    : `${clean}.png`;
  return `/assets/crypto-icons/${encodeURIComponent(fileName)}`;
};

const imageValueCandidates = (value: unknown): string[] => {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  if (/^(https?:|data:|blob:|ipfs:\/\/|\/\/)/i.test(raw) || raw.startsWith("/")) {
    return [sanitizeNextImageSrc(raw)];
  }

  const sanitized = sanitizeNextImageSrc(raw);
  const fileName = raw.split(/[?#]/)[0]?.split("/").pop() ?? raw;

  return unique([
    raw.includes("/") ? sanitized : "",
    /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName) ? cryptoIconPath(fileName) : "",
    !/\.(png|jpe?g|gif|webp|svg)$/i.test(fileName) ? cryptoIconPath(fileName) : "",
    sanitized,
  ]);
};

const tokenSymbolCandidates = (symbol: unknown): string[] => {
  const rawSymbol = String(symbol ?? "").trim();
  if (!rawSymbol) return [];

  const upperSymbol = rawSymbol.toUpperCase();
  const aliases = TOKEN_IMAGE_SYMBOL_ALIASES[upperSymbol] ?? [];

  const symbolValues = aliases.length
    ? [...aliases, rawSymbol, upperSymbol]
    : [rawSymbol, upperSymbol];

  return unique(
    symbolValues.map((symbolValue) =>
      cryptoIconPath(symbolValue),
    ),
  );
};

const hasTokenImageAlias = (symbol: unknown) => {
  const upperSymbol = String(symbol ?? "").trim().toUpperCase();
  return Boolean(TOKEN_IMAGE_SYMBOL_ALIASES[upperSymbol]?.length);
};

const getTokenImageCandidates = (token: any): string[] => {
  const symbolCandidates = tokenSymbolCandidates(token?.symbol);
  const aliasedSymbol = hasTokenImageAlias(token?.symbol);
  const dataCandidates = [
    ...imageValueCandidates(token?.tokenImg),
    ...imageValueCandidates(token?.logoURI),
    ...imageValueCandidates(token?.icon),
    ...imageValueCandidates(token?.logo),
    ...imageValueCandidates(token?.image),
  ];

  return unique(
    aliasedSymbol
      ? [...symbolCandidates, ...dataCandidates]
      : [...dataCandidates, ...symbolCandidates],
  );
};

// ---------------------------------------------------------------------------
// Token image helper — handles SVG + PNG/JPG (mirrors RN RenderTokenImage)
// ---------------------------------------------------------------------------
const TokenImage: React.FC<{
  sources: string[];
  label?: string;
  size?: number;
}> = ({ sources, label = "token", size = 40 }) => {
  const candidates = useMemo(() => unique(sources), [sources]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const uri = candidates[candidateIndex];
  const isSvg = uri?.toLowerCase().split("?")[0]?.endsWith(".svg");
  const displayLabel = String(label ?? "token");
  const fallbackLabel = displayLabel.trim().slice(0, 4).toUpperCase() || "?";

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const handleImageError = () => {
    setCandidateIndex((index) => index + 1);
  };

  return (
    <div
      className="flex items-center justify-center rounded-full overflow-hidden border-2 border-white bg-gray-100"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {!uri ? (
        <span className="font-mono text-[9px] font-black leading-none text-gray-500">
          {fallbackLabel}
        </span>
      ) : isSvg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uri}
          alt={displayLabel}
          width={size}
          height={size}
          onError={handleImageError}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Image
          key={uri}
          src={uri}
          alt={displayLabel}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={handleImageError}
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
  onFeedClick?: () => void;
  onTransactionPress?: () => void;
  showAmountDetails?: boolean;
  showCopyTrade?: boolean;
  showSolscanLink?: boolean;
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
  onFeedClick,
  onTransactionPress,
  refreshKey,
}) => {
  const { accessToken } = useUser();

  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [, setGrowth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);

  const inputToken = feed?.content?.inputToken;
  const outputToken = feed?.content?.outputToken;
  const marketApiBase = process.env.NEXT_PUBLIC_API_URL || "";

  const profilePic =
    feed?.smartsiteId?.profilePic ||
    feed?.smartsiteDetails?.profilePic ||
    feed?.smartsiteProfilePic ||
    null;

  const inputTokenImageCandidates = useMemo(
    () => getTokenImageCandidates(inputToken),
    [inputToken],
  );
  const outputTokenImageCandidates = useMemo(
    () => getTokenImageCandidates(outputToken),
    [outputToken],
  );

  const resolveTokenImg = (token: any): string =>
    getTokenImageCandidates(token)[0] ||
    cryptoIconPath(String(token?.symbol ?? ""));

  // ---------------------------------------------------------------------------
  // Live price fetch
  // ---------------------------------------------------------------------------
  const fetchPrice = useCallback(async () => {
    setLivePrice(
      await fetchTokenLivePrice({
        outputToken,
        apiUrl: marketApiBase,
        authToken: accessToken,
      }),
    );
  }, [outputToken, accessToken, marketApiBase]);

  // Keep the header live while the card is on screen.
  useEffect(() => {
    fetchPrice();
    const interval = window.setInterval(fetchPrice, 30000);
    return () => window.clearInterval(interval);
  }, [fetchPrice]);

  // Re-fetch on pull-to-refresh equivalent
  useEffect(() => {
    if (!refreshKey) return;
    fetchPrice();
  }, [refreshKey, fetchPrice]);

  const displayPrice = livePrice ?? getTokenFallbackPrice(outputToken);

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
                  <TokenImage
                    sources={inputTokenImageCandidates}
                    label={inputToken?.symbol}
                    size={40}
                  />
                </div>
                <div
                  className="-ml-3 rounded-full bg-white"
                  style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}
                >
                  <TokenImage
                    sources={outputTokenImageCandidates}
                    label={outputToken?.symbol}
                    size={40}
                  />
                </div>
              </div>

              {/* Live price */}
              <div className="flex flex-col items-end">
                <span className="font-mono text-[28px] font-black leading-none tabular-nums text-gray-950">
                  ${displayPrice ? displayPrice.toFixed(3) : "0.000"}
                </span>
                <span className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
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
                apiBase={marketApiBase ? `${marketApiBase}/api/v5` : ""}
                livePrice={livePrice}
              />
            )}
          </div>

          {/* ── Bottom padded section ─────────────────────────────────────── */}
          <div className="px-4 pb-4 pt-3">
            {/* QUANTITY / PRICE columns */}
            <div className="flex items-start justify-around mb-4">
              <div className="flex flex-col items-center">
                <span
                  className="mb-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400"
                >
                  QUANTITY
                </span>
                <span className="font-mono text-[16px] font-black tabular-nums text-green-500">
                  {formatNumber(outputToken?.amount)} {outputToken?.symbol}
                </span>
              </div>

              <div className="w-px self-stretch bg-gray-100" />

              <div className="flex flex-col items-center">
                <span
                  className="mb-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400"
                >
                  PRICE
                </span>
                <span className="font-mono text-[16px] font-black tabular-nums text-red-500">
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
                  className="rounded-full bg-gray-100 px-7 py-2 text-[13px] font-extrabold text-gray-950 transition-all hover:bg-gray-200 active:scale-95"
                >
                  Copy Trade
                </button>
              ) : (
                <Link
                  href={`/wallet?inputToken=${inputToken?.symbol}&inputMint=${inputToken?.mint}&inputChain=${inputToken?.chain || inputToken?.chainId}&inputImg=${encodeURIComponent(resolveTokenImg(inputToken))}&inputDecimals=${inputToken?.decimals}&outputToken=${outputToken?.symbol}&outputMint=${outputToken?.mint}&outputChain=${outputToken?.chain || outputToken?.chainId}&outputImg=${encodeURIComponent(resolveTokenImg(outputToken))}&outputDecimals=${outputToken?.decimals}&amount=${inputToken?.amount}&copyTrade=1&copyTradePostId=${encodeURIComponent(feed?._id || "")}`}
                  className="rounded-lg bg-gray-100 px-7 py-2 text-[13px] font-extrabold text-gray-950 transition-all hover:bg-gray-200 active:scale-95"
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
