"use client";

import { createContext, useContext, ReactNode } from "react";
import { usePolymarketWallet } from "./PolymarketWalletContext";
import { useTradingSession, type TradingSessionStep } from "@/hooks/polymarket/useTradingSession";
import type { ClobClient } from '@polymarket/clob-client';

interface TradingContextType {
  eoaAddress: string | undefined;
  // CLOB trading session
  currentStep: TradingSessionStep;
  sessionError: string | null;
  clobClient: ClobClient | null;
  isInitializing: boolean;
  isTradingSessionComplete: boolean;
  initializeTradingSession: () => Promise<void>;
  endTradingSession: () => void;
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
    currentStep,
    sessionError,
    clobClient,
    isInitializing,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
  } = useTradingSession();

  return (
    <TradingContext.Provider
      value={{
        eoaAddress,
        currentStep,
        sessionError,
        clobClient,
        isInitializing,
        isTradingSessionComplete,
        initializeTradingSession,
        endTradingSession,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
