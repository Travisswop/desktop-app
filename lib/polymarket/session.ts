export interface TradingSession {
  eoaAddress: string;
  walletType?: "safe" | "deposit";
  safeAddress: string;
  depositWalletAddress?: string;
  legacySafeAddress?: string;
  isSafeDeployed: boolean;
  isDepositWalletDeployed?: boolean;
  hasApiCredentials: boolean;
  hasApprovals: boolean;
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
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
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(
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

    if (!session.walletType) {
      session.walletType = "safe";
    }
    if (!session.legacySafeAddress) {
      session.legacySafeAddress = session.safeAddress;
    }
    if (session.walletType === "deposit" && session.depositWalletAddress) {
      session.safeAddress = session.depositWalletAddress;
    }

    return session;
  } catch (e) {
    console.error("Failed to parse session:", e);
    return null;
  }
};

export const saveSession = (address: string, session: TradingSession): void => {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    `polymarket_trading_session_${address.toLowerCase()}`,
    JSON.stringify(session)
  );
};

export const clearSession = (address: string): void => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(
    `polymarket_trading_session_${address.toLowerCase()}`
  );
};
