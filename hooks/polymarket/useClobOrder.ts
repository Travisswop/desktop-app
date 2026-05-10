import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrivy, useSigners } from '@privy-io/react-auth';
import { useTrading } from '@/providers/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';

const CLOB_ERROR_MESSAGES: Record<string, string> = {
  INVALID_ORDER_MIN_TICK_SIZE: "Price doesn't match this market's tick size. Adjust your price and try again.",
  INVALID_ORDER_MIN_SIZE: "Order size is below the minimum allowed for this market.",
  INVALID_ORDER_DUPLICATED: "An identical order is already open.",
  INVALID_ORDER_NOT_ENOUGH_BALANCE: "Insufficient USDC balance or allowance.",
  INVALID_ORDER_EXPIRATION: "Order expiration is in the past.",
  INVALID_ORDER_ERROR: "Server error while submitting order. Please try again.",
  INVALID_POST_ONLY_ORDER_TYPE: "Post-only orders cannot be market orders (FOK/FAK).",
  INVALID_POST_ONLY_ORDER: "Post-only order would cross the spread and was rejected.",
  EXECUTION_ERROR: "Trade execution failed. Please try again.",
  ORDER_DELAYED: "Order placement delayed due to market conditions.",
  DELAYING_ORDER_ERROR: "Server error while delaying order. Please try again.",
  FOK_ORDER_NOT_FILLED_ERROR: "Market order could not be fully filled. Try increasing your slippage tolerance.",
  MARKET_NOT_READY: "This market is not yet accepting orders.",
};

function extractClobError(err: unknown): Error {
  if (err instanceof Error) {
    const msg = err.message;
    for (const [code, human] of Object.entries(CLOB_ERROR_MESSAGES)) {
      if (msg.includes(code)) return new Error(human);
    }
    return err;
  }
  return new Error('Failed to submit order');
}

export type OrderParams = {
  tokenId: string;
  conditionId?: string;
  size: number;
  price?: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
  isMarketOrder?: boolean;
  fillType?: 'FOK' | 'FAK';
  expiration?: number;
};

const backendBase = () => `${POLYMARKET_BACKEND_URL}/api/prediction-markets`;
const swopApiBase = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const delegatedSignerId = process.env.NEXT_PUBLIC_PRIVY_DELEGATED_SIGNER_ID;
const delegatedPolicyIds = (process.env.NEXT_PUBLIC_PRIVY_DELEGATED_POLICY_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const DEBUG_ORDER_SIGNING = true;

function logOrderDebug(label: string, data: Record<string, any>) {
  if (!DEBUG_ORDER_SIGNING) return;
  console.info(`[Polymarket order] ${label}`, data);
}

function logOrderError(label: string, data: Record<string, any>) {
  console.error(`[Polymarket order] ${label}`, data);
}

function summarizeTypedData(typedData: any) {
  const domain = typedData?.domain ?? {};
  const types = typedData?.types ?? {};
  const primaryType = typedData?.primaryType ?? 'Order';
  const message = typedData?.message ?? {};
  const primaryFields = types?.[primaryType] ?? [];

  return {
    primaryType,
    domainKeys: Object.keys(domain),
    domain,
    typeKeys: Object.keys(types),
    primaryFields,
    messageKeys: Object.keys(message),
    message,
  };
}

function collectUndefinedPaths(value: any, path: string, out: string[] = []) {
  if (isMissingTypedValue(value)) {
    out.push(path);
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUndefinedPaths(item, `${path}[${index}]`, out),
    );
    return out;
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, nestedValue] of Object.entries(value)) {
      collectUndefinedPaths(nestedValue, `${path}.${key}`, out);
    }
  }

  return out;
}

function collectSchemaMissingPaths(
  types: Record<string, Array<{ name: string; type: string }>>,
  type: string,
  value: any,
  path: string,
  out: string[] = [],
) {
  const baseType = baseTypedDataType(type);
  const fields = types[baseType];

  if (!fields) {
    if (isMissingTypedValue(value)) out.push(`${path}:${type}`);
    return out;
  }

  if (isMissingTypedValue(value) || typeof value !== 'object') {
    out.push(`${path}:${baseType}`);
    return out;
  }

  for (const field of fields) {
    const fieldValue = value[field.name];
    const fieldPath = `${path}.${field.name}`;
    const fieldBaseType = baseTypedDataType(field.type);

    if (isMissingTypedValue(fieldValue)) {
      out.push(`${fieldPath}:${field.type}`);
      continue;
    }

    if (field.type.endsWith(']')) {
      if (!Array.isArray(fieldValue)) {
        out.push(`${fieldPath}:${field.type}`);
        continue;
      }
      fieldValue.forEach((item, index) =>
        collectSchemaMissingPaths(
          types,
          fieldBaseType,
          item,
          `${fieldPath}[${index}]`,
          out,
        ),
      );
      continue;
    }

    collectSchemaMissingPaths(types, fieldBaseType, fieldValue, fieldPath, out);
  }

  return out;
}

