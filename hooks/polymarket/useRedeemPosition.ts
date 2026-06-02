import { useState, useCallback } from "react";
import { hexToBytes } from "viem";
import { usePolymarketWallet, useTrading } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import { getRedeemTypedData, submitRedeem } from "@/lib/polymarket/backend-session";

export interface RedeemParams {
  conditionId: string;
  asset?: string;
  outcomeIndex: number;
  negativeRisk?: boolean;
  size?: number;
  safeAddress: string;
  depositWalletAddress?: string;
  walletType?: "safe" | "deposit";
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
        const redeemWalletType = params.walletType ?? walletType;
        const redeemDepositWalletAddress =
          redeemWalletType === "deposit"
            ? (params.depositWalletAddress ?? depositWalletAddress)
            : undefined;
        const redeemBasePayload = {
          safeAddress: params.safeAddress,
          depositWalletAddress: redeemDepositWalletAddress,
          walletType: redeemWalletType,
          eoaAddress,
          conditionId: params.conditionId,
          asset: params.asset,
          negRisk: params.negativeRisk,
          outcomeIndex: params.outcomeIndex,
          size: params.size,
        };

        console.debug("[Polymarket Redeem] typed-data request", redeemBasePayload);

        // Step 1: Get the SafeTx EIP-712 hash from backend
        const typedData = await getRedeemTypedData(
          redeemBasePayload,
          accessToken
        );
        console.debug("[Polymarket Redeem] typed-data response", {
          walletType: redeemWalletType,
          hasTypedData: Boolean(typedData.typedData),
          hasTxHash: Boolean(typedData.txHash),
          txHash: typedData.txHash,
          nonce: typedData.nonce,
          deadline: typedData.deadline,
          calls: typedData.calls?.map((call) => ({
            target: call.target,
            value: call.value,
            dataLength: call.data?.length,
          })),
          to: typedData.to,
          operation: typedData.operation,
          dataLength: typedData.data?.length,
        });

        // Step 2: Sign using the active wallet version's required scheme.
        const signature =
          redeemWalletType === "deposit"
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
        console.debug("[Polymarket Redeem] submit request", {
          ...redeemBasePayload,
          nonce: typedData.nonce,
          deadline: typedData.deadline,
          signaturePreview: `${signature.slice(0, 18)}...${signature.slice(-8)}`,
        });
        const result = await submitRedeem(
          {
            ...redeemBasePayload,
            signature,
            nonce: typedData.nonce,
            deadline: typedData.deadline,
          },
          accessToken
        );
        console.debug("[Polymarket Redeem] submit response", result);

        return result.success;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to redeem position");
        console.debug("[Polymarket Redeem] failed", {
          message: error.message,
          params,
        });
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
