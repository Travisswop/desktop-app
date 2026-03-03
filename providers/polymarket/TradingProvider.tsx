"use client";

import { createContext, useContext, ReactNode } from "react";
import { usePolymarketWallet } from "./PolymarketWalletContext";
import { useAMMOrder, type AMMOrderParams } from "@/hooks/polymarket/useAMMOrder";
import { useUSDCApproval } from "@/hooks/polymarket/useUSDCApproval";

interface TradingContextType {
  eoaAddress: string | undefined;
  // AMM order execution
  submitOrder: (params: AMMOrderParams) => Promise<{ success: boolean; hash: `0x${string}` }>;
  isSubmitting: boolean;
  orderError: Error | null;
  txHash: `0x${string}` | null;
  // USDC approval
  approveUSDC: () => Promise<`0x${string}`>;
  isApproving: boolean;
  approvalError: Error | null;
  checkIsApproved: (usdcAmount: number) => Promise<boolean>;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}

export function TradingProvider({ children }: { children: ReactNode }) {
  const { eoaAddress } = usePolymarketWallet();

  const {
    submitOrder,
    isSubmitting,
    txHash,
    error: orderError,
  } = useAMMOrder();

  const {
    approveUSDC,
    isApproving,
    error: approvalError,
    isApproved: checkIsApproved,
  } = useUSDCApproval();

  return (
    <TradingContext.Provider
      value={{
        eoaAddress,
        submitOrder,
        isSubmitting,
        orderError,
        txHash,
        approveUSDC,
        isApproving,
        approvalError,
        checkIsApproved,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