function isIntegerType(type: string) {
  return /^u?int(\d+)?$/.test(type);
}

function isHexString(value: string) {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

function normalizeBytes32(value: any) {
  if (isMissingTypedValue(value)) return value;

  if (typeof value === 'bigint') {
    return `0x${value.toString(16).padStart(64, '0')}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
  }

  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return `0x${BigInt(trimmed).toString(16).padStart(64, '0')}`;
  }

  if (!isHexString(trimmed)) return value;

  const hex = trimmed.slice(2);
  if (hex.length === 64) return trimmed;
  if (hex.length < 64) return `0x${hex.padStart(64, '0')}`;

  return value;
}

function normalizeTypedDataValue(
  types: Record<string, Array<{ name: string; type: string }>>,
  type: string,
  value: any,
): any {
  const baseType = baseTypedDataType(type);

  if (type.endsWith(']')) {
    if (!Array.isArray(value)) return value;
    return value.map((item) =>
      normalizeTypedDataValue(types, baseType, item),
    );
  }

  const fields = types[baseType];
  if (fields) {
    if (typeof value !== 'object' || value === null) return value;
    const next = { ...value };
    for (const field of fields) {
      next[field.name] = normalizeTypedDataValue(
        types,
        field.type,
        next[field.name],
      );
    }
    return next;
  }

  if (isIntegerType(baseType) && !isMissingTypedValue(value)) {
    return BigInt(value);
  }

  if (baseType === 'bytes32') {
    return normalizeBytes32(value);
  }

  return value;
}

function serializeForJson(value: any): any {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        serializeForJson(nested),
      ]),
    );
  }
  return value;
}

function sanitizeTypedDataTypes(types: Record<string, any>) {
  const next = { ...(types ?? {}) };
  delete next.EIP712Domain;
  return next;
}

function isMissingTypedValue(value: any) {
  const stringValue =
    typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (
    value == null ||
    value === '' ||
    stringValue === 'undefined' ||
    stringValue.includes('undefined')
  );
}

function sanitizeTypedDataDomain(domain: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(domain ?? {}).filter(
      ([, value]) => !isMissingTypedValue(value),
    ),
  );
}

function assertTypedDataMessage(
  types: Record<string, Array<{ name: string; type: string }>>,
  primaryType: string,
  message: Record<string, any>,
) {
  const primaryFields = types?.[primaryType] ?? [];
  const missing = primaryFields
    .filter((field) => isMissingTypedValue(message?.[field.name]))
    .map((field) => `${field.name}:${field.type}`);

  if (missing.length > 0) {
    throw new Error(
      `Order signing data is incomplete (${missing.join(', ')}). Please refresh this market and try again.`,
    );
  }
}

function assertNoUndefinedTypedValues(value: any, path: string) {
  if (isMissingTypedValue(value)) {
    throw new Error(
      `Order signing data is incomplete (${path}). Please refresh this market and try again.`,
    );
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUndefinedTypedValues(item, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, nestedValue] of Object.entries(value)) {
      assertNoUndefinedTypedValues(nestedValue, `${path}.${key}`);
    }
  }
}

function baseTypedDataType(type: string) {
  return type.replace(/\[[^\]]*\]$/, '');
}

function assertTypedDataStruct(
  types: Record<string, Array<{ name: string; type: string }>>,
  type: string,
  value: any,
  path: string,
) {
  const baseType = baseTypedDataType(type);
  const fields = types[baseType];

  if (!fields) {
    assertNoUndefinedTypedValues(value, path);
    return;
  }

  if (isMissingTypedValue(value) || typeof value !== 'object') {
    throw new Error(
      `Order signing data is incomplete (${path}:${baseType}). Please refresh this market and try again.`,
    );
  }

  for (const field of fields) {
    const fieldValue = value[field.name];
    const fieldPath = `${path}.${field.name}`;
    const fieldBaseType = baseTypedDataType(field.type);

    if (isMissingTypedValue(fieldValue)) {
      throw new Error(
        `Order signing data is incomplete (${fieldPath}:${field.type}). Please refresh this market and try again.`,
      );
    }

    if (field.type.endsWith(']')) {
      if (!Array.isArray(fieldValue)) {
        throw new Error(
          `Order signing data is incomplete (${fieldPath}:${field.type}). Please refresh this market and try again.`,
        );
      }
      fieldValue.forEach((item, index) =>
        assertTypedDataStruct(
          types,
          fieldBaseType,
          item,
          `${fieldPath}[${index}]`,
        ),
      );
    } else {
      assertTypedDataStruct(types, fieldBaseType, fieldValue, fieldPath);
    }
  }
}

export function useClobOrder(
  _session: object | null,
  _walletAddress: string | undefined,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    tradingSession,
    safeAddress,
    eoaAddress,
    walletType,
    depositWalletAddress,
  } = useTrading();
  const { walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();
  const { addSigners } = useSigners();
  const { user: privyUser } = usePrivy();

  const isEmbeddedPrivyWallet = useCallback(
    (address: string) => {
      const target = address.toLowerCase();
      return (privyUser?.linkedAccounts || []).some((account: any) => {
        if (account?.type !== 'wallet') return false;
        if (account?.address?.toLowerCase() !== target) return false;
        return (
          account.walletClientType === 'privy' ||
          account.wallet_client_type === 'privy' ||
          account.connectorType === 'embedded' ||
          account.connector_type === 'embedded'
        );
      });
    },
    [privyUser],
  );

  const ensureDelegatedSigner = useCallback(
    async (address: string) => {
      if (!delegatedSignerId || !isEmbeddedPrivyWallet(address)) return false;

      const storageKey = `privy-delegated-signer:${delegatedSignerId}:${address.toLowerCase()}`;
      if (typeof window !== 'undefined' && window.localStorage.getItem(storageKey)) {
        return true;
      }

      await addSigners({
        address,
        signers: [
          {
            signerId: delegatedSignerId,
            policyIds: delegatedPolicyIds,
          },
        ],
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, 'true');
      }
      return true;
    },
    [addSigners, isEmbeddedPrivyWallet],
  );

  const signOrderTypedData = useCallback(
    async (orderTypedData: any) => {
      if (!eoaAddress || !walletClient || !accessToken) {
        throw new Error('Trading session not ready');
      }

      const primaryType = orderTypedData.primaryType ?? 'Order';
      const domain = sanitizeTypedDataDomain(orderTypedData.domain);
      const types = sanitizeTypedDataTypes(orderTypedData.types);
      const message = normalizeTypedDataValue(
        types,
        primaryType,
        orderTypedData.message,
      );
      const looseMissingPaths = [
        ...collectUndefinedPaths(domain, 'domain'),
        ...collectUndefinedPaths(message, 'message'),
      ];
      const schemaMissingPaths = collectSchemaMissingPaths(
        types,
        primaryType,
        message,
        'message',
      );

      logOrderDebug('typed data before signing', {
        raw: summarizeTypedData(orderTypedData),
        sanitized: summarizeTypedData({
          domain,
          types,
          primaryType,
          message,
        }),
        looseMissingPaths,
        schemaMissingPaths,
      });

      assertTypedDataMessage(types, primaryType, message);
      assertNoUndefinedTypedValues(domain, 'domain');
      assertNoUndefinedTypedValues(message, 'message');
      assertTypedDataStruct(types, primaryType, message, 'message');

      if (delegatedSignerId && swopApiBase() && isEmbeddedPrivyWallet(eoaAddress)) {
        try {
          await ensureDelegatedSigner(eoaAddress);

          const delegatedRes = await fetch(
            `${swopApiBase()}/api/v5/wallet/privy/ethereum/sign-typed-data`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                address: eoaAddress,
                typedData: {
                  domain,
                  types,
                  primaryType,
                  message: serializeForJson(message),
                },
              }),
            },
          );

          if (delegatedRes.ok) {
            const data = await delegatedRes.json();
            if (data?.signature) return data.signature as `0x${string}`;
          } else {
            const err = await delegatedRes.json().catch(() => ({}));
            console.warn(
              'Delegated Privy signing failed; falling back to wallet modal:',
              err.message || err.error || delegatedRes.status,
            );
          }
        } catch (err) {
          console.warn(
            'Delegated Privy signing unavailable; falling back to wallet modal:',
            err,
          );
        }
      }

      // Sign via eth_signTypedData_v4 so no extra EIP-191 prefix is added on
      // top of the EIP-712 hash. uint256 fields arrive as decimal strings
      // from JSON; viem expects BigInt for those fields.
      try {
        return await walletClient.signTypedData({
          account: eoaAddress as `0x${string}`,
          domain,
          types,
          primaryType,
          message,
        });
      } catch (err) {
        logOrderError('wallet signTypedData failed', {
          error: err,
          raw: summarizeTypedData(orderTypedData),
          sanitized: summarizeTypedData({
            domain,
            types,
            primaryType,
            message,
          }),
          looseMissingPaths,
          schemaMissingPaths,
        });
        throw err;
      }
    },
    [
      accessToken,
      eoaAddress,
      ensureDelegatedSigner,
      isEmbeddedPrivyWallet,
      walletClient,
    ],
  );

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !walletClient || !accessToken) {
        throw new Error('Trading session not ready');
      }

      setIsSubmitting(true);
      setError(null);
      setOrderId(null);

      try {
        const orderType = params.isMarketOrder
          ? (params.fillType === 'FAK' ? 'FAK' : 'FOK')
          : (params.expiration ? 'GTD' : 'GTC');

        // Step 1: Prepare order (backend builds EIP-712 typed data)
        const authHeaders = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        };
        const prepareBody = {
          tokenId: params.tokenId,
          conditionId: params.conditionId,
          side: params.side,
          orderType,
          amount: params.size,
          price: params.price,
          expiration: params.expiration,
          negRisk: params.negRisk,
          safeAddress,
          depositWalletAddress,
          walletType,
          eoaAddress,
          apiCreds: tradingSession.apiCredentials,
        };

        logOrderDebug('prepare request', {
          tokenId: prepareBody.tokenId,
          conditionId: prepareBody.conditionId,
          side: prepareBody.side,
          orderType: prepareBody.orderType,
          amount: prepareBody.amount,
          price: prepareBody.price,
          expiration: prepareBody.expiration,
          negRisk: prepareBody.negRisk,
          safeAddress: prepareBody.safeAddress,
          depositWalletAddress: prepareBody.depositWalletAddress,
          walletType: prepareBody.walletType,
          eoaAddress: prepareBody.eoaAddress,
          hasApiCreds: !!prepareBody.apiCreds,
        });

        const prepareRes = await fetch(`${backendBase()}/orders/prepare`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(prepareBody),
        });

        if (!prepareRes.ok) {
          const err = await prepareRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to prepare order');
        }

        const { orderTypedData, orderMeta } = await prepareRes.json();
        logOrderDebug('prepare response', {
          typedData: summarizeTypedData(orderTypedData),
          orderMetaKeys: Object.keys(orderMeta ?? {}),
          orderMeta,
        });

        const signature = await signOrderTypedData(orderTypedData);

        // Step 3: Submit the signed order
        const submitRes = await fetch(`${backendBase()}/orders/submit`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            orderMeta,
            signature,
            apiCreds: tradingSession.apiCredentials,
          }),
        });

        if (!submitRes.ok) {
          const err = await submitRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to submit order');
        }

        const result = await submitRes.json();
        if (!result.orderId) throw new Error('Order submission failed — no orderId');

        setOrderId(result.orderId);
        queryClient.invalidateQueries({ queryKey: ['active-orders', safeAddress] });
        queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
        return { success: true, orderId: result.orderId };
      } catch (err: unknown) {
        const error = extractClobError(err);
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      tradingSession,
      safeAddress,
      eoaAddress,
      walletClient,
      signOrderTypedData,
      accessToken,
      queryClient,
      walletType,
      depositWalletAddress,
    ],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !accessToken) {
        throw new Error('Trading session not ready');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`${backendBase()}/orders/${orderId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            apiCreds: tradingSession.apiCredentials,
            safeAddress,
            depositWalletAddress,
            walletType,
            eoaAddress,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to cancel order');
        }
        queryClient.invalidateQueries({ queryKey: ['active-orders', safeAddress] });
        return { success: true };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Failed to cancel order');
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      tradingSession,
      safeAddress,
      eoaAddress,
      accessToken,
      queryClient,
      walletType,
      depositWalletAddress,
    ],
  );

  const resetOrder = useCallback(() => {
    setOrderId(null);
    setError(null);
  }, []);

  return { submitOrder, cancelOrder, resetOrder, isSubmitting, error, orderId };
}
