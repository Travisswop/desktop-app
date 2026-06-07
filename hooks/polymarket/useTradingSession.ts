import { useState, useCallback, useEffect, useRef } from "react";
import { usePolymarketWallet } from "@/providers/polymarket";
import { useTokenApprovals } from "@/hooks/polymarket/useTokenApprovals";
import { useUserApiCredentials } from "@/hooks/polymarket/useUserApiCredentials";
import { useUser } from "@/lib/UserContext";
import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  TradingSession,
  SessionStep,
} from "@/lib/polymarket/session";
import {
  deployDepositWallet,
  fetchCachedCredentials,
  getWalletInfo,
  syncBalanceAllowance,
} from "@/lib/polymarket/backend-session";

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
  const silentRestoreAttemptRef = useRef<string | null>(null);

  const { eoaAddress } = usePolymarketWallet();
  const { accessToken } = useUser();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();

  // Always check for an existing trading session after wallet is connected by checking
  // session object from localStorage to track the status of the user's trading session
  useEffect(() => {
    if (!eoaAddress) {
      silentRestoreAttemptRef.current = null;
      setTradingSession(null);
      setCurrentStep("idle");
      setSessionError(null);
      return;
    }

    let stored = loadSession(eoaAddress);

    // If the session claims to have credentials, verify they are actually complete.
    // An incomplete secret causes postHeartbeat → buildPolyHmacSignature to throw
    // "Cannot read properties of undefined (reading 'replace')" every 5 seconds.
    if (stored?.hasApiCredentials) {
      const creds = stored.apiCredentials;
      if (!creds?.key || !creds?.secret || !creds?.passphrase) {
        console.warn(
          "[Polymarket] Stored session has incomplete API credentials — clearing session to force re-initialization.",
        );
        clearStoredSession(eoaAddress);
        stored = null;
      }
    }

    setTradingSession(stored);

    if (!stored) {
      setCurrentStep("idle");
      setSessionError(null);
      return;
    }
  }, [eoaAddress]);

  const silentlyRestoreTradingSession = useCallback(async (): Promise<boolean> => {
    if (!eoaAddress || !accessToken) return false;

    setCurrentStep("checking");
    setSessionError(null);

    try {
      const storedSession = loadSession(eoaAddress);
      const walletInfo = await getWalletInfo(eoaAddress, accessToken);
      const walletType: "safe" | "deposit" = walletInfo.recommendedWalletType;
      const tradingWalletAddress =
        walletType === "safe"
          ? walletInfo.safeAddress
          : walletInfo.depositWalletAddress;

      if (!tradingWalletAddress) return false;
      if (walletType === "deposit" && !walletInfo.depositWalletDeployed) {
        return false;
      }
      if (walletType === "safe" && !walletInfo.safeDeployed) {
        return false;
      }

      const baseRestoredSession: TradingSession = {
        eoaAddress,
        walletType,
        safeAddress: tradingWalletAddress,
        depositWalletAddress:
          walletType === "deposit" ? walletInfo.depositWalletAddress : undefined,
        isSafeDeployed:
          walletType === "safe" ? walletInfo.safeDeployed : true,
        isDepositWalletDeployed:
          walletType === "deposit" ? walletInfo.depositWalletDeployed : false,
        hasApiCredentials: false,
        apiCredentialsAddress: eoaAddress,
        hasApprovals: false,
        depositWalletRegisteredAt:
          walletType === "deposit"
            ? storedSession?.depositWalletRegisteredAt ?? Date.now()
            : undefined,
        lastChecked: Date.now(),
      };

      setTradingSession(baseRestoredSession);
      saveSession(eoaAddress, baseRestoredSession);

      const flowOpts =
        walletType === "deposit"
          ? {
              walletType,
              depositWalletAddress: walletInfo.depositWalletAddress,
            }
          : { walletType };
      const apiCreds = await fetchCachedCredentials(
        eoaAddress,
        accessToken,
        flowOpts
      );

      if (!apiCreds) return true;

      const approvalStatus = await checkAllTokenApprovals(tradingWalletAddress);

      const restoredSession: TradingSession = {
        ...baseRestoredSession,
        hasApiCredentials: true,
        hasApprovals: approvalStatus.allApproved,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(restoredSession);
      saveSession(eoaAddress, restoredSession);
      return true;
    } catch (err) {
      console.warn("[Polymarket] Silent trading-session restore failed:", err);
      return false;
    } finally {
      setCurrentStep("idle");
    }
  }, [eoaAddress, accessToken, checkAllTokenApprovals]);

  useEffect(() => {
    if (!eoaAddress || !accessToken) {
      silentRestoreAttemptRef.current = null;
      return;
    }
    if (currentStep !== "idle") return;
    if (
      tradingSession?.isSafeDeployed &&
      tradingSession?.hasApiCredentials &&
      tradingSession?.hasApprovals
    ) {
      return;
    }
    if (
      tradingSession?.isSafeDeployed &&
      tradingSession?.lastChecked &&
      (!tradingSession.hasApiCredentials || !tradingSession.hasApprovals)
    ) {
      return;
    }

    const restoreKey = `${eoaAddress.toLowerCase()}:${
      tradingSession?.lastChecked ?? "missing"
    }`;
    if (silentRestoreAttemptRef.current === restoreKey) return;
    silentRestoreAttemptRef.current = restoreKey;

    void silentlyRestoreTradingSession();
  }, [
    eoaAddress,
    accessToken,
    currentStep,
    tradingSession?.isSafeDeployed,
    tradingSession?.hasApiCredentials,
    tradingSession?.hasApprovals,
    tradingSession?.lastChecked,
    silentlyRestoreTradingSession,
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

      // Step 1 (removed): relay client initialization is no longer needed.
      // All relay operations go through the polymarket-backend proxy.

      if (!accessToken) {
        throw new Error("Not authenticated — cannot reach polymarket backend");
      }

      // Detect whether Polymarket already recognises a Safe for this EOA.
      // Existing Safe users must keep using signatureType=2 — Polymarket
      // does not auto-migrate them to deposit wallets, so a POLY_1271 order
      // under a Safe-bound EOA fails with the legacy signer-mismatch error.
      const walletInfo = await getWalletInfo(eoaAddress, accessToken);
      const walletType: "safe" | "deposit" = walletInfo.recommendedWalletType;
      const safeAddress = walletInfo.safeAddress;
      let depositWalletAddress: string | undefined = walletInfo.depositWalletAddress;
      let isDepositWalletDeployed = walletInfo.depositWalletDeployed;
      let tradingWalletAddress: string;

      if (walletType === "safe") {
        // Safe is already deployed on-chain (recommendedWalletType requires it).
        // Trade against the existing Safe with signatureType=2.
        tradingWalletAddress = safeAddress;
        depositWalletAddress = undefined;
      } else {
        // New-user path: trade against the deposit wallet with signatureType=3.
        if (
          storedSession?.depositWalletAddress &&
          storedSession.depositWalletAddress.toLowerCase() !==
            walletInfo.depositWalletAddress.toLowerCase()
        ) {
          console.warn(
            "[Polymarket] Stored deposit wallet does not match current EOA — refreshing session.",
          );
          isDepositWalletDeployed = false;
        }
        tradingWalletAddress = walletInfo.depositWalletAddress;

        if (!isDepositWalletDeployed || !storedSession?.depositWalletRegisteredAt) {
          setCurrentStep("deploying");
          const deployResult = await deployDepositWallet(eoaAddress, accessToken, {
            force: !storedSession?.depositWalletRegisteredAt,
          });
          if (!deployResult.deployed) {
            throw new Error("Deposit wallet deployment failed");
          }
          depositWalletAddress = deployResult.depositWalletAddress;
          tradingWalletAddress = deployResult.depositWalletAddress;
          isDepositWalletDeployed = true;
        }
      }

      // Step 5: Track the API-key wallet used for L2 auth. The CLOB SDK
      // derives API credentials from the signer EOA; deposit-wallet routing is
      // applied to the order maker/signer and funder address.
      const apiCredentialsAddress = eoaAddress;
      let apiCreds = storedSession?.apiCredentials;
      const storedApiCredentialsAddress = storedSession?.apiCredentialsAddress;
      const canReuseStoredApiCreds =
        !!apiCreds?.key &&
        !!apiCreds?.secret &&
        !!apiCreds?.passphrase &&
        (storedApiCredentialsAddress
          ? storedApiCredentialsAddress.toLowerCase() ===
            apiCredentialsAddress.toLowerCase()
          : true);

      if (
        !storedSession?.hasApiCredentials ||
        !canReuseStoredApiCreds ||
        storedSession?.walletType !== walletType
      ) {
        setCurrentStep("credentials");
        apiCreds = await createOrDeriveUserApiCredentials(
          walletType === "deposit"
            ? { walletType, depositWalletAddress }
            : { walletType },
        );
      }

      // Step 6: Set all required token approvals for trading.
      // Always verify on-chain (two cheap RPC reads) — never trust the stored
      // flag alone.  A previously cached hasApprovals:true can be stale if the
      // relay tx was submitted but never confirmed (e.g. after a signing bug).
      setCurrentStep("approvals");
      const approvalStatus = await checkAllTokenApprovals(
        tradingWalletAddress
      );
      let hasApprovals = approvalStatus.allApproved;
      if (!hasApprovals) {
        hasApprovals = await setAllTokenApprovals(
          tradingWalletAddress,
          eoaAddress,
          walletType
        );
      }

      if (apiCreds && accessToken) {
        await syncBalanceAllowance(
          {
            apiCreds,
            ...(walletType === "deposit"
              ? { depositWalletAddress: tradingWalletAddress }
              : { safeAddress: tradingWalletAddress }),
            walletType,
            eoaAddress,
            assetType: "COLLATERAL",
          },
          accessToken
        ).catch((err) => {
          console.warn("[Polymarket] Balance allowance sync failed:", err);
        });
      }

      // Step 7: Create custom session object
      const newSession: TradingSession = {
        eoaAddress: eoaAddress,
        walletType,
        safeAddress: tradingWalletAddress,
        depositWalletAddress,
        isSafeDeployed: true,
        isDepositWalletDeployed:
          walletType === "deposit" ? isDepositWalletDeployed : false,
        hasApiCredentials: true,
        apiCredentialsAddress,
        hasApprovals,
        apiCredentials: apiCreds,
        // Track when the wallet was last registered with Polymarket's
        // relayer under the current builder credentials. Re-using the
        // existing value (if any) preserves the timestamp across reloads
        // that didn't need a re-register; the force-re-register branch
        // above falls through to here and updates it. Only meaningful for
        // deposit-wallet sessions.
        depositWalletRegisteredAt:
          walletType === "deposit"
            ? storedSession?.depositWalletRegisteredAt ?? Date.now()
            : undefined,
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
    accessToken,
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
  ]);

  // This function clears the trading session and resets the state
  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;

    clearStoredSession(eoaAddress);
    setTradingSession(null);
    setCurrentStep("idle");
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
