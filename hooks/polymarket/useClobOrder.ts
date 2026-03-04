import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTrading } from '@/providers/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import { pmApi } from '@/lib/polymarket/polymarketApi';

const CLOB_ERROR_MESSAGES: Record<string, string> = {
  INVALID_ORDER_MIN_TICK_SIZE:
    "Price doesn't match this market's tick size. Adjust your price and try again.",
  INVALID_ORDER_MIN_SIZE:
    'Order size is below the minimum allowed for this market.',
  INVALID_ORDER_DUPLICATED: 'An identical order is already open.',
  INVALID_ORDER_NOT_ENOUGH_BALANCE:
    'Insufficient USDC balance or allowance.',
  INVALID_ORDER_EXPIRATION: 'Order expiration is in the past.',
  INVALID_ORDER_ERROR:
    'Server error while submitting order. Please try again.',
  INVALID_POST_ONLY_ORDER_TYPE:
    'Post-only orders cannot be market orders (FOK/FAK).',
  INVALID_POST_ONLY_ORDER:
    'Post-only order would cross the spread and was rejected.',
  EXECUTION_ERROR: 'Trade execution failed. Please try again.',
  ORDER_DELAYED: 'Order placement delayed due to market conditions.',
  DELAYING_ORDER_ERROR:
    'Server error while delaying order. Please try again.',
  FOK_ORDER_NOT_FILLED_ERROR:
    'Market order could not be fully filled. Try increasing your slippage tolerance.',
  MARKET_NOT_READY: 'This market is not yet accepting orders.',
};

function extractClobError(err: unknown): Error {
  if (err instanceof Error) {
    const msg = err.message;
    const code = Object.keys(CLOB_ERROR_MESSAGES).find((k) =>
      msg.includes(k),
    );
    if (code) return new Error(CLOB_ERROR_MESSAGES[code]);
    return err;
  }
  return new Error('Failed to submit order');
}

// uint256 fields in the Order EIP-712 struct — must be BigInt for signTypedData
const UINT256_FIELDS = new Set([
  'salt',
  'tokenId',
  'makerAmount',
  'takerAmount',
  'expiration',
  'nonce',
  'feeRateBps',
  'side',
  'signatureType',
]);

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

export function useClobOrder(walletAddress: string | undefined) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { tradingSession } = useTrading();
  const { walletClient } = usePolymarketWallet();

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!walletAddress) throw new Error('Wallet not connected');
      if (!tradingSession?.apiCredentials || !tradingSession?.safeAddress) {
        throw new Error('Trading session not initialized');
      }
      if (!walletClient) throw new Error('Wallet client not available');

      setIsSubmitting(true);
      setError(null);
      setOrderId(null);

      try {
        // Map params to backend orderType string
        let orderType: string;
        if (params.isMarketOrder) {
          orderType = params.fillType === 'FAK' ? 'FAK' : 'FOK';
        } else if (params.expiration) {
          orderType = 'GTD';
        } else {
          orderType = 'GTC';
        }

        // 1. Prepare order — backend returns EIP-712 typed data
        const { orderTypedData, orderMeta } = await pmApi<{
          orderTypedData: {
            domain: any;
            types: any;
            primaryType: string;
            message: Record<string, string>;
          };
          orderMeta: any;
        }>('/orders/prepare', {
          method: 'POST',
          body: JSON.stringify({
            tokenId: params.tokenId,
            side: params.side,
            orderType,
            amount: params.size,
            price: params.price,
            expiration: params.expiration,
            negRisk: params.negRisk,
            safeAddress: tradingSession.safeAddress,
            apiCreds: tradingSession.apiCredentials,
            eoaAddress: walletAddress,
          }),
        });

        // 2. Convert uint256 fields to BigInt for signTypedData
        const message = Object.fromEntries(
          Object.entries(orderTypedData.message).map(([k, v]) =>
            UINT256_FIELDS.has(k) ? [k, BigInt(v as string)] : [k, v],
          ),
        );

        // 3. Sign the order EIP-712 typed data
        const signature = await walletClient.signTypedData({
          domain: orderTypedData.domain,
          types: orderTypedData.types,
          primaryType: orderTypedData.primaryType as any,
          message,
        });

        // 4. Submit signed order to backend
        const result = await pmApi<{ orderID: string; status: string }>(
          '/orders/submit',
          {
            method: 'POST',
            body: JSON.stringify({
              orderMeta,
              signature,
              apiCreds: tradingSession.apiCredentials,
            }),
          },
        );

        if (result.orderID) {
          setOrderId(result.orderID);
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
          return { success: true, orderId: result.orderID };
        } else {
          throw new Error('Order submission failed');
        }
      } catch (err: unknown) {
        const e = extractClobError(err);
        setError(e);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [walletAddress, tradingSession, walletClient, queryClient],
  );

  const cancelOrder = useCallback(
    async (orderIdToCancel: string) => {
      if (!tradingSession?.apiCredentials || !tradingSession?.safeAddress) {
        throw new Error('Trading session not initialized');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await pmApi(`/orders/${orderIdToCancel}`, {
          method: 'DELETE',
          body: JSON.stringify({
            apiCreds: tradingSession.apiCredentials,
            safeAddress: tradingSession.safeAddress,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ['active-orders'] });
        return { success: true };
      } catch (err: unknown) {
        const e =
          err instanceof Error ? err : new Error('Failed to cancel order');
        setError(e);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tradingSession, queryClient],
  );

  return { submitOrder, cancelOrder, isSubmitting, error, orderId };
}
