import { useState, useCallback } from "react";
import { hexToBytes } from "viem";
import { usePrivy, useSignTypedData } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { usePolymarketWallet, useTrading } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import {
  getDepositWalletWrapTypedData,
  getRedeemTypedData,
  submitDepositWalletWrap,
  submitRedeem,
} from "@/lib/polymarket/backend-session";

export interface RedeemParams {
  conditionId: string;
  asset?: string;
  outcomeIndex: number;
  negativeRisk?: boolean;
  size?: number;
  safeAddress: string;
  depositWalletAddress?: string;
  walletType?: "safe" | "deposit";
  silentOnly?: boolean;
}

export interface RedeemResult {
  success: boolean;
  txId?: string;
  collateralToken?: string;
  shouldWrapCollateral?: boolean;
  redeemedAmount?: number;
  normalizedCollateral?: boolean;
  normalizationError?: string;
}

type DelegatedSignerConfig = {
  signerId: string;
  policyIds: string[];
};

type FeedClaimUser = {
  _id?: string;
  primaryMicrosite?: string;
};

const swopApiBase = () => (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const delegatedSignerId =
  process.env.NEXT_PUBLIC_PRIVY_DELEGATED_SIGNER_ID ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_WALLET_ID;
const delegatedPolicyIds = (
  process.env.NEXT_PUBLIC_PRIVY_DELEGATED_POLICY_IDS ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_POLICY_IDS ||
  ""
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

function serializeForJson(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        serializeForJson(nested),
      ])
    );
  }
  return value;
}

