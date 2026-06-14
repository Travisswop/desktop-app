import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePrivy,
  useSigners,
  useSignTypedData,
} from '@privy-io/react-auth';
import { useTrading } from '@/providers/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import { getDepositWalletAddress } from '@/lib/polymarket/backend-session';
import { safeLocalStorage } from '@/lib/browserStorage';
import {
  CTF_CONTRACT_ADDRESS,
  POLLING_DURATION,
  POLLING_INTERVAL,
  POLYMARKET_BACKEND_URL,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';
import { createPollingInterval } from '@/lib/polymarket/polling';

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
  acceptedPrice?: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
  isMarketOrder?: boolean;
  fillType?: 'FOK' | 'FAK';
  expiration?: number;
  /**
   * Embedded Privy wallets should sign prediction orders without opening the
   * full Privy confirmation modal. Pass true only for an explicit wallet UI
   * fallback flow.
   */
  showWalletUIs?: boolean;
};

export type OrderSubmissionStage =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'submitting';

export type OrderExecutionSummary = {
  side?: 'BUY' | 'SELL';
  status?: string;
  price?: number;
  shares?: number;
  cost?: number;
  proceeds?: number;
  makingAmount?: number;
  takingAmount?: number;
  tradeIds?: string[];
  transactionHashes?: string[];
};

export type OrderSubmitResult = {
  success: true;
  orderId: string;
  status?: string;
  execution?: OrderExecutionSummary;
  tradeIds?: string[];
  transactionHashes?: string[];
};

const backendBase = () => `${POLYMARKET_BACKEND_URL}/api/prediction-markets`;
const swopApiBase = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const delegatedSignerId =
  process.env.NEXT_PUBLIC_PRIVY_DELEGATED_SIGNER_ID ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_WALLET_ID;
const delegatedPolicyIds = (
  process.env.NEXT_PUBLIC_PRIVY_DELEGATED_POLICY_IDS ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_POLICY_IDS ||
  ''
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const DEBUG_ORDER_SIGNING = true;
const MARKET_ORDER_PRICE_PROTECTION = 0.03;
type DelegatedSignerConfig = {
  signerId: string;
  policyIds: string[];
};
const ERC1155_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function logOrderDebug(label: string, data: Record<string, any>) {
  if (!DEBUG_ORDER_SIGNING) return;
  console.info(`[Polymarket order] ${label}`, data);
}

function logOrderError(label: string, data: Record<string, any>) {
  console.error(`[Polymarket order] ${label}`, data);
}

function parseProbabilityPrice(value: unknown) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 && price < 1 ? price : null;
}

function formatProbabilityCents(value: number) {
  return `${Math.round(value * 100)}¢`;
}

async function fetchFreshExecutionQuote(
  tokenId: string,
  headers: HeadersInit,
): Promise<{ bid: number | null; ask: number | null }> {
  const response = await fetch(`${backendBase()}/prices`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tokenIds: [tokenId] }),
  });

  if (!response.ok) {
    throw new Error('Could not refresh Polymarket price. Try again.');
  }

  const body = await response.json();
  const quote = body?.[tokenId] ?? {};
  return {
    bid: parseProbabilityPrice(quote.bid),
    ask: parseProbabilityPrice(quote.ask),
  };
}

