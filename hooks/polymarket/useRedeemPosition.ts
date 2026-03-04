import { useState, useCallback } from 'react';
import { pmApi } from '@/lib/polymarket/polymarketApi';
import type { RedeemParams } from '@/lib/polymarket/redeem';

export function useRedeemPosition() {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const redeemPosition = useCallback(
    async (safeAddress: string, params: RedeemParams): Promise<boolean> => {
      setIsRedeeming(true);
      setError(null);

      try {
        const result = await pmApi<{ success: boolean }>('/positions/redeem', {
          method: 'POST',
          body: JSON.stringify({
            safeAddress,
            conditionId: params.conditionId,
            negRisk: params.negativeRisk ?? false,
            outcomeIndex: params.outcomeIndex,
            size: params.size ?? 0,
          }),
        });

        return result.success;
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error('Failed to redeem position');
        setError(e);
        console.error('Redeem error:', e);
        throw e;
      } finally {
        setIsRedeeming(false);
      }
    },
    [],
  );

  return { isRedeeming, error, redeemPosition };
}
