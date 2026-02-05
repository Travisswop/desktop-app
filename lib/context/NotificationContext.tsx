'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useUser } from '@/lib/UserContext';
import { io, Socket } from 'socket.io-client';
import {
  Notification,
  NotificationCategory,
  NotificationContextType,
  NotificationPreferences,
  SocketBadgeCountEvent,
  SocketNotificationEvent,
} from '@/types/notification';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markCategoryNotificationsAsRead,
  deleteNotification as deleteNotificationAction,
  getNotificationPreferences,
  updateNotificationPreferences as updatePreferencesAction,
  updateSpecificNotificationPreference,
} from '@/actions/notificationActions';
import { toast } from 'sonner';

const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { accessToken, user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  /**
   * Initialize Socket.IO connection for real-time notifications
   */
  useEffect(() => {
    if (!accessToken || !user || isConnectedRef.current) return;

    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    console.log('Initializing notification socket connection...');

    const socket = io(API_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Notification socket connected');
      isConnectedRef.current = true;
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Notification socket disconnected:', reason);
      isConnectedRef.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      isConnectedRef.current = false;
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(
        `🔄 Socket reconnected after ${attemptNumber} attempts`
      );
      isConnectedRef.current = true;
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(
        `🔄 Socket reconnection attempt ${attemptNumber}...`
      );
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error(
        '❌ Socket reconnection failed after all attempts'
      );
      isConnectedRef.current = false;
    });

    // Listen for new notifications
    socket.on('notification:new', (data: SocketNotificationEvent) => {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      toast(data.notification.title, {
        description: data.notification.body,
        action: data.notification.actionUrl
          ? {
              label: 'View',
              onClick: () => {
                if (data.notification.actionUrl) {
                  window.location.href = data.notification.actionUrl;
                }
              },
            }
          : undefined,
      });
    });

    // Listen for badge count updates
    socket.on(
      'notification:badge_count',
      (data: SocketBadgeCountEvent) => {
        console.log('Badge count updated:', data.count);
        setUnreadCount(data.count);
      }
    );

    // Listen for notification read events from other sessions
    socket.on('notification:read', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId
            ? { ...notif, isRead: true }
            : notif
        )
      );
    });

    // Listen for notification deleted events
    socket.on('notification:deleted', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId)
      );
    });

    // Listen for all notifications marked as read
    socket.on('notification:all_read', () => {
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    });

    // Listen for category marked as read
    socket.on('notification:category_read', ({ category }) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.category === category
            ? { ...notif, isRead: true }
            : notif
        )
      );
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up notification socket');
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [accessToken, user]);

  /**
   * Fetch notifications with pagination
   */
  const fetchNotifications = useCallback(
    async (page: number = 1, category?: NotificationCategory) => {
      if (!accessToken) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await getNotifications(
          accessToken,
          page,
          20,
          category
        );

        if (result.success) {
          if (page === 1) {
            setNotifications(result.notifications);
          } else {
            setNotifications((prev) => [
              ...prev,
              ...result.notifications,
            ]);
          }
          setCurrentPage(page);
          setHasMore(
            result.pagination.page < result.pagination.pages
          );
        } else {
          setError('Failed to fetch notifications');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching notifications:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken]
  );

  /**
   * Refresh unread count
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!accessToken) return;

    try {
      const result = await getUnreadCount(accessToken);
      if (result.success) {
        setUnreadCount(result.count);
      }
    } catch (err) {
      console.error('Error refreshing unread count:', err);
    }
  }, [accessToken]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!accessToken) return;

      try {
        const result = await markNotificationAsRead(
          accessToken,
          notificationId
        );

        if (result.success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              notif._id === notificationId
                ? { ...notif, isRead: true }
                : notif
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    },
    [accessToken]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!accessToken) return;

    try {
      const result = await markAllNotificationsAsRead(accessToken);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark all notifications as read');
    }
  }, [accessToken]);

  /**
   * Mark all notifications in category as read
   */
  const markCategoryAsRead = useCallback(
    async (category: NotificationCategory) => {
      if (!accessToken) return;

      try {
        const result = await markCategoryNotificationsAsRead(
          accessToken,
          category
        );

        if (result.success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.category === category
                ? { ...notif, isRead: true }
                : notif
            )
          );
          toast.success(
            `All ${category} notifications marked as read`
          );
        }
      } catch (err) {
        console.error('Error marking category as read:', err);
        toast.error('Failed to mark category notifications as read');
      }
    },
    [accessToken]
  );

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!accessToken) return;

      try {
        const result = await deleteNotificationAction(
          accessToken,
          notificationId
        );

        if (result.success) {
          setNotifications((prev) =>
            prev.filter((notif) => notif._id !== notificationId)
          );
          toast.success('Notification deleted');
        }
      } catch (err) {
        console.error('Error deleting notification:', err);
        toast.error('Failed to delete notification');
      }
    },
    [accessToken]
  );

  /**
   * Load more notifications
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchNotifications(currentPage + 1);
  }, [hasMore, isLoading, currentPage, fetchNotifications]);

  /**
   * Fetch notification preferences
   */
  const fetchPreferences = useCallback(async () => {
    if (!accessToken) return;

    try {
      const result = await getNotificationPreferences(accessToken);
      if (result.success) {
        setPreferences(result.preferences);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  }, [accessToken]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(
    async (newPreferences: NotificationPreferences) => {
      if (!accessToken) return;

      try {
        const result = await updatePreferencesAction(
          accessToken,
          newPreferences
        );

        if (result.success) {
          setPreferences(result.preferences);
          toast.success('Notification preferences updated');
        } else {
          toast.error('Failed to update preferences');
        }
      } catch (err) {
        console.error('Error updating preferences:', err);
        toast.error('Failed to update preferences');
      }
    },
    [accessToken]
  );

  /**
   * Update specific preference
   */
  const updateSpecificPreference = useCallback(
    async (
      category: string,
      type: string,
      channel: string,
      value: boolean
    ) => {
      if (!accessToken) return;

      try {
        const result = await updateSpecificNotificationPreference(
          accessToken,
          category,
          type,
          channel,
          value
        );

        if (result.success) {
          setPreferences(result.preferences);
        }
      } catch (err) {
        console.error('Error updating specific preference:', err);
      }
    },
    [accessToken]
  );

  // Initial data fetch
  useEffect(() => {
    if (accessToken && user) {
      fetchNotifications(1);
      refreshUnreadCount();
      fetchPreferences();
    }
  }, [accessToken, user]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    currentPage,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    markCategoryAsRead,
    deleteNotification,
    refreshUnreadCount,
    loadMore,
    preferences,
    fetchPreferences,
    updatePreferences,
    updateSpecificPreference,
    socketRef,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};
