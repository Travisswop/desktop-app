import { useState, useMemo, useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import { DisputeData } from '../components/OrderDispute';
import { createOrderDispute } from '@/actions/disputeActions';

interface UseDisputeReturn {
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
  submitDispute: (
    orderId: string,
    disputeData: DisputeData
  ) => Promise<void>;
  resetState: () => void;
}

export const useDispute = (): UseDisputeReturn => {
  const { accessToken } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submitDispute = useCallback(
    async (
      orderId: string,
      disputeData: DisputeData
    ): Promise<void> => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        const result = await createOrderDispute(
          orderId,
          disputeData,
          accessToken
        );

        console.log('result', result);

        if (!result.success) {
          throw new Error(result.message);
        }

        setSuccess(
          result.message ||
            'Dispute submitted successfully! Our team will review it and contact you soon.'
        );
      } catch (error: any) {
        console.error('Error submitting dispute:', error);
        setError(
          error.message ||
            'Failed to submit dispute. Please try again later.'
        );
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken]
  );

  const resetState = useCallback(() => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  }, []);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      isSubmitting,
      error,
      success,
      submitDispute,
      resetState,
    }),
    [isSubmitting, error, success, submitDispute, resetState]
  );
};
