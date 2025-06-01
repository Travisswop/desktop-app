import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import { getSellerNotificationCount } from '@/actions/disputeActions';

interface NotificationCounts {
  pendingDisputes: number;
  pendingChallenges: number;
  totalNotifications: number;
}

interface Notification {
  id: string;
  type: 'dispute_created' | 'challenge_response' | 'dispute_resolved';
  orderId: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface UseSellerNotificationsReturn {
  notificationCounts: NotificationCounts;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

export const useSellerNotifications =
  (): UseSellerNotificationsReturn => {
    const { accessToken, user } = useUser();
    const [notificationCounts, setNotificationCounts] =
      useState<NotificationCounts>({
        pendingDisputes: 0,
        pendingChallenges: 0,
        totalNotifications: 0,
      });
    const [notifications, setNotifications] = useState<
      Notification[]
    >([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch notification counts from API
    const fetchNotificationCounts = useCallback(async () => {
      if (!accessToken || !user) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await getSellerNotificationCount(accessToken);
        if (result.success && result.counts) {
          setNotificationCounts(result.counts);
        } else {
          setError(result.message || 'Failed to fetch notifications');
        }
      } catch (error: any) {
        console.error('Error fetching notification counts:', error);
        setError(error.message || 'Failed to fetch notifications');
      } finally {
        setIsLoading(false);
      }
    }, [accessToken, user]);

    // Refresh notifications
    const refreshNotifications = useCallback(async () => {
      await fetchNotificationCounts();
    }, [fetchNotificationCounts]);

    // Mark notification as read
    const markAsRead = useCallback((notificationId: string) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Update counts
      setNotificationCounts((prev) => ({
        ...prev,
        totalNotifications: Math.max(0, prev.totalNotifications - 1),
      }));
    }, []);

    // Clear all notifications
    const clearAllNotifications = useCallback(() => {
      setNotifications([]);
      setNotificationCounts({
        pendingDisputes: 0,
        pendingChallenges: 0,
        totalNotifications: 0,
      });
    }, []);

    // Initial fetch and periodic refresh
    useEffect(() => {
      fetchNotificationCounts();

      // Set up periodic refresh every 30 seconds
      const interval = setInterval(fetchNotificationCounts, 30000);

      return () => clearInterval(interval);
    }, [fetchNotificationCounts]);

    // Simulate real-time notification (in a real app, this would be WebSocket)
    useEffect(() => {
      if (!accessToken || !user) return;

      // In a real implementation, you would set up WebSocket connection here
      // const socket = io(process.env.NEXT_PUBLIC_API_URL);
      // socket.emit('join_seller_room', user._id);

      // socket.on('new_dispute', (data) => {
      //   const newNotification: Notification = {
      //     id: data.disputeId,
      //     type: 'dispute_created',
      //     orderId: data.orderId,
      //     message: `New dispute: ${data.reason}`,
      //     timestamp: new Date(data.timestamp),
      //     isRead: false,
      //   };

      //   setNotifications(prev => [newNotification, ...prev]);
      //   setNotificationCounts(prev => ({
      //     ...prev,
      //     pendingDisputes: prev.pendingDisputes + 1,
      //     totalNotifications: prev.totalNotifications + 1,
      //   }));

      //   // Show toast notification
      //   toast.info(`New dispute received for Order #${data.orderId}`);
      // });

      // return () => {
      //   socket.disconnect();
      // };
    }, [accessToken, user]);

    return {
      notificationCounts,
      notifications,
      isLoading,
      error,
      refreshNotifications,
      markAsRead,
      clearAllNotifications,
    };
  };
