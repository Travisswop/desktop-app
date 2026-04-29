import { useState, useCallback } from "react";
import { hexToBytes } from "viem";
import { usePolymarketWallet } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import { getRedeemTypedData, submitRedeem } from "@/lib/polymarket/backend-session";

export interface RedeemParams {
  conditionId: string;
  outcomeIndex: number;
  negativeRisk?: boolean;
  size?: number;
  safeAddress: string;
}

export function useRedeemPosition() {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { eoaAddress, walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();

  const redeemPosition = useCallback(
    async (params: RedeemParams): Promise<boolean> => {
      if (!eoaAddress || !walletClient || !accessToken) {
        throw new Error("Wallet not connected or not authenticated");
      }

      setIsRedeeming(true);
      setError(null);

      try {
        // Step 1: Get the SafeTx EIP-712 hash from backend
        const typedData = await getRedeemTypedData(
          {
            safeAddress: params.safeAddress,
            eoaAddress,
            conditionId: params.conditionId,
            negRisk: params.negativeRisk,
            outcomeIndex: params.outcomeIndex,
            size: params.size,
          },
          accessToken
        );

        // Step 2: Sign the hash
        const txHashBytes = hexToBytes(typedData.txHash as `0x${string}`);
        const signature = await walletClient.signMessage({
          account: eoaAddress as `0x${string}`,
          message: { raw: txHashBytes },
        });

        // Step 3: Submit
        const result = await submitRedeem(
          {
            safeAddress: params.safeAddress,
            eoaAddress,
            conditionId: params.conditionId,
            negRisk: params.negativeRisk,
            outcomeIndex: params.outcomeIndex,
            size: params.size,
            signature,
            nonce: typedData.nonce,
          },
          accessToken
        );

        return result.success;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to redeem position");
        setError(error);
        throw error;
      } finally {
        setIsRedeeming(false);
      }
    },
    [eoaAddress, walletClient, accessToken]
  );

  return { isRedeeming, error, redeemPosition };
}
