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
      console.log('submitDispute called with:', {
        orderId,
        disputeData,
      });

      if (!accessToken) {
        console.error('No access token available');
        throw new Error('Authentication required');
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        console.log('Calling createOrderDispute...');
        const result = await createOrderDispute(
          orderId,
          disputeData,
          accessToken
        );

        console.log('createOrderDispute result:', result);

        // Check if result is undefined or null
        if (!result) {
          console.error('createOrderDispute returned undefined/null');
          throw new Error(
            'Failed to submit dispute - no response received'
          );
        }

        // Check if result has the expected structure
        if (typeof result.success === 'undefined') {
          console.error(
            'createOrderDispute returned invalid structure:',
            result
          );
          throw new Error(
            'Failed to submit dispute - invalid response format'
          );
        }

        if (!result.success) {
          console.error('Dispute submission failed:', result.message);
          throw new Error(
            result.message || 'Failed to submit dispute'
          );
        }

        console.log('Dispute submitted successfully');
        setSuccess(
          result.message ||
            'Dispute submitted successfully! Our team will review it and contact you soon.'
        );
      } catch (error: any) {
        console.error('Error submitting dispute:', error);
        console.error('Error type:', typeof error);
        console.error('Error message:', error?.message);

        const errorMessage =
          error?.message ||
          'Failed to submit dispute. Please try again later.';
        setError(errorMessage);
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
