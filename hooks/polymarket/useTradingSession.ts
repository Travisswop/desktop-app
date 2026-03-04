import { useState, useCallback, useEffect } from 'react';
import { usePolymarketWallet } from '@/providers/polymarket';
import { useTokenApprovals } from '@/hooks/polymarket/useTokenApprovals';
import { useSafeDeployment } from '@/hooks/polymarket/useSafeDeployment';
import { useUserApiCredentials } from '@/hooks/polymarket/useUserApiCredentials';
import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  TradingSession,
  SessionStep,
} from '@/lib/polymarket/session';

// Coordinates the full trading session setup:
//   Safe address → (optional deploy) → API credentials → token approvals
// All relay/CLOB calls are proxied through polymarket-backend.

export function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<SessionStep>('idle');
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null,
  );

  const { eoaAddress, walletClient } = usePolymarketWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } =
    useSafeDeployment(eoaAddress);

  // Restore session from localStorage when wallet connects
  useEffect(() => {
    if (!eoaAddress) {
      setTradingSession(null);
      setCurrentStep('idle');
      setSessionError(null);
      return;
    }

    const stored = loadSession(eoaAddress);
    setTradingSession(stored);

    if (!stored) {
      setCurrentStep('idle');
      setSessionError(null);
    }
  }, [eoaAddress]);

  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress || !walletClient) throw new Error('Wallet not connected');

    setCurrentStep('checking');
    setSessionError(null);

    try {
      const storedSession = loadSession(eoaAddress);

      // Step 1: Safe address (async, fetched from API in useSafeDeployment)
      if (!derivedSafeAddressFromEoa)
        throw new Error('Failed to derive Safe address — please retry');

      // Step 2: Check / deploy Safe
      if (!storedSession?.isSafeDeployed) {
        const isDeployed = await isSafeDeployed(derivedSafeAddressFromEoa);

        if (!isDeployed) {
          setCurrentStep('deploying');
          try {
            await deploySafe();
          } catch (err) {
            if (
              err instanceof Error &&
              (err.message.includes('already deployed') ||
                err.message.includes('alreadyExisted'))
            ) {
              // Safe already on-chain — continue
            } else {
              throw err;
            }
          }
        }
      }

      // Step 3: L2 API credentials
      let apiCreds = storedSession?.apiCredentials;
      if (
        !storedSession?.hasApiCredentials ||
        !apiCreds?.key ||
        !apiCreds?.secret ||
        !apiCreds?.passphrase
      ) {
        setCurrentStep('credentials');
        apiCreds = await createOrDeriveUserApiCredentials();
      }

      // Step 4: Token approvals
      setCurrentStep('approvals');
      let hasApprovals = storedSession?.hasApprovals ?? false;
      if (!storedSession?.hasApprovals) {
        const approvalStatus = await checkAllTokenApprovals(
          derivedSafeAddressFromEoa,
        );

        if (approvalStatus.allApproved) {
          hasApprovals = true;
        } else {
          hasApprovals = await setAllTokenApprovals(
            derivedSafeAddressFromEoa,
            eoaAddress,
            walletClient,
          );
        }
      }

      const newSession: TradingSession = {
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: true,
        hasApiCredentials: true,
        hasApprovals,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Session initialization error:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setSessionError(error);
      setCurrentStep('idle');
    }
  }, [
    eoaAddress,
    walletClient,
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe,
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
  ]);

  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;
    clearStoredSession(eoaAddress);
    setTradingSession(null);
    setCurrentStep('idle');
    setSessionError(null);
  }, [eoaAddress]);

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete:
      tradingSession?.isSafeDeployed &&
      tradingSession?.hasApiCredentials &&
      tradingSession?.hasApprovals,
    initializeTradingSession,
    endTradingSession,
  };
}
