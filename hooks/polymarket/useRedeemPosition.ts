import { useState, useCallback } from "react";
import { hexToBytes } from "viem";
import { usePolymarketWallet, useTrading } from "@/providers/polymarket";
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
  const { walletType, depositWalletAddress } = useTrading();
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
            depositWalletAddress,
            walletType,
            eoaAddress,
            conditionId: params.conditionId,
            negRisk: params.negativeRisk,
            outcomeIndex: params.outcomeIndex,
            size: params.size,
          },
          accessToken
        );

        // Step 2: Sign using the active wallet version's required scheme.
        const signature =
          walletType === "deposit"
            ? await walletClient.signTypedData({
              account: eoaAddress as `0x${string}`,
              domain: typedData.typedData!.domain as Parameters<typeof walletClient.signTypedData>[0]["domain"],
              types: typedData.typedData!.types as Parameters<typeof walletClient.signTypedData>[0]["types"],
              primaryType: typedData.typedData!.primaryType ?? "Batch",
              message: {
                ...typedData.typedData!.message,
                nonce: BigInt(typedData.nonce),
                deadline: BigInt(typedData.deadline!),
                calls: typedData.calls!.map((call) => ({
                  ...call,
                  value: BigInt(call.value),
                })),
              } as Parameters<typeof walletClient.signTypedData>[0]["message"],
            })
            : await walletClient.signMessage({
              account: eoaAddress as `0x${string}`,
              message: {
                raw: hexToBytes(typedData.txHash as `0x${string}`),
              },
            });

        // Step 3: Submit
        const result = await submitRedeem(
          {
            safeAddress: params.safeAddress,
            depositWalletAddress,
            walletType,
            eoaAddress,
            conditionId: params.conditionId,
            negRisk: params.negativeRisk,
            outcomeIndex: params.outcomeIndex,
            size: params.size,
            signature,
            nonce: typedData.nonce,
            deadline: typedData.deadline,
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
    [eoaAddress, walletClient, accessToken, walletType, depositWalletAddress]
  );

  return { isRedeeming, error, redeemPosition };
}
