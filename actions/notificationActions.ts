'use server';

import {
  Notification,
  NotificationCategory,
  NotificationCountResponse,
  NotificationListResponse,
  NotificationPreferences,
  NotificationPreferencesResponse,
} from '@/types/notification';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Get user notifications with pagination
 */
export async function getNotifications(
  accessToken: string,
  page: number = 1,
  limit: number = 20,
  category?: NotificationCategory,
  isRead?: boolean
): Promise<NotificationListResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (category) {
      params.append('category', category);
    }

    if (isRead !== undefined) {
      params.append('isRead', isRead.toString());
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return {
      success: false,
      notifications: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
    };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(
  accessToken: string
): Promise<NotificationCountResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/unread-count`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch unread count');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return {
      success: false,
      count: 0,
      categoryCounts: [],
    };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  accessToken: string,
  notificationId: string
): Promise<{ success: boolean; notification?: Notification }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/${notificationId}/read`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { success: false };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  accessToken: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/mark-all-read`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { success: false };
  }
}

/**
 * Mark all notifications in category as read
 */
export async function markCategoryNotificationsAsRead(
  accessToken: string,
  category: NotificationCategory
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/mark-category-read`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ category }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to mark category notifications as read');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error marking category notifications as read:', error);
    return { success: false };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(
  accessToken: string,
  notificationId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/${notificationId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return { success: false };
  }
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(
  accessToken: string
): Promise<NotificationPreferencesResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/preferences`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch notification preferences');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    return {
      success: false,
      preferences: {} as NotificationPreferences,
    };
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  accessToken: string,
  preferences: NotificationPreferences
): Promise<NotificationPreferencesResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/preferences`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ preferences }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update notification preferences');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return {
      success: false,
      preferences: {} as NotificationPreferences,
    };
  }
}

/**
 * Update specific preference
 */
export async function updateSpecificNotificationPreference(
  accessToken: string,
  category: string,
  type: string,
  channel: string,
  value: boolean
): Promise<NotificationPreferencesResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/preferences`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ category, type, channel, value }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update notification preference');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error updating notification preference:', error);
    return {
      success: false,
      preferences: {} as NotificationPreferences,
    };
  }
}

/**
 * Send test notification (for development)
 */
export async function sendTestNotification(
  accessToken: string,
  type: string,
  title: string,
  body: string
): Promise<{ success: boolean; notification?: Notification }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v5/notifications/test`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type, title, body }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return { success: false };
  }
}
