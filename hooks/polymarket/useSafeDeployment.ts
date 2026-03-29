import { useCallback, useMemo } from "react";
import { useUser } from "@/lib/UserContext";
import { usePolymarketWallet } from "@/providers/polymarket";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { POLYGON_CHAIN_ID } from "@/constants/polymarket";
import {
  getDeployTypedData,
  submitDeploySignature,
} from "@/lib/polymarket/backend-session";

/**
 * Manages Safe wallet deployment for Polymarket trading.
 *
 * Replaces the previous relayClient.deploy() SDK pattern with an explicit
 * two-step flow routed through the polymarket-backend:
 *   1. GET /session/deploy-typed-data  — backend returns the EIP-712 payload
 *   2. Wallet signs the CreateProxy typed data (one prompt, first time only)
 *   3. POST /session/deploy-safe       — backend submits to Polymarket relayer
 *
 * The backend checks on-chain state before returning typed data, so if the
 * Safe is already deployed the request short-circuits with no signing prompt.
 *
 * ⚠️  PROTOCOL REQUIREMENT — The CreateProxy EIP-712 signature MUST come from
 *     the Safe owner's EOA.  Polymarket's relayer verifies this on-chain.
 *     This signing step cannot be moved server-side and is a first-time-only
 *     operation (once deployed, the Safe persists forever on Polygon).
 */
export function useSafeDeployment(eoaAddress?: string) {
  const { publicClient, walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();

  // Deterministic Safe address derived from EOA — pure computation, no signing
  const derivedSafeAddressFromEoa = useMemo(() => {
    if (!eoaAddress || !POLYGON_CHAIN_ID) return undefined;

    try {
      const config = getContractConfig(POLYGON_CHAIN_ID);
      return deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);
    } catch (err) {
      console.error("Error deriving Safe address:", err);
      return undefined;
    }
  }, [eoaAddress]);

  /**
   * Checks whether the Safe is deployed by querying the polymarket-backend
   * (which falls back to RPC if the relayer check fails).
   */
  const isSafeDeployed = useCallback(
    async (safeAddr: string): Promise<boolean> => {
      try {
        // Try RPC via public client (no auth required)
        const code = await publicClient?.getCode({
          address: safeAddr as `0x${string}`,
        });
        return !!code && code !== "0x";
      } catch (err) {
        console.warn("RPC code-check failed for Safe:", err);
        return false;
      }
    },
    [publicClient]
  );

  /**
   * Deploys the Safe via the polymarket-backend two-step flow.
   * Returns early without signing if the Safe is already deployed.
   *
   * ⚠️  One signing prompt on first call — see module docstring.
   */
  const deploySafe = useCallback(async (): Promise<string> => {
    if (!eoaAddress || !walletClient) {
      throw new Error("Wallet not connected");
    }

    if (!accessToken) {
      throw new Error("Not authenticated — cannot reach polymarket backend");
    }

    // Get typed data from backend (backend checks deployed status first)
    const deployData = await getDeployTypedData(eoaAddress, accessToken);

    // Sign the CreateProxy EIP-712 message.
    // ⚠️  CLIENT-SIDE SIGNING REQUIRED — Polymarket's relayer verifies this
    // signature against the Safe owner's EOA (eoaAddress). Cannot be server-side.
    const signature = await walletClient.signTypedData({
      account: eoaAddress as `0x${string}`,
      domain: deployData.typedData.domain as Parameters<
        typeof walletClient.signTypedData
      >[0]["domain"],
      types: deployData.typedData.types as Parameters<
        typeof walletClient.signTypedData
      >[0]["types"],
      primaryType: "CreateProxy",
      message: deployData.typedData.message as Parameters<
        typeof walletClient.signTypedData
      >[0]["message"],
    });

    const result = await submitDeploySignature(
      eoaAddress,
      signature,
      accessToken
    );

    if (!result.deployed) {
      throw new Error("Safe deployment failed");
    }

    return result.safeAddress;
  }, [eoaAddress, walletClient, accessToken]);

  return {
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe,
  };
}
