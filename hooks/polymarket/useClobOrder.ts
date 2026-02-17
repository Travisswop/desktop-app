import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Side, OrderType } from '@polymarket/clob-client';
import type {
  ClobClient,
  UserOrder,
  UserMarketOrder,
} from '@polymarket/clob-client';

export type OrderParams = {
  tokenId: string;
  size: number;
  price?: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
  isMarketOrder?: boolean;
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
          // For market orders, use createAndPostMarketOrder with FOK
          // BUY orders: params.size is the dollar amount (USDC)
          // SELL orders: params.size is the share amount
          // The CLOB client handles price calculation internally via the order book

          const marketOrder: UserMarketOrder = {
            tokenID: params.tokenId,
            amount: params.size,
            side,
          };

          console.log('marketOrder', marketOrder);

          response = await clobClient.createAndPostMarketOrder(
            marketOrder,
            { negRisk: params.negRisk },
            OrderType.FOK, // Fill or Kill for market orders
          );
        } else {
          // For limit orders, use createAndPostOrder with GTC
          if (!params.price) {
            throw new Error('Price required for limit orders');
          }

          const limitOrder: UserOrder = {
            tokenID: params.tokenId,
            price: params.price,
            size: params.size,
            side,
          };

          response = await clobClient.createAndPostOrder(
            limitOrder,
            { negRisk: params.negRisk },
            OrderType.GTC, // Good Till Cancelled for limit orders
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
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to submit order');
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
