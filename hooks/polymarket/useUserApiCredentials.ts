import { useCallback } from "react";
import { useUser } from "@/lib/UserContext";
import { usePolymarketWallet } from "@/providers/polymarket";
import {
  fetchCachedCredentials,
  getCredentialTypedData,
  deriveAndCacheCredentials,
} from "@/lib/polymarket/backend-session";

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

/**
 * Provides createOrDeriveUserApiCredentials — the single entry-point for
 * obtaining Polymarket L2 API credentials.
 *
 * Flow on every call:
 *   1. Check the polymarket-backend's server-side credential cache.
 *      → Zero signing prompts on all subsequent logins (new browser, incognito, etc.)
 *   2. Cache miss: fetch the ClobAuth EIP-712 typed data from the backend,
 *      sign it with the connected Privy wallet (one prompt, first time only),
 *      then POST the signature to the backend which derives and caches the creds.
 *
 * Why server-side cache?
 *   Previously credentials were stored only in localStorage, so clearing
 *   browser data triggered a re-signing prompt on every login. Server-side
 *   caching means the prompt fires at most once per EOA per server restart.
 *
 * ⚠️  The ClobAuth EIP-712 signature CANNOT be produced server-side — Polymarket's
 *     CLOB API verifies it against the user's EOA address. When the cache is
 *     empty (first use or after a server restart), a single signing prompt is
 *     unavoidable and is a Polymarket protocol requirement.
 */
export function useUserApiCredentials() {
  const { eoaAddress, walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();

  const createOrDeriveUserApiCredentials =
    useCallback(async (): Promise<UserApiCredentials> => {
      if (!eoaAddress || !walletClient) {
        throw new Error("Wallet not connected");
      }

      if (!accessToken) {
        throw new Error("Not authenticated — cannot reach polymarket backend");
      }

      // ── Step 1: Check the server-side cache (no signing required) ──────────
      const cached = await fetchCachedCredentials(eoaAddress, accessToken);
      if (cached) {
        console.log("[Polymarket] Restored API credentials from server cache");
        return cached;
      }

      // ── Step 2: Cache miss — get typed data and prompt user to sign once ───
      console.log(
        "[Polymarket] No cached credentials — requesting signature for credential derivation"
      );

      const { typedData, timestamp, nonce } = await getCredentialTypedData(
        eoaAddress,
        accessToken
      );

      // Sign the ClobAuth EIP-712 message with the connected Privy wallet.
      // This is the ONLY signing prompt in the credential flow. Polymarket's
      // CLOB API requires a signature from the user's EOA to derive credentials;
      // this cannot be performed server-side.
      const signature = await walletClient.signTypedData({
        account: eoaAddress,
        domain: typedData.domain as Parameters<
          typeof walletClient.signTypedData
        >[0]["domain"],
        types: typedData.types as Parameters<
          typeof walletClient.signTypedData
        >[0]["types"],
        primaryType: "ClobAuth",
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
        accessToken
      );

      console.log(
        "[Polymarket] API credentials derived and cached on server — future logins will skip signing"
      );

      return creds;
    }, [eoaAddress, walletClient, accessToken]);

  return { createOrDeriveUserApiCredentials };
}
