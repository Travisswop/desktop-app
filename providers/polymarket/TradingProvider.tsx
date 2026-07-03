"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { usePolymarketWallet } from "./PolymarketWalletContext";
import { useClobClient } from "@/hooks/polymarket/useClobClient";
import { useTradingSession } from "@/hooks/polymarket/useTradingSession";
import { useGeoblock, GeoblockStatus } from "@/hooks/polymarket/useGeoblock";
import { useClobHeartbeat } from "@/hooks/polymarket/useClobHeartbeat";
import { useUserOrdersChannel } from "@/hooks/polymarket/useUserOrdersChannel";
import { TradingSession, SessionStep } from "@/lib/polymarket/session";

interface TradingContextType {
  tradingSession: TradingSession | null;
  currentStep: SessionStep;
  sessionError: Error | null;
  isTradingSessionComplete: boolean | undefined;
  initializeTradingSession: () => Promise<void>;
  endTradingSession: () => void;
  clobClient: object | null;
  relayClient: object | null;
  eoaAddress: string | undefined;
  safeAddress: string | undefined;
  legacySafeAddress: string | undefined;
  depositWalletAddress: string | undefined;
  tradingWalletAddress: string | undefined;
  portfolioAddresses: string[];
  walletType: "safe" | "deposit";
  isGeoblocked: boolean;
  isCloseOnly: boolean;
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

  const {
    isBlocked: isGeoblocked,
    isCloseOnly,
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
  } = useTradingSession();

  const { clobClient } = useClobClient(
    tradingSession,
    isTradingSessionComplete
  );

  const clobClientAsObject = clobClient as object | null;
  const relayClient = isTradingSessionComplete ? {} : null;
  const shouldRunTradeMaintenance =
    !isGeoblocked && !isGeoblockLoading;

  // walletType is resolved during session init from Polymarket's
  // /session/wallet-info — legacy Safe users keep signatureType=2, new
  // users get signatureType=3 with deposit wallets.
  const walletType: "safe" | "deposit" = tradingSession?.walletType ?? "deposit";
  const tradingWalletAddress =
    walletType === "deposit"
      ? tradingSession?.depositWalletAddress ?? tradingSession?.safeAddress
      : tradingSession?.safeAddress;
  const legacySafeAddress = undefined;
  const depositWalletAddress =
    walletType === "deposit" ? tradingSession?.depositWalletAddress : undefined;
  const portfolioAddresses = useMemo(
    () =>
      Array.from(
        new Map(
          [tradingWalletAddress]
            .filter((addr): addr is string => !!addr)
            .map((addr) => [addr.toLowerCase(), addr])
        ).values()
      ),
    [tradingWalletAddress]
  );

  // Keep open limit orders alive when trading is allowed. Geoblocked users can
  // still view positions, but should not run trade-maintenance traffic.
  useClobHeartbeat(
    shouldRunTradeMaintenance ? tradingSession : null,
    shouldRunTradeMaintenance ? tradingWalletAddress : undefined
  );

  // Real-time order/trade updates via user WebSocket channel
  useUserOrdersChannel(
    shouldRunTradeMaintenance ? tradingSession?.apiCredentials : null
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
        clobClient: clobClientAsObject,
        relayClient,
        eoaAddress,
        safeAddress: tradingWalletAddress,
        legacySafeAddress,
        depositWalletAddress,
        tradingWalletAddress,
        portfolioAddresses,
        walletType,
        isGeoblocked,
        isCloseOnly,
        isGeoblockLoading,
        geoblockStatus,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