function resolveProtectedMarketPrice(
  params: OrderParams,
  quote: { bid: number | null; ask: number | null },
) {
  const acceptedPrice = parseProbabilityPrice(params.acceptedPrice);

  if (acceptedPrice == null) {
    throw new Error(
      'This order needs a fresh market quote. Refresh the market and try again.',
    );
  }

  if (params.side === 'BUY') {
    const liveAsk = quote.ask;
    if (liveAsk == null) {
      throw new Error('No live ask is available for this market.');
    }

    const protectedPrice = Math.min(
      0.99,
      acceptedPrice + MARKET_ORDER_PRICE_PROTECTION,
    );
    if (liveAsk > protectedPrice + 1e-9) {
      throw new Error(
        `Market price moved from ${formatProbabilityCents(acceptedPrice)} to ${formatProbabilityCents(liveAsk)}. Refresh before placing the order.`,
      );
    }

    return {
      protectedPrice,
      liveQuotePrice: liveAsk,
      acceptedPrice,
    };
  }

  const liveBid = quote.bid;
  if (liveBid == null) {
    throw new Error('No live bid is available for this market.');
  }

  const protectedPrice = Math.max(
    0.01,
    acceptedPrice - MARKET_ORDER_PRICE_PROTECTION,
  );
  if (liveBid < protectedPrice - 1e-9) {
    throw new Error(
      `Market price moved from ${formatProbabilityCents(acceptedPrice)} to ${formatProbabilityCents(liveBid)}. Refresh before placing the order.`,
    );
  }

  return {
    protectedPrice,
    liveQuotePrice: liveBid,
    acceptedPrice,
  };
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
  void _session;
  void _walletAddress;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderStage, setOrderStage] =
    useState<OrderSubmissionStage>('idle');
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
  const { publicClient, walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();
  const { addSigners } = useSigners();
  const { signTypedData: signTypedDataWithPrivy } = useSignTypedData();
  const { user: privyUser } = usePrivy();
  const [delegatedSignerConfig, setDelegatedSignerConfig] =
    useState<DelegatedSignerConfig | null>(null);

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

  const readOutcomeTokenBalance = useCallback(
    async (walletAddress: string | undefined, tokenId: string) => {
      if (!walletAddress || !publicClient) return 0;
      try {
        const raw = await publicClient.readContract({
          address: CTF_CONTRACT_ADDRESS,
          abi: ERC1155_BALANCE_OF_ABI,
          functionName: 'balanceOf',
          args: [
            walletAddress as `0x${string}`,
            BigInt(tokenId),
          ],
        });
        return Number(raw) / 10 ** USDC_E_DECIMALS;
      } catch (error) {
        logOrderError('failed to read outcome token balance', {
          walletAddress,
          tokenId,
          error,
        });
        return 0;
      }
    },
    [publicClient],
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
      },
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
    async (address: string) => {
      if (!isEmbeddedPrivyWallet(address)) return false;
      const config = await getDelegatedSignerConfig();
      if (!config?.signerId) return false;

      const storageKey = `privy-delegated-signer:${config.signerId}:${address.toLowerCase()}`;
      if (safeLocalStorage.getItem(storageKey)) {
        return true;
      }

      await addSigners({
        address,
        signers: [
          {
            signerId: config.signerId,
            policyIds: config.policyIds,
          },
        ],
      });

      safeLocalStorage.setItem(storageKey, 'true');
      return true;
    },
    [addSigners, getDelegatedSignerConfig, isEmbeddedPrivyWallet],
  );

  const signOrderTypedData = useCallback(
    async (
      orderTypedData: any,
      options?: { showWalletUIs?: boolean },
    ) => {
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

      const isEmbeddedWallet = isEmbeddedPrivyWallet(eoaAddress);
      const shouldHideWalletUIs = options?.showWalletUIs !== true;

      if (swopApiBase() && isEmbeddedWallet) {
        try {
          if (!shouldHideWalletUIs) {
            const delegatedSignerReady = await ensureDelegatedSigner(eoaAddress);
            if (!delegatedSignerReady) {
              throw new Error('Delegated signer is not configured.');
            }
          }

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
              shouldHideWalletUIs
                ? 'Silent delegated Privy signing failed; falling back to hidden wallet signing:'
                : 'Delegated Privy signing failed; falling back to wallet modal:',
              err.message || err.error || delegatedRes.status,
            );
          }
        } catch (err) {
          console.warn(
            shouldHideWalletUIs
              ? 'Silent delegated Privy signing unavailable; falling back to hidden wallet signing:'
              : 'Delegated Privy signing unavailable; falling back to wallet modal:',
            err,
          );
        }
      }

      if (shouldHideWalletUIs && isEmbeddedWallet) {
        try {
          const { signature } = await signTypedDataWithPrivy(
            {
              domain,
              types,
              primaryType,
              message: serializeForJson(message),
            },
            {
              address: eoaAddress,
              uiOptions: { showWalletUIs: false },
            },
          );
          return signature as `0x${string}`;
        } catch (err) {
          logOrderError('hidden Privy signTypedData failed', {
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
      signTypedDataWithPrivy,
      walletClient,
    ],
  );

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !walletClient || !accessToken) {
        throw new Error('Trading session not ready');
      }
      if (
        walletType === 'deposit' &&
        tradingSession.apiCredentialsAddress?.toLowerCase() !==
          eoaAddress.toLowerCase()
      ) {
        // CLOB API credentials are EOA-owned; POLY_1271 routes the order
        // maker/signer through the deposit wallet.
        throw new Error(
          'Trading session needs to be refreshed before placing orders.',
        );
      }

      setIsSubmitting(true);
      setOrderStage('preparing');
      setError(null);
      setOrderId(null);

      try {
        const orderType = params.isMarketOrder
          ? (params.fillType === 'FAK' ? 'FAK' : 'FOK')
          : (params.expiration ? 'GTD' : 'GTC');
        const canonicalDepositWallet = walletType === 'deposit'
          ? (await getDepositWalletAddress(eoaAddress, accessToken)).depositWalletAddress
          : undefined;
        const orderWalletAddress =
          walletType === 'deposit'
            ? canonicalDepositWallet
            : safeAddress;
        const activeOutcomeBalance =
          params.side === 'SELL'
            ? await readOutcomeTokenBalance(orderWalletAddress, params.tokenId)
            : undefined;
        const availableSellBalance = activeOutcomeBalance ?? 0;

        if (
          params.side === 'SELL' &&
          availableSellBalance + 0.000001 < params.size
        ) {
          throw new Error(
            `Insufficient shares to sell. You have ${availableSellBalance.toFixed(6)} shares in the selected wallet, but tried to sell ${params.size.toFixed(6)}.`,
          );
        }

        // Step 1: Prepare order (backend builds EIP-712 typed data)
        const authHeaders = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        };
        let protectedOrderPrice = params.price;
        let marketOrderProtection:
          | {
              protectedPrice: number;
              liveQuotePrice: number;
              acceptedPrice: number;
            }
          | null = null;

        if (params.isMarketOrder) {
          const freshQuote = await fetchFreshExecutionQuote(
            params.tokenId,
            authHeaders,
          );
          marketOrderProtection = resolveProtectedMarketPrice(
            params,
            freshQuote,
          );
          protectedOrderPrice = marketOrderProtection.protectedPrice;
        }

        const prepareBody = {
          tokenId: params.tokenId,
          conditionId: params.conditionId,
          side: params.side,
          orderType,
          amount: params.size,
          price: protectedOrderPrice,
          acceptedPrice: marketOrderProtection?.acceptedPrice,
          expiration: params.expiration,
          negRisk: params.negRisk,
          safeAddress: orderWalletAddress,
          depositWalletAddress: walletType === 'deposit'
            ? orderWalletAddress
            : undefined,
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
          acceptedPrice: prepareBody.acceptedPrice,
          marketOrderProtection,
          expiration: prepareBody.expiration,
          negRisk: prepareBody.negRisk,
          safeAddress: prepareBody.safeAddress,
          depositWalletAddress: prepareBody.depositWalletAddress,
          sessionSafeAddress: safeAddress,
          sessionDepositWalletAddress: depositWalletAddress,
          canonicalDepositWallet,
          walletType: prepareBody.walletType,
          apiKeyOwnerAddress: eoaAddress,
          orderFunderAddress: orderWalletAddress,
          activeOutcomeBalance,
          availableSellBalance:
            params.side === 'SELL' ? availableSellBalance : undefined,
          eoaAddress: prepareBody.eoaAddress,
          apiCredentialsAddress: tradingSession.apiCredentialsAddress,
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

        setOrderStage('signing');
        const signature = await signOrderTypedData(orderTypedData, {
          showWalletUIs: params.showWalletUIs,
        });

        // Step 3: Submit the signed order
        setOrderStage('submitting');
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
          logOrderError('submit failed', {
            status: submitRes.status,
            error: err,
            orderMeta,
          });
          throw new Error(err.error || 'Failed to submit order');
        }

        const result = await submitRes.json();
        if (!result.orderId) throw new Error('Order submission failed — no orderId');

        setOrderId(result.orderId);
        const refreshTradingState = () => {
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-history'] });
          queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
          queryClient.invalidateQueries({ queryKey: ['pusdBalance'] });
          queryClient.invalidateQueries({ queryKey: ['legacyUsdcBalance'] });
        };
        refreshTradingState();
        createPollingInterval(
          refreshTradingState,
          POLLING_INTERVAL,
          POLLING_DURATION,
        );
        return {
          success: true,
          orderId: result.orderId,
          status: result.status,
          execution: result.execution,
          tradeIds: result.tradeIds,
          transactionHashes: result.transactionHashes,
        } satisfies OrderSubmitResult;
      } catch (err: unknown) {
        const error = extractClobError(err);
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
        setOrderStage('idle');
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
      readOutcomeTokenBalance,
    ],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !accessToken) {
        throw new Error('Trading session not ready');
      }

      setIsSubmitting(true);
      setOrderStage('submitting');
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
        setOrderStage('idle');
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
    setOrderStage('idle');
  }, []);

  return {
    submitOrder,
    cancelOrder,
    resetOrder,
    isSubmitting,
    orderStage,
    error,
    orderId,
  };
}
