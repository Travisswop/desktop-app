import { useState, useCallback } from 'react';
import type { ClobClient } from '@polymarket/clob-client';

export type ClobOrderParams = {
  tokenId: string;
  size: number;
  price?: number;
  side: 'BUY' | 'SELL';
  negRisk: boolean;
  isMarketOrder: boolean;
  fillType?: 'FOK' | 'FAK';
  expiration?: number;
};

export function useClobOrder(
  clobClient: ClobClient | null,
  eoaAddress: string | undefined,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submitOrder = useCallback(async (params: ClobOrderParams) => {
    if (!clobClient || !eoaAddress) {
      throw new Error('CLOB client not available or wallet not connected');
    }

    setIsSubmitting(true);
    setError(null);
    setOrderId(null);

    try {
      const orderData = {
        tokenID: params.tokenId,
        price: params.price || 0,
        size: params.size,
        side: params.side,
        feeRateBps: 0,
        nonce: Date.now(),
        expiration: params.expiration || Math.floor(Date.now() / 1000) + 86400, // 24 hours default
        taker: eoaAddress,
        maker: eoaAddress,
        signatureType: 1,
      };

      // Create and submit the order
      const order = await clobClient.createOrder(orderData);
      const result = await clobClient.postOrder(order);
      
      setOrderId(result.orderID);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Order submission failed');
      setError(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [clobClient, eoaAddress]);

  return {
    submitOrder,
    isSubmitting,
    orderId,
    error,
  };
}