async function markPredictionFeedRedeemed({
  accessToken,
  params,
  result,
  user,
}: {
  accessToken: string | null | undefined;
  params: RedeemParams;
  result: { txId?: string; redeemedAmount?: number };
  user: FeedClaimUser | null | undefined;
}) {
  const apiBase = swopApiBase();
  if (!apiBase || !accessToken || !user?._id) return;

  const response = await fetch(`${apiBase}/api/v2/feed/prediction/redeem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId: user._id,
      smartsiteId: user.primaryMicrosite,
      conditionId: params.conditionId,
      marketId: params.conditionId,
      asset: params.asset,
      outcomeIndex: params.outcomeIndex,
      redeemedAmount: result.redeemedAmount ?? params.size,
      txId: result.txId,
      claimedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || body?.error || "Failed to mark prediction feed claimed"
    );
  }
}

export function useRedeemPosition() {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isNormalizingCollateral, setIsNormalizingCollateral] =
    useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [delegatedSignerConfig, setDelegatedSignerConfig] =
    useState<DelegatedSignerConfig | null>(null);

  const { eoaAddress, walletClient } = usePolymarketWallet();
  const { walletType, depositWalletAddress } = useTrading();
  const { accessToken, user } = useUser();
  const { user: privyUser } = usePrivy();
  const { signTypedData: signTypedDataWithPrivy } = useSignTypedData();
  const queryClient = useQueryClient();

  const isEmbeddedPrivyWallet = useCallback(
    (address: string) => {
      const target = address.toLowerCase();
      return (privyUser?.linkedAccounts || []).some((account: any) => {
        if (account?.type !== "wallet") return false;
        if (account?.address?.toLowerCase() !== target) return false;
        return (
          account.walletClientType === "privy" ||
          account.wallet_client_type === "privy" ||
          account.connectorType === "embedded" ||
          account.connector_type === "embedded"
        );
      });
    },
    [privyUser]
  );

  const getDelegatedSignerConfig = useCallback(async () => {
    if (delegatedSignerId) {
      return {
        signerId: delegatedSignerId,
        policyIds: delegatedPolicyIds,
      };
    }

    if (delegatedSignerConfig) return delegatedSignerConfig;
    if (!accessToken || !swopApiBase()) return null;

    const response = await fetch(
      `${swopApiBase()}/api/v5/wallet/privy/delegated-signer-config`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    const data = body?.data || body;
    if (!data?.configured || !data?.signerId) return null;

    const config = {
      signerId: String(data.signerId),
      policyIds: Array.isArray(data.policyIds)
        ? data.policyIds.map((id: unknown) => String(id)).filter(Boolean)
        : [],
    };
    setDelegatedSignerConfig(config);
    return config;
  }, [accessToken, delegatedSignerConfig]);

  const ensureDelegatedSigner = useCallback(
    async () => {
      const config = await getDelegatedSignerConfig();
      return Boolean(config?.signerId);
    },
    [getDelegatedSignerConfig]
  );

  const signWithDelegatedPrivy = useCallback(
    async (
      path: "sign-typed-data" | "sign-message",
      body: Record<string, unknown>
    ) => {
      if (!eoaAddress || !accessToken || !swopApiBase()) {
        throw new Error("Silent redeem signing is not configured.");
      }

      const delegatedSignerReady = await ensureDelegatedSigner();
      if (!delegatedSignerReady) {
        throw new Error("Silent redeem signing is not ready for this wallet.");
      }

      const response = await fetch(
        `${swopApiBase()}/api/v5/wallet/privy/ethereum/${path}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            address: eoaAddress,
            ...body,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.signature) {
        throw new Error(
          data.message ||
            data.error ||
            "Silent redeem signing failed. Please refresh and try again."
        );
      }

      return data.signature as `0x${string}`;
    },
    [accessToken, eoaAddress, ensureDelegatedSigner]
  );

  const signTypedDataWithoutPopup = useCallback(
    async (typedData: Record<string, unknown>) => {
      let delegatedError: unknown;

      try {
        return await signWithDelegatedPrivy("sign-typed-data", {
          typedData,
        });
      } catch (error) {
        delegatedError = error;
      }

      if (!eoaAddress || !isEmbeddedPrivyWallet(eoaAddress)) {
        throw delegatedError instanceof Error
          ? delegatedError
          : new Error("Silent redeem signing is not ready for this wallet.");
      }

      const { signature } = await signTypedDataWithPrivy(typedData as any, {
        address: eoaAddress,
        uiOptions: { showWalletUIs: false },
      });

      return signature as `0x${string}`;
    },
    [
      eoaAddress,
      isEmbeddedPrivyWallet,
      signTypedDataWithPrivy,
      signWithDelegatedPrivy,
    ]
  );

  const signSafeTxHash = useCallback(
    async (txHash: string, silentOnly = false) => {
      if (!eoaAddress || !walletClient) {
        throw new Error("Wallet not connected.");
      }

      if (isEmbeddedPrivyWallet(eoaAddress)) {
        try {
          return await signWithDelegatedPrivy("sign-message", {
            message: txHash,
          });
        } catch (delegatedError) {
          if (silentOnly) {
            throw delegatedError instanceof Error
              ? delegatedError
              : new Error("Silent redeem signing is not ready for this wallet.");
          }
          console.warn(
            "Silent delegated redeem signing unavailable; falling back to wallet signing:",
            delegatedError
          );
        }
      }

      if (silentOnly) {
        throw new Error("Silent redeem signing is not ready for this wallet.");
      }

      return walletClient.signMessage({
        account: eoaAddress as `0x${string}`,
        message: {
          raw: hexToBytes(txHash as `0x${string}`),
        },
      });
    },
    [
      eoaAddress,
      isEmbeddedPrivyWallet,
      signWithDelegatedPrivy,
      walletClient,
    ]
  );

  const signRedeemTypedData = useCallback(
    async ({
      domain,
      types,
      primaryType,
      message,
      silentOnly = false,
    }: {
      domain: Record<string, unknown>;
      types: Record<string, unknown[]>;
      primaryType: string;
      message: Record<string, unknown>;
      silentOnly?: boolean;
    }) => {
      if (!eoaAddress || !walletClient) {
        throw new Error("Wallet not connected.");
      }

      if (isEmbeddedPrivyWallet(eoaAddress)) {
        try {
          return await signTypedDataWithoutPopup({
            domain,
            types,
            primaryType,
            message: serializeForJson(message),
          });
        } catch (silentError) {
          if (silentOnly) {
            throw silentError instanceof Error
              ? silentError
              : new Error("Silent redeem signing is not ready for this wallet.");
          }
          console.warn(
            "Silent delegated redeem typed-data signing unavailable; falling back to wallet signing:",
            silentError
          );
        }
      }

      if (silentOnly) {
        throw new Error("Silent redeem signing is not ready for this wallet.");
      }

      return walletClient.signTypedData({
        account: eoaAddress as `0x${string}`,
        domain: domain as Parameters<typeof walletClient.signTypedData>[0]["domain"],
        types: types as Parameters<typeof walletClient.signTypedData>[0]["types"],
        primaryType,
        message: message as Parameters<typeof walletClient.signTypedData>[0]["message"],
      });
    },
    [
      eoaAddress,
      isEmbeddedPrivyWallet,
      signTypedDataWithoutPopup,
      walletClient,
    ]
  );

  const normalizeLegacyUsdcBalance = useCallback(
    async ({
      depositWalletAddress: sourceDepositWalletAddress,
      destinationAddress,
      amount,
      silentOnly = false,
    }: {
      depositWalletAddress: string;
      destinationAddress?: string;
      amount: number;
      silentOnly?: boolean;
    }) => {
      if (!eoaAddress || !walletClient || !accessToken) {
        throw new Error("Wallet not connected or not authenticated");
      }

      const wrapAmount = Number(amount);
      if (!Number.isFinite(wrapAmount) || wrapAmount <= 0) {
        throw new Error("Conversion amount must be positive.");
      }

      setIsNormalizingCollateral(true);
      try {
        const wrapData = await getDepositWalletWrapTypedData(
          {
            depositWalletAddress: sourceDepositWalletAddress,
            eoaAddress,
            destinationAddress:
              destinationAddress ?? sourceDepositWalletAddress,
            amount: wrapAmount,
          },
          accessToken
        );

        const wrapTypedDataMessage = {
          ...wrapData.typedData.message,
          nonce: BigInt(wrapData.nonce),
          deadline: BigInt(wrapData.deadline),
          calls: wrapData.calls.map((call) => ({
            ...call,
            value: BigInt(call.value),
          })),
        };

        const wrapSignature = await signRedeemTypedData({
          domain: wrapData.typedData.domain,
          types: wrapData.typedData.types,
          primaryType: wrapData.typedData.primaryType ?? "Batch",
          message: wrapTypedDataMessage,
          silentOnly,
        });

        const result = await submitDepositWalletWrap(
          {
            depositWalletAddress: sourceDepositWalletAddress,
            eoaAddress,
            destinationAddress:
              destinationAddress ?? sourceDepositWalletAddress,
            amount: wrapAmount,
            signature: wrapSignature,
            nonce: wrapData.nonce,
            deadline: wrapData.deadline,
          },
          accessToken
        );

        queryClient.invalidateQueries({ queryKey: ["pusdBalance"] });
        queryClient.invalidateQueries({ queryKey: ["legacyUsdcBalance"] });

        return result;
      } finally {
        setIsNormalizingCollateral(false);
      }
    },
    [
      accessToken,
      eoaAddress,
      queryClient,
      signRedeemTypedData,
      walletClient,
    ]
  );

  const redeemPosition = useCallback(
    async (
      params: RedeemParams,
    ): Promise<RedeemResult> => {
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
        let signature: `0x${string}`;
        if (redeemWalletType === "deposit") {
          if (!typedData.typedData || !typedData.deadline || !typedData.calls) {
            throw new Error("Redeem signing data is incomplete.");
          }

          const depositTypedDataMessage = {
            ...typedData.typedData.message,
            nonce: BigInt(typedData.nonce),
            deadline: BigInt(typedData.deadline),
            calls: typedData.calls.map((call) => ({
              ...call,
              value: BigInt(call.value),
            })),
          };

          signature = await signRedeemTypedData({
            domain: typedData.typedData.domain,
            types: typedData.typedData.types,
            primaryType: typedData.typedData.primaryType ?? "Batch",
            message: depositTypedDataMessage,
            silentOnly: params.silentOnly,
          });
        } else {
          if (!typedData.txHash) {
            throw new Error("Redeem signing hash is missing.");
          }

          signature = await signSafeTxHash(
            typedData.txHash,
            params.silentOnly,
          );
        }

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

        try {
          await markPredictionFeedRedeemed({
            accessToken,
            params,
            result,
            user,
          });
        } catch (feedError) {
          console.warn("[Polymarket Redeem] feed claim stamp failed", {
            message:
              feedError instanceof Error
                ? feedError.message
                : "Could not mark prediction feed claimed.",
            conditionId: params.conditionId,
            asset: params.asset,
            txId: result.txId,
          });
        }

        let normalizedCollateral = false;
        let normalizationError: string | undefined;
        const wrapAmount = Number(
          result.redeemedAmount ?? params.size ?? 0
        );
        if (
          result.shouldWrapCollateral &&
          redeemWalletType === "deposit" &&
          redeemDepositWalletAddress &&
          wrapAmount > 0
        ) {
          try {
            await normalizeLegacyUsdcBalance({
              depositWalletAddress: redeemDepositWalletAddress,
              destinationAddress: redeemDepositWalletAddress,
              amount: wrapAmount,
              silentOnly: params.silentOnly,
            });
            normalizedCollateral = true;
          } catch (wrapError) {
            normalizationError =
              wrapError instanceof Error
                ? wrapError.message
                : "Failed to convert redeemed USDC.e to pUSD.";
            console.warn("[Polymarket Redeem] collateral normalization failed", {
              message: normalizationError,
              redeemWalletType,
              redeemDepositWalletAddress,
              wrapAmount,
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ["pusdBalance"] });
        queryClient.invalidateQueries({ queryKey: ["legacyUsdcBalance"] });

        return {
          success: result.success,
          txId: result.txId,
          collateralToken: result.collateralToken,
          shouldWrapCollateral: result.shouldWrapCollateral,
          redeemedAmount: result.redeemedAmount,
          normalizedCollateral,
          normalizationError,
        };
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
    [
      eoaAddress,
      walletClient,
      accessToken,
      walletType,
      depositWalletAddress,
      user,
      queryClient,
      signSafeTxHash,
      signRedeemTypedData,
      normalizeLegacyUsdcBalance,
    ]
  );

  return {
    isRedeeming,
    isNormalizingCollateral,
    canRedeem: Boolean(eoaAddress && walletClient && accessToken),
    canSilentlyNormalizeCollateral: eoaAddress
      ? isEmbeddedPrivyWallet(eoaAddress)
      : false,
    normalizeLegacyUsdcBalance,
    error,
    redeemPosition,
  };
}
