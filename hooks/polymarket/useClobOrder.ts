import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Side, OrderType } from '@polymarket/clob-client';
import type {
  ClobClient,
  UserOrder,
  UserMarketOrder,
} from '@polymarket/clob-client';

const CLOB_ERROR_MESSAGES: Record<string, string> = {
  INVALID_ORDER_MIN_TICK_SIZE:
    "Price doesn't match this market's tick size. Adjust your price and try again.",
  INVALID_ORDER_MIN_SIZE:
    "Order size is below the minimum allowed for this market.",
  INVALID_ORDER_DUPLICATED:
    "An identical order is already open.",
  INVALID_ORDER_NOT_ENOUGH_BALANCE:
    "Insufficient USDC balance or allowance.",
  INVALID_ORDER_EXPIRATION:
    "Order expiration is in the past.",
  INVALID_ORDER_ERROR:
    "Server error while submitting order. Please try again.",
  INVALID_POST_ONLY_ORDER_TYPE:
    "Post-only orders cannot be market orders (FOK/FAK).",
  INVALID_POST_ONLY_ORDER:
    "Post-only order would cross the spread and was rejected.",
  EXECUTION_ERROR:
    "Trade execution failed. Please try again.",
  ORDER_DELAYED:
    "Order placement delayed due to market conditions.",
  DELAYING_ORDER_ERROR:
    "Server error while delaying order. Please try again.",
  FOK_ORDER_NOT_FILLED_ERROR:
    "Market order could not be fully filled. Try increasing your slippage tolerance.",
  MARKET_NOT_READY:
    "This market is not yet accepting orders.",
};

function extractClobError(err: unknown): Error {
  if (err instanceof Error) {
    // The CLOB client uses Axios — check response body for error code
    const data = (err as any)?.response?.data;
    const code: string | undefined =
      data?.error ?? data?.errorCode ?? data?.code;
    if (code && CLOB_ERROR_MESSAGES[code]) {
      return new Error(CLOB_ERROR_MESSAGES[code]);
    }
    return err;
  }
  return new Error('Failed to submit order');
}

export type OrderParams = {
  tokenId: string;
  size: number;
  /** For limit orders: exact price. For market orders: worst-acceptable price (slippage cap).
   *  BUY slippage cap = max price per share willing to pay (default 0.97).
   *  SELL slippage cap = min price per share willing to accept (default 0.03). */
  price?: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
  isMarketOrder?: boolean;
  /** Market order fill type. FOK = all-or-nothing (default), FAK = fill partial then cancel. */
  fillType?: 'FOK' | 'FAK';
  /** GTD expiration timestamp in UTC seconds. Minimum = Math.floor(Date.now()/1000) + 60 + N.
   *  If provided and isMarketOrder is false, order is submitted as GTD instead of GTC. */
  expiration?: number;
};

export function useClobOrder(
  clobClient: ClobClient | null,
  walletAddress: string | undefined,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }
      if (!clobClient) {
        throw new Error('CLOB client not initialized');
      }

      setIsSubmitting(true);
      setError(null);
      setOrderId(null);

      console.log('params', params);

      try {
        const side = params.side === 'BUY' ? Side.BUY : Side.SELL;
        let response;

        if (params.isMarketOrder) {
          // For market orders, use createAndPostMarketOrder with FOK or FAK.
          // BUY orders: params.size is the dollar amount (USDC)
          // SELL orders: params.size is the share amount
          // The CLOB client handles price calculation internally via the order book

          // `price` for FOK/FAK is the worst-acceptable slippage cap, not the
          // target execution price. Without it, the order can fill at any price.
          // Default: BUY accepts up to 0.97/share, SELL accepts down to 0.03/share.
          const slippagePrice =
            params.price ?? (side === Side.BUY ? 0.97 : 0.03);

          const marketFillType =
            params.fillType === 'FAK' ? OrderType.FAK : OrderType.FOK;

          const marketOrder: UserMarketOrder = {
            tokenID: params.tokenId,
            amount: params.size,
            side,
            price: slippagePrice,
          };

          console.log('marketOrder', marketOrder, 'fillType:', marketFillType);

          response = await clobClient.createAndPostMarketOrder(
            marketOrder,
            { negRisk: params.negRisk },
            marketFillType,
          );
        } else {
          // For limit orders, use createAndPostOrder with GTC or GTD.
          if (!params.price) {
            throw new Error('Price required for limit orders');
          }

          const isGtd = !!params.expiration;
          // GTD minimum: current time + 60s security buffer + desired lifetime
          if (isGtd) {
            const minExpiration = Math.floor(Date.now() / 1000) + 60;
            if (params.expiration! <= minExpiration) {
              throw new Error(
                'GTD expiration must be at least 60 seconds in the future',
              );
            }
          }

          const limitOrder: UserOrder = {
            tokenID: params.tokenId,
            price: params.price,
            size: params.size,
            side,
            ...(isGtd ? { expiration: params.expiration } : {}),
          };

          response = await clobClient.createAndPostOrder(
            limitOrder,
            { negRisk: params.negRisk },
            isGtd ? OrderType.GTD : OrderType.GTC,
          );
        }

        console.log('response', response);

        if (response.orderID) {
          setOrderId(response.orderID);
          queryClient.invalidateQueries({
            queryKey: ['active-orders'],
          });
          queryClient.invalidateQueries({
            queryKey: ['polymarket-positions'],
          });
          return { success: true, orderId: response.orderID };
        } else {
          throw new Error('Order submission failed');
        }
      } catch (err: unknown) {
        const error = extractClobError(err);
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [clobClient, walletAddress, queryClient],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!clobClient) {
        throw new Error('CLOB client not initialized');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await clobClient.cancelOrder({ orderID: orderId });
        queryClient.invalidateQueries({
          queryKey: ['active-orders'],
        });
        return { success: true };
      } catch (err: unknown) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to cancel order');
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [clobClient, queryClient],
  );

  return {
    submitOrder,
    cancelOrder,
    isSubmitting,
    error,
    orderId,
  };
}
