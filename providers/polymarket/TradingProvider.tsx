'use client';

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { usePolymarketWallet } from './PolymarketWalletContext';
import { useTradingSession } from '@/hooks/polymarket/useTradingSession';
import { useSafeDeployment } from '@/hooks/polymarket/useSafeDeployment';
import { useGeoblock, GeoblockStatus } from '@/hooks/polymarket/useGeoblock';
import { useClobHeartbeat } from '@/hooks/polymarket/useClobHeartbeat';
import { useUserOrdersChannel } from '@/hooks/polymarket/useUserOrdersChannel';
import { TradingSession, SessionStep } from '@/lib/polymarket/session';

interface TradingContextType {
  tradingSession: TradingSession | null;
  currentStep: SessionStep;
  sessionError: Error | null;
  isTradingSessionComplete: boolean | undefined;
  initializeTradingSession: () => Promise<void>;
  endTradingSession: () => void;
  eoaAddress: string | undefined;
  safeAddress: string | undefined;
  isGeoblocked: boolean;
  isGeoblockLoading: boolean;
  geoblockStatus: GeoblockStatus | null;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
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
  } = useTradingSession();

  // Keep open limit orders alive — pass apiCreds/safeAddress directly since
  // this hook is called inside TradingProvider (cannot use useTrading() here)
  useClobHeartbeat(
    tradingSession?.apiCredentials,
    tradingSession?.safeAddress,
  );

  // Real-time order/trade updates via user WebSocket channel
  useUserOrdersChannel(tradingSession?.apiCredentials);

  const initializeTradingSession = useCallback(async () => {
    if (isGeoblocked) {
      throw new Error(
        'Trading is not available in your region. Polymarket is geoblocked in your location.',
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
        eoaAddress,
        safeAddress: tradingSession?.safeAddress ?? derivedSafeAddressFromEoa,
        isGeoblocked,
        isGeoblockLoading,
        geoblockStatus,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
