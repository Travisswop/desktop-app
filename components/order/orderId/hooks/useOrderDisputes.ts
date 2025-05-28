import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import { getOrderDisputes } from '@/actions/disputeActions';
import { DisputeItem } from '../utils/refundUtils';

interface UseOrderDisputesReturn {
  disputes: DisputeItem[];
  isLoading: boolean;
  error: string | null;
  refetchDisputes: () => Promise<void>;
}

export const useOrderDisputes = (
  orderId: string
): UseOrderDisputesReturn => {
  const { accessToken } = useUser();
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    if (!orderId || !accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getOrderDisputes(orderId, accessToken);

      if (result.success && result.disputes) {
        // Map the disputes to our simplified format
        const mappedDisputes: DisputeItem[] = result.disputes.map(
          (dispute: any) => ({
            id: dispute.id,
            status: dispute.status,
            response: dispute.response,
          })
        );
        setDisputes(mappedDisputes);
      } else {
        setDisputes([]);
      }
    } catch (error: any) {
      console.error('Error fetching disputes:', error);
      setError(error.message || 'Failed to fetch disputes');
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, accessToken]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      disputes,
      isLoading,
      error,
      refetchDisputes: fetchDisputes,
    }),
    [disputes, isLoading, error, fetchDisputes]
  );
};
