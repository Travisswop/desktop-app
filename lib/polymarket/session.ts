import { safeLocalStorage } from "@/lib/browserStorage";

export interface TradingSession {
  eoaAddress: string;
  walletType?: "safe" | "deposit";
  safeAddress: string;
  depositWalletAddress?: string;
  legacySafeAddress?: string;
  isSafeDeployed: boolean;
  isDepositWalletDeployed?: boolean;
  hasApiCredentials: boolean;
  apiCredentialsAddress?: string;
  hasApprovals: boolean;
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
  /**
   * Timestamp of the last successful relayer-side registration of the
   * deposit-wallet under the active builder credentials. When set, the
   * trading-session init skips the force-re-register step. Reset by
   * clearing localStorage (or rotating to a new wallet).
   */
  depositWalletRegisteredAt?: number;
  lastChecked: number;
}

export type SessionStep =
  | "idle"
  | "checking"
  | "deploying"
  | "credentials"
  | "approvals"
  | "complete";

export const loadSession = (address: string): TradingSession | null => {
  const stored = safeLocalStorage.getItem(
    `polymarket_trading_session_${address.toLowerCase()}`
  );
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as TradingSession;

    // Validate session belongs to this address
    if (session.eoaAddress.toLowerCase() !== address.toLowerCase()) {
      console.warn("Session address mismatch, clearing invalid session");
      clearSession(address);
      return null;
    }

    // Don't force walletType here — useTradingSession resolves it from
    // Polymarket's wallet-info endpoint on each init, so legacy Safe users
    // stay on signatureType=2 while new users get signatureType=3.
    if (session.walletType === "deposit" && !session.depositWalletAddress) {
      clearSession(address);
      return null;
    }
    if (session.walletType === "deposit") {
      session.safeAddress = session.depositWalletAddress!;
      session.legacySafeAddress = undefined;
    }

    if (session.hasApiCredentials) {
      // CLOB API credentials are EOA-owned in both flows; deposit-wallet
      // routing happens at order build time via signatureType + funderAddress.
      const expectedCredentialsAddress = session.eoaAddress;
      if (
        !expectedCredentialsAddress ||
        !session.apiCredentialsAddress ||
        session.apiCredentialsAddress.toLowerCase() !==
          expectedCredentialsAddress.toLowerCase()
      ) {
        session.hasApiCredentials = false;
        session.apiCredentials = undefined;
        session.apiCredentialsAddress = expectedCredentialsAddress;
      }
    }

    return session;
  } catch (e) {
    console.error("Failed to parse session:", e);
    return null;
  }
};

export const saveSession = (address: string, session: TradingSession): void => {
  safeLocalStorage.setItem(
    `polymarket_trading_session_${address.toLowerCase()}`,
    JSON.stringify(session)
  );
};

export const clearSession = (address: string): void => {
  safeLocalStorage.removeItem(
    `polymarket_trading_session_${address.toLowerCase()}`
  );
};
