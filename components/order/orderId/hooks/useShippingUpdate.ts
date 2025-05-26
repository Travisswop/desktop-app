import { useState } from 'react';
import { useUser } from '@/lib/UserContext';
import { ShippingUpdateData } from '../types/order.types';

interface UseShippingUpdateReturn {
  isUpdateModalOpen: boolean;
  isUpdating: boolean;
  updateError: string | null;
  updateSuccess: string | null;
  shippingData: ShippingUpdateData;
  setIsUpdateModalOpen: (open: boolean) => void;
  setShippingData: (data: ShippingUpdateData) => void;
  handleShippingUpdate: (
    orderId: string,
    onSuccess?: () => void
  ) => Promise<void>;
  resetUpdateState: () => void;
}

export const useShippingUpdate = (
  initialShippingData?: Partial<ShippingUpdateData>
): UseShippingUpdateReturn => {
  const { accessToken } = useUser();

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(
    null
  );
  const [shippingData, setShippingData] =
    useState<ShippingUpdateData>({
      deliveryStatus: 'Not Initiated',
      trackingNumber: '',
      shippingProvider: '',
      estimatedDeliveryDate: '',
      additionalNotes: '',
      ...initialShippingData,
    });

  const handleShippingUpdate = async (
    orderId: string,
    onSuccess?: () => void
  ) => {
    if (!orderId || !accessToken) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API base URL is not defined.');
      }

      const response = await fetch(
        `${API_URL}/api/v5/orders/${orderId}/shipping`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(shippingData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`${result.message}`);
      }

      setUpdateSuccess('Shipping information updated successfully!');

      // Call success callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          setIsUpdateModalOpen(false);
          setUpdateSuccess(null);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Update Error:', error);
      setUpdateError(
        error.message || 'An unexpected error occurred.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const resetUpdateState = () => {
    setUpdateError(null);
    setUpdateSuccess(null);
    setIsUpdating(false);
  };

  return {
    isUpdateModalOpen,
    isUpdating,
    updateError,
    updateSuccess,
    shippingData,
    setIsUpdateModalOpen,
    setShippingData,
    handleShippingUpdate,
    resetUpdateState,
  };
};
