import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@/lib/UserContext';
import {
  OrderData,
  NFT,
  ProcessingStage,
  UserRole,
} from '../types/order.types';
import { stageDisplayNames } from '../constants/order.constants';

interface UseOrderDataReturn {
  order: OrderData | null;
  nfts: NFT[] | null;
  userRole: UserRole;
  isLoading: boolean;
  isError: string | null;
  isCompleted: boolean;
  processingStages: ProcessingStage[];
  refetchOrder: () => Promise<void>;
}

export const useOrderData = (orderId: string): UseOrderDataReturn => {
  const { user, accessToken } = useUser();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [nfts, setNfts] = useState<NFT[] | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('buyer');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [processingStages, setProcessingStages] = useState<
    ProcessingStage[]
  >([]);

  // Memoize user ID to prevent unnecessary re-renders
  const userId = useMemo(() => user?._id, [user?._id]);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId || !accessToken || !userId) return;

    setIsLoading(true);
    setIsError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API base URL is not defined.');
      }

      const response = await fetch(
        `${API_URL}/api/v5/orders/${orderId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch order data. Status: ${response.status}`
        );
      }

      const { data } = await response.json();
      setOrder(data);

      const nfts = data.mintedNfts.map((nft: any) => ({
        ...nft.nftTemplateId,
        quantity: nft.quantity,
      }));

      setNfts(nfts);
      setUserRole(userId === data.seller.id ? 'seller' : 'buyer');

      const filterProcessing = data.processingStages.filter(
        (item: any) =>
          Object.keys(stageDisplayNames).includes(item.stage)
      );

      setProcessingStages(filterProcessing);

      const findCompleteStatus = data.processingStages.find(
        (item: any) =>
          item.stage === 'completed' && item.status === 'completed'
      );

      setIsCompleted(!!findCompleteStatus);
    } catch (error: any) {
      console.error('Fetch Error:', error);
      setIsError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, accessToken, userId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Memoize refetchOrder function to prevent unnecessary re-renders
  const refetchOrder = useCallback(() => {
    return fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      order,
      nfts,
      userRole,
      isLoading,
      isError,
      isCompleted,
      processingStages,
      refetchOrder,
    }),
    [
      order,
      nfts,
      userRole,
      isLoading,
      isError,
      isCompleted,
      processingStages,
      refetchOrder,
    ]
  );
};
