import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  size: number;
  price?: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
  isMarketOrder?: boolean;
  fillType?: 'FOK' | 'FAK';
  expiration?: number;
};

const backendBase = () => `${POLYMARKET_BACKEND_URL}/api/prediction-markets`;

function normalizeOrderMessage(message: Record<string, any>) {
  const next = { ...message };

  for (const key of [
    'salt',
    'tokenId',
    'makerAmount',
    'takerAmount',
    'timestamp',
    'chainId',
  ]) {
    if (next[key] !== undefined) next[key] = BigInt(next[key]);
  }

  if (next.contents) {
    next.contents = normalizeOrderMessage(next.contents);
  }

  return next;
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

        const prepareRes = await fetch(`${backendBase()}/orders/prepare`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            tokenId: params.tokenId,
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
          }),
        });

        if (!prepareRes.ok) {
          const err = await prepareRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to prepare order');
        }

        const { orderTypedData, orderMeta } = await prepareRes.json();

        // Step 2: Sign via eth_signTypedData_v4 so no extra EIP-191 prefix is
        // added on top of the EIP-712 hash. Using signMessage (personal_sign)
        // would double-prefix the hash and produce an invalid signature.
        //
        // uint256 fields arrive as decimal strings from JSON; convert to BigInt
        // so viem's ABI encoder receives the expected type.
        const signature = await walletClient.signTypedData({
          account: eoaAddress as `0x${string}`,
          domain: orderTypedData.domain,
          types: orderTypedData.types,
          primaryType: orderTypedData.primaryType ?? 'Order',
          message: normalizeOrderMessage(orderTypedData.message),
        });

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
