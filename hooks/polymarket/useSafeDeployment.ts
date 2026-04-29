import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/UserContext";
import { usePolymarketWallet } from "@/providers/polymarket";
import { POLYMARKET_BACKEND_URL } from "@/constants/polymarket";
import {
  getDeployTypedData,
  submitDeploySignature,
} from "@/lib/polymarket/backend-session";

export function useSafeDeployment(eoaAddress?: string) {
  const { publicClient, walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();
  const [derivedSafeAddressFromEoa, setDerivedSafeAddressFromEoa] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!eoaAddress) {
      setDerivedSafeAddressFromEoa(undefined);
      return;
    }
    let cancelled = false;
    fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/safe-address?eoa=${encodeURIComponent(eoaAddress)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.safeAddress) {
          setDerivedSafeAddressFromEoa(data.safeAddress);
        }
      })
      .catch((err) => {
        console.error("Error fetching Safe address:", err);
      });
    return () => { cancelled = true; };
  }, [eoaAddress]);

  const isSafeDeployed = useCallback(
    async (safeAddr: string): Promise<boolean> => {
      try {
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

  const deploySafe = useCallback(async (): Promise<string> => {
    if (!eoaAddress || !walletClient) {
      throw new Error("Wallet not connected");
    }
    if (!accessToken) {
      throw new Error("Not authenticated — cannot reach polymarket backend");
    }

    const deployData = await getDeployTypedData(eoaAddress, accessToken);

    const signature = await walletClient.signTypedData({
      account: eoaAddress as `0x${string}`,
      domain: deployData.typedData.domain as Parameters<typeof walletClient.signTypedData>[0]["domain"],
      types: deployData.typedData.types as Parameters<typeof walletClient.signTypedData>[0]["types"],
      primaryType: "CreateProxy",
      message: deployData.typedData.message as Parameters<typeof walletClient.signTypedData>[0]["message"],
    });

    const result = await submitDeploySignature(eoaAddress, signature, accessToken);

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
