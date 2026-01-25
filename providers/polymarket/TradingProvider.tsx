"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import type { ClobClient } from "@polymarket/clob-client";
import type { RelayClient } from "@polymarket/builder-relayer-client";
import { usePolymarketWallet } from "./PolymarketWalletContext";
import { useClobClient } from "@/hooks/polymarket/useClobClient";
import { useTradingSession } from "@/hooks/polymarket/useTradingSession";
import { useSafeDeployment } from "@/hooks/polymarket/useSafeDeployment";
import { useGeoblock, GeoblockStatus } from "@/hooks/polymarket/useGeoblock";
import { TradingSession, SessionStep } from "@/lib/polymarket/session";

interface TradingContextType {
  tradingSession: TradingSession | null;
  currentStep: SessionStep;
  sessionError: Error | null;
  isTradingSessionComplete: boolean | undefined;
  initializeTradingSession: () => Promise<void>;
  endTradingSession: () => void;
  clobClient: ClobClient | null;
  relayClient: RelayClient | null;
  eoaAddress: string | undefined;
  safeAddress: string | undefined;
  isGeoblocked: boolean;
  isGeoblockLoading: boolean;
  geoblockStatus: GeoblockStatus | null;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}

export function TradingProvider({ children }: { children: ReactNode }) {
  const { eoaAddress } = usePolymarketWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);

  const {
    isBlocked: isGeoblocked,
    isLoading: isGeoblockLoading,
    geoblockStatus,
  } = useGeoblock();

  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession: initSession,
    endTradingSession,
    relayClient,
  } = useTradingSession();

  const { clobClient } = useClobClient(
    tradingSession,
    isTradingSessionComplete
  );

  const initializeTradingSession = useCallback(async () => {
    if (isGeoblocked) {
      throw new Error(
        "Trading is not available in your region. Polymarket is geoblocked in your location."
      );
    }
    return initSession();
  }, [isGeoblocked, initSession]);

  return (
    <TradingContext.Provider
      value={{
        tradingSession,
        currentStep,
        sessionError,
        isTradingSessionComplete,
        initializeTradingSession,
        endTradingSession,
        clobClient,
        relayClient,
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isGeoblocked,
        isGeoblockLoading,
        geoblockStatus,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
