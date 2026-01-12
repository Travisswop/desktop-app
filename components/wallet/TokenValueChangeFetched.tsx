"use client";

import React, { FC, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const CHAIN_MAP: Record<number, string> = {
  1: "ethereum",
  137: "polygon",
  8453: "base",
  1151111081099710: "solana",
};

type Props = {
  outputToken: {
    mint?: string;
    chainId?: number;
    price?: number | string;
    amount?: number | string;
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

  const buyPrice = Number(outputToken?.price);
  const buyAmount = Number(outputToken?.amount);

  /** ---------------- FETCH LIVE PRICE ---------------- */
  useEffect(() => {
    const fetchPrice = async () => {
      if (!outputToken?.chainId) {
        setCurrentPrice(buyPrice || null);
        return;
      }

      const chain = CHAIN_MAP[outputToken.chainId];
      if (!chain) {
        setCurrentPrice(buyPrice || null);
        return;
      }

      const address = outputToken.mint || null;
      const key = address ? address.toLowerCase() : "native";

      try {
        setIsLoading(true);
        const payload = {
          tokens: [
            {
              address,
              chain,
            },
          ],
        };

        const res = await fetch(`${apiUrl}/api/v5/market/prices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Price fetch failed");
        }

        const json = await res.json();
        const livePrice = json?.data?.prices?.[key]?.price;

        setCurrentPrice(
          livePrice !== undefined && livePrice !== null
            ? Number(livePrice)
            : buyPrice || null
        );
      } catch (error) {
        console.error("Error fetching price:", error);
        setCurrentPrice(buyPrice || null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
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
    <div
      className={cn(
        "inline-flex items-center justify-center text-sm px-4 py-1.5 rounded-full transition-colors",
        bgColorClass
      )}
    >
      <span className={cn("font-medium", colorClass)}>{text}</span>
    </div>
  );
};

export default TokenValueChangeFetcher;
