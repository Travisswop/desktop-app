"use client";

import React, { FC, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { fetchTokenLivePriceSnapshot } from "@/lib/utils/marketPriceClient";
import { MarketPriceDelayNotice } from "./market-price-delay-notice";

type Props = {
  outputToken: {
    mint?: string;
    address?: string;
    chain?: number | string;
    chainId?: number | string;
    network?: string;
    price?: number | string;
    amount?: number | string;
    symbol?: string;
    usdPrice?: number | string;
    marketData?: {
      price?: number | string;
      currentPrice?: number | string;
    };
  };
  token: string; // Auth token passed as prop instead of Redux
  apiUrl?: string; // Optional API URL
};

const TokenValueChangeFetcher: FC<Props> = ({
  outputToken,
  token,
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
}) => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [priceDegraded, setPriceDegraded] = useState(false);

  const buyPrice = Number(
    outputToken?.price || outputToken?.usdPrice || outputToken?.marketData?.price,
  );
  const buyAmount = Number(outputToken?.amount);

  /** ---------------- FETCH LIVE PRICE ---------------- */
  useEffect(() => {
    let cancelled = false;

    const fetchPrice = async () => {
      try {
        if (!cancelled) setIsLoading(true);
        const snapshot = await fetchTokenLivePriceSnapshot({
          outputToken,
          apiUrl,
          authToken: token,
        });

        if (!cancelled) {
          setCurrentPrice(snapshot.price ?? (buyPrice || null));
          setPriceDegraded(snapshot.degraded);
        }
      } catch (error) {
        console.error("Error fetching price:", error);
        if (!cancelled) {
          setCurrentPrice(buyPrice || null);
          setPriceDegraded(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPrice();
    const interval = window.setInterval(fetchPrice, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [buyPrice, outputToken, token, apiUrl]);

  /** ---------------- CALCULATION ---------------- */
  const { text, colorClass, bgColorClass } = useMemo(() => {
    if (!buyPrice || !buyAmount || !currentPrice) {
      return {
        text: "0.00%",
        colorClass: "text-gray-800",
        bgColorClass: "bg-gray-100",
      };
    }

    const buyValue = buyPrice * buyAmount;
    const currentValue = currentPrice * buyAmount;

    if (buyValue === 0) {
      return {
        text: "0.00%",
        colorClass: "text-gray-800",
        bgColorClass: "bg-gray-100",
      };
    }

    const percentage = ((currentValue - buyValue) / buyValue) * 100;

    return {
      text: `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`,
      colorClass: percentage >= 0 ? "text-green-500" : "text-red-500",
      bgColorClass: percentage >= 0 ? "bg-green-50" : "bg-red-50",
    };
  }, [buyPrice, buyAmount, currentPrice]);

  if (isLoading) {
    return (
      <div className="inline-flex items-center justify-center h-12 px-5 py-1.5 bg-gray-100 rounded-full">
        <span className="text-sm font-medium text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div
        className={cn(
          "inline-flex items-center justify-center text-sm px-4 py-1.5 rounded-full transition-colors",
          bgColorClass
        )}
      >
        <span className={cn("font-medium", colorClass)}>{text}</span>
      </div>
      <MarketPriceDelayNotice degraded={priceDegraded} />
    </div>
  );
};

export default TokenValueChangeFetcher;
