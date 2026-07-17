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
  const userId = user?._id;
  const [notifications, setNotifications] = useState<Notification[]>(
    [],
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
  const tokenRef = useRef<string | null>(null);

  /**
   * Initialize Socket.IO connection for real-time notifications
   */
  useEffect(() => {
    if (!accessToken || !userId) return;

    if (socketRef.current && tokenRef.current === accessToken) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }

    tokenRef.current = accessToken;

    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const socket = io(API_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      // Cookies carry the ALB sticky-session cookie; without them the polling
      // fallback round-robins across API instances and 400s.
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      isConnectedRef.current = true;
    });

    socket.on('disconnect', (reason) => {
      isConnectedRef.current = false;
    });

    socket.on('connect_error', (error) => {
      isConnectedRef.current = false;
    });

    socket.on('reconnect', (attemptNumber) => {
      isConnectedRef.current = true;
    });

    socket.on('reconnect_attempt', (attemptNumber) => {});

    socket.on('reconnect_error', (error) => {});

    socket.on('reconnect_failed', () => {
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
        setUnreadCount(data.count);
      },
    );

    // Listen for notification read events from other sessions
    socket.on('notification:read', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId
            ? { ...notif, isRead: true }
            : notif,
        ),
      );
    });

    // Listen for notification deleted events
    socket.on('notification:deleted', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId),
      );
    });

    // Listen for all notifications marked as read
    socket.on('notification:all_read', () => {
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true })),
      );
      setUnreadCount(0);
    });

    // Listen for category marked as read
    socket.on('notification:category_read', ({ category }) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.category === category
            ? { ...notif, isRead: true }
            : notif,
        ),
      );
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current === socket) {
        socket.disconnect();
        socketRef.current = null;
        tokenRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [accessToken, userId]);

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
          category,
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
            result.pagination.page < result.pagination.pages,
          );
        } else {
          setError('Failed to fetch notifications');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken],
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
    } catch (err) {}
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
          notificationId,
        );

        if (result.success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              notif._id === notificationId
                ? { ...notif, isRead: true }
                : notif,
            ),
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {}
    },
    [accessToken],
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
          prev.map((notif) => ({ ...notif, isRead: true })),
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (err) {
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
          category,
        );

        if (result.success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.category === category
                ? { ...notif, isRead: true }
                : notif,
            ),
          );
          toast.success(
            `All ${category} notifications marked as read`,
          );
        }
      } catch (err) {
        toast.error('Failed to mark category notifications as read');
      }
    },
    [accessToken],
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
          notificationId,
        );

        if (result.success) {
          setNotifications((prev) =>
            prev.filter((notif) => notif._id !== notificationId),
          );
          toast.success('Notification deleted');
        }
      } catch (err) {
        toast.error('Failed to delete notification');
      }
    },
    [accessToken],
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
    } catch (err) {}
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
          newPreferences,
        );

        if (result.success) {
          setPreferences(result.preferences);
          toast.success('Notification preferences updated');
        } else {
          toast.error('Failed to update preferences');
        }
      } catch (err) {
        toast.error('Failed to update preferences');
      }
    },
    [accessToken],
  );

  /**
   * Update specific preference
   */
  const updateSpecificPreference = useCallback(
    async (
      category: string,
      type: string,
      channel: string,
      value: boolean,
    ) => {
      if (!accessToken) return;

      try {
        const result = await updateSpecificNotificationPreference(
          accessToken,
          category,
          type,
          channel,
          value,
        );

        if (result.success) {
          setPreferences(result.preferences);
        }
      } catch (err) {}
    },
    [accessToken],
  );

  // Initial data fetch
  useEffect(() => {
    if (accessToken && userId) {
      void fetchNotifications(1);
      void refreshUnreadCount();
      void fetchPreferences();
    }
  }, [
    accessToken,
    userId,
    fetchNotifications,
    refreshUnreadCount,
    fetchPreferences,
  ]);

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
      'useNotifications must be used within a NotificationProvider',
    );
  }
  return context;
};
