import { useCallback } from "react";
import { useUser } from "@/lib/UserContext";
import { usePolymarketWallet } from "@/providers/polymarket";
import {
  fetchCachedCredentials,
  getCredentialTypedData,
  deriveAndCacheCredentials,
  type ClobCredentialWalletType,
} from "@/lib/polymarket/backend-session";

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface CreateOrDeriveOptions {
  /**
   * Which kind of wallet should own the resulting API key on CLOB's side.
   *
   *   - 'safe' (default) / 'eoa' -> bound to the EOA via raw ECDSA signature
   *   - 'deposit'                -> also bound to the EOA; deposit-wallet
   *                                routing is applied when placing orders.
   */
  walletType?: ClobCredentialWalletType;
  /** Required when walletType === 'deposit'. */
  depositWalletAddress?: string;
}

/**
 * Provides createOrDeriveUserApiCredentials — the single entry-point for
 * obtaining Polymarket L2 API credentials.
 *
 * Flow on every call:
 *   1. Check the polymarket-backend's server-side credential cache for the
 *      (walletType, address) pair. → Zero signing prompts on subsequent
 *      logins on a new browser, incognito, etc.
 *   2. Cache miss: fetch the ClobAuth EIP-712 typed data from the backend,
 *      sign it with the connected Privy wallet (one prompt, first time only),
 *      then POST the signature to the backend which derives and caches the
 *      credentials.
 *
 * The ClobAuth signature cannot be produced server-side. The connected EOA
 * signs the ClobAuth payload.
 */
export function useUserApiCredentials() {
  const { eoaAddress, walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();

  const createOrDeriveUserApiCredentials = useCallback(
    async (
      credentialAddressOrOpts?: string | CreateOrDeriveOptions,
      legacyOpts?: CreateOrDeriveOptions
    ): Promise<UserApiCredentials> => {
      if (!eoaAddress || !walletClient) {
        throw new Error("Wallet not connected");
      }

      if (!accessToken) {
        throw new Error("Not authenticated — cannot reach polymarket backend");
      }

      // Support both old (string) and new (options) signatures.
      const opts: CreateOrDeriveOptions =
        typeof credentialAddressOrOpts === "string"
          ? { ...(legacyOpts ?? {}) }
          : { ...(credentialAddressOrOpts ?? {}) };

      const walletType: ClobCredentialWalletType = opts.walletType ?? "safe";
      const depositWalletAddress = opts.depositWalletAddress;

      if (walletType === "deposit" && !depositWalletAddress) {
        throw new Error(
          "depositWalletAddress is required when requesting credentials for a deposit-wallet flow"
        );
      }

      const flowOpts =
        walletType === "deposit"
          ? { walletType, depositWalletAddress }
          : { walletType };

      const cacheLabelAddress = eoaAddress;

      // ── Step 1: Check the server-side cache (no signing required) ──────────
      const cached = await fetchCachedCredentials(
        eoaAddress,
        accessToken,
        flowOpts
      );
      if (cached) {
        console.log("[Polymarket] Restored API credentials from server cache", {
          walletType,
          cacheLabelAddress,
        });
        return cached;
      }

      // ── Step 2: Cache miss — fetch typed data and sign with the EOA ────────
      console.log(
        "[Polymarket] No cached credentials — requesting signature for credential derivation",
        { walletType, depositWalletAddress }
      );

      const { typedData, timestamp, nonce } = await getCredentialTypedData(
        eoaAddress,
        accessToken,
        flowOpts
      );

      // The EOA signs raw ClobAuth for credential derivation.
      const primaryType =
        (typedData as { primaryType?: string }).primaryType ?? "ClobAuth";

      const signature = await walletClient.signTypedData({
        account: eoaAddress,
        domain: typedData.domain as Parameters<
          typeof walletClient.signTypedData
        >[0]["domain"],
        types: typedData.types as Parameters<
          typeof walletClient.signTypedData
        >[0]["types"],
        primaryType,
        message: typedData.message as Parameters<
          typeof walletClient.signTypedData
        >[0]["message"],
      });

      // ── Step 3: Derive credentials via backend — result is cached server-side
      const creds = await deriveAndCacheCredentials(
        eoaAddress,
        signature,
        timestamp,
        nonce,
        accessToken,
        flowOpts
      );

      console.log(
        "[Polymarket] API credentials derived and cached on server — future logins will skip signing",
        { walletType, cacheLabelAddress }
      );

      return creds;
    },
    [eoaAddress, walletClient, accessToken]
  );

  return { createOrDeriveUserApiCredentials };
}
