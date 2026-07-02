import { useState, useCallback } from "react";
import { encodeFunctionData, erc20Abi, hexToBytes } from "viem";
import { polygon } from "viem/chains";
import { usePrivy, useSignTypedData } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { usePolymarketWallet, useTrading } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import {
  getDepositWalletWrapTypedData,
  getRedeemTypedData,
  relayWrapExecTransaction,
  submitDepositWalletWrap,
  submitRedeem,
} from "@/lib/polymarket/backend-session";
import {
  COLLATERAL_ONRAMP_ADDRESS,
  LEGACY_USDC_E_ADDRESS,
  USDC_E_DECIMALS,
} from "@/constants/polymarket";

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

type PolymarketWalletType = "safe" | "deposit";

type NormalizeLegacyUsdcParams = {
  safeAddress?: string;
  depositWalletAddress?: string;
  walletType?: PolymarketWalletType;
  destinationAddress?: string;
  amount: number;
  silentOnly?: boolean;
};

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

const WRAP_ABI = [
  {
    name: "wrap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_asset", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const SAFE_NONCE_ABI = [
  {
    name: "nonce",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const GNOSIS_SAFE_EXEC_ABI = [
  {
    name: "execTransaction",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;

const SAFE_TX_TYPES = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

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

  const { eoaAddress, walletClient, publicClient } = usePolymarketWallet();
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
      types: Record<string, readonly unknown[]>;
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

  const executeLegacySafeTx = useCallback(
    async ({
      safeAddress,
      to,
      data,
      nonce,
      silentOnly,
    }: {
      safeAddress: string;
      to: `0x${string}`;
      data: `0x${string}`;
      nonce: bigint;
      silentOnly: boolean;
    }) => {
      if (!accessToken) {
        throw new Error("Not authenticated.");
      }

      const signature = await signRedeemTypedData({
        domain: {
          chainId: polygon.id,
          verifyingContract: safeAddress,
        },
        types: SAFE_TX_TYPES,
        primaryType: "SafeTx",
        message: {
          to,
          value: BigInt(0),
          data,
          operation: 0,
          safeTxGas: BigInt(0),
          baseGas: BigInt(0),
          gasPrice: BigInt(0),
          gasToken: ZERO_ADDRESS,
          refundReceiver: ZERO_ADDRESS,
          nonce,
        },
        silentOnly,
      });

      const execCalldata = encodeFunctionData({
        abi: GNOSIS_SAFE_EXEC_ABI,
        functionName: "execTransaction",
        args: [
          to,
          BigInt(0),
          data,
          0,
          BigInt(0),
          BigInt(0),
          BigInt(0),
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          signature as `0x${string}`,
        ],
      });

      const { txHash } = await relayWrapExecTransaction(
        safeAddress,
        execCalldata,
        accessToken
      );

      return txHash;
    },
    [accessToken, signRedeemTypedData]
  );

  const normalizeLegacyUsdcFromSafe = useCallback(
    async ({
      sourceSafeAddress,
      destinationAddress,
      amount,
      silentOnly,
    }: {
      sourceSafeAddress: string;
      destinationAddress: string;
      amount: number;
      silentOnly: boolean;
    }) => {
      if (!publicClient) {
        throw new Error("Polygon client not ready.");
      }

      const amountInUnits = BigInt(
        Math.floor(amount * 10 ** USDC_E_DECIMALS)
      );
      if (amountInUnits <= BigInt(0)) {
        throw new Error("Conversion amount must be positive.");
      }

      const nonce = (await publicClient.readContract({
        address: sourceSafeAddress as `0x${string}`,
        abi: SAFE_NONCE_ABI,
        functionName: "nonce",
      })) as bigint;

      const approveCalldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [COLLATERAL_ONRAMP_ADDRESS, amountInUnits],
      });
      const approveTxHash = await executeLegacySafeTx({
        safeAddress: sourceSafeAddress,
        to: LEGACY_USDC_E_ADDRESS,
        data: approveCalldata,
        nonce,
        silentOnly,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });

      const nextNonce = (await publicClient.readContract({
        address: sourceSafeAddress as `0x${string}`,
        abi: SAFE_NONCE_ABI,
        functionName: "nonce",
      })) as bigint;

      const wrapCalldata = encodeFunctionData({
        abi: WRAP_ABI,
        functionName: "wrap",
        args: [
          LEGACY_USDC_E_ADDRESS,
          destinationAddress as `0x${string}`,
          amountInUnits,
        ],
      });
      const wrapTxHash = await executeLegacySafeTx({
        safeAddress: sourceSafeAddress,
        to: COLLATERAL_ONRAMP_ADDRESS,
        data: wrapCalldata,
        nonce: nextNonce,
        silentOnly,
      });
      await publicClient.waitForTransactionReceipt({ hash: wrapTxHash });

      return { success: true, txHash: wrapTxHash };
    },
    [executeLegacySafeTx, publicClient]
  );

  const normalizeLegacyUsdcBalance = useCallback(
    async ({
      safeAddress: sourceSafeAddress,
      depositWalletAddress: sourceDepositWalletAddress,
      walletType: requestedWalletType,
      destinationAddress,
      amount,
      silentOnly = false,
    }: NormalizeLegacyUsdcParams) => {
      if (!eoaAddress || !walletClient || !accessToken) {
        throw new Error("Wallet not connected or not authenticated");
      }

      const wrapAmount = Number(amount);
      if (!Number.isFinite(wrapAmount) || wrapAmount <= 0) {
        throw new Error("Conversion amount must be positive.");
      }

      setIsNormalizingCollateral(true);
      try {
        const normalizationWalletType: PolymarketWalletType =
          requestedWalletType ?? (sourceDepositWalletAddress ? "deposit" : "safe");

        if (normalizationWalletType === "safe") {
          if (!sourceSafeAddress) {
            throw new Error("Safe wallet address is required for conversion.");
          }
          return await normalizeLegacyUsdcFromSafe({
            sourceSafeAddress,
            destinationAddress: destinationAddress ?? sourceSafeAddress,
            amount: wrapAmount,
            silentOnly,
          });
        }

        if (!sourceDepositWalletAddress) {
          throw new Error("Deposit wallet address is required for conversion.");
        }

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
      normalizeLegacyUsdcFromSafe,
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
          wrapAmount > 0
        ) {
          try {
            await normalizeLegacyUsdcBalance({
              safeAddress: params.safeAddress,
              depositWalletAddress: redeemDepositWalletAddress,
              walletType: redeemWalletType,
              destinationAddress:
                redeemWalletType === "deposit"
                  ? redeemDepositWalletAddress
                  : params.safeAddress,
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
