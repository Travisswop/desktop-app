import { useState, useCallback, useEffect } from "react";
import { useRelayClient } from "@/hooks/polymarket/useRelayClient";
import { usePolymarketWallet } from "@/providers/polymarket";
import { useTokenApprovals } from "@/hooks/polymarket/useTokenApprovals";
import { useSafeDeployment } from "@/hooks/polymarket/useSafeDeployment";
import { useUserApiCredentials } from "@/hooks/polymarket/useUserApiCredentials";
import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  TradingSession,
  SessionStep,
} from "@/lib/polymarket/session";

// This is the coordination hook that manages the user's trading session
// It orchestrates the steps for initializing both the clob and relay clients
// It creates, stores, and loads the user's L2 credentials for the trading session (API credentials)
// It deploys the Safe and sets token approvals for the CTF Exchange

export function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<SessionStep>("idle");
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null
  );

  const { eoaAddress, walletClient } = usePolymarketWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } =
    useSafeDeployment(eoaAddress);
  const { relayClient, initializeRelayClient, clearRelayClient } =
    useRelayClient();

  // Always check for an existing trading session after wallet is connected by checking
  // session object from localStorage to track the status of the user's trading session
  useEffect(() => {
    if (!eoaAddress) {
      setTradingSession(null);
      setCurrentStep("idle");
      setSessionError(null);
      return;
    }

    const stored = loadSession(eoaAddress);
    setTradingSession(stored);

    if (!stored) {
      setCurrentStep("idle");
      setSessionError(null);
      return;
    }
  }, [eoaAddress]);

  // Restores the relay client when session exists
  useEffect(() => {
    if (tradingSession && !relayClient && eoaAddress && walletClient) {
      initializeRelayClient().catch((err) => {
        console.error("Failed to restore relay client:", err);
      });
    }
  }, [
    tradingSession,
    relayClient,
    eoaAddress,
    walletClient,
    initializeRelayClient,
  ]);

  // The core function that orchestrates the trading session initialization
  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress) throw new Error("Wallet not connected");

    setCurrentStep("checking");
    setSessionError(null);

    try {
      // Read latest session directly from localStorage — React state may be stale
      // because this function is called before the session-loading effect completes
      const storedSession = loadSession(eoaAddress);

      // Step 1: Initializes relayClient with the ethers signer and
      // Builder's credentials (via remote signing server) for authentication
      const initializedRelayClient = await initializeRelayClient();

      // Step 2: Get Safe address (deterministic derivation from EOA)
      if (!derivedSafeAddressFromEoa) {
        throw new Error("Failed to derive Safe address");
      }

      // Steps 3-4: Check and deploy Safe — skip entirely if already recorded in storage
      if (!storedSession?.isSafeDeployed) {
        let isDeployed = await isSafeDeployed(
          initializedRelayClient,
          derivedSafeAddressFromEoa
        );

        if (!isDeployed) {
          setCurrentStep("deploying");
          await deploySafe(initializedRelayClient);
        }
      }

      // Step 5: Get User API Credentials — skip if already stored
      let apiCreds = storedSession?.apiCredentials;
      if (
        !storedSession?.hasApiCredentials ||
        !apiCreds?.key ||
        !apiCreds?.secret ||
        !apiCreds?.passphrase
      ) {
        setCurrentStep("credentials");
        apiCreds = await createOrDeriveUserApiCredentials();
      }

      // Step 6: Set all required token approvals for trading
      // Always verify on-chain, but skip relay call if already approved in storage
      setCurrentStep("approvals");
      let hasApprovals = storedSession?.hasApprovals ?? false;
      if (!storedSession?.hasApprovals) {
        const approvalStatus = await checkAllTokenApprovals(
          derivedSafeAddressFromEoa
        );

        if (approvalStatus.allApproved) {
          hasApprovals = true;
        } else {
          hasApprovals = await setAllTokenApprovals(initializedRelayClient);
        }
      }

      // Step 7: Create custom session object
      const newSession: TradingSession = {
        eoaAddress: eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: true,
        hasApiCredentials: true,
        hasApprovals,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);

      setCurrentStep("complete");
    } catch (err) {
      console.error("Session initialization error:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSessionError(error);
      setCurrentStep("idle");
    }
  }, [
    eoaAddress,
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe,
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
    initializeRelayClient,
  ]);

  // This function clears the trading session and resets the state
  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;

    clearStoredSession(eoaAddress);
    setTradingSession(null);
    clearRelayClient();
    setCurrentStep("idle");
    setSessionError(null);
  }, [eoaAddress, clearRelayClient]);

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
    relayClient,
  };
}
