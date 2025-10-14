// Notification types
export type NotificationType =
  // Wallet & Blockchain
  | 'token_received'
  | 'nft_received'
  | 'token_sent'
  | 'nft_sent'
  | 'swap_completed'
  | 'swap_failed'
  // Social Engagement
  | 'lead_received'
  | 'like_received'
  | 'comment_received'
  | 'follower_received'
  // Messaging
  | 'message_received'
  | 'group_message_received'
  // E-commerce
  | 'product_sold'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'order_confirmed'
  | 'order_processing'
  | 'order_shipped'
  | 'order_out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_refunded'
  // Disputes
  | 'dispute_created'
  | 'dispute_resolved'
  | 'challenge_received';

export type NotificationCategory =
  | 'wallet'
  | 'social'
  | 'commerce'
  | 'messaging'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data: Record<string, any>;
  isRead: boolean;
  isPushSent: boolean;
  pushSentAt: string | null;
  priority: NotificationPriority;
  actionUrl: string | null;
  imageUrl: string | null;
  expiresAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceChannel {
  push: boolean;
  inApp: boolean;
  email?: boolean;
}

export interface NotificationPreferences {
  wallet: {
    tokenReceive: NotificationPreferenceChannel;
    tokenSend: NotificationPreferenceChannel;
    nftReceive: NotificationPreferenceChannel;
    nftSend: NotificationPreferenceChannel;
    swap: NotificationPreferenceChannel;
  };
  social: {
    leads: NotificationPreferenceChannel;
    likes: NotificationPreferenceChannel;
    comments: NotificationPreferenceChannel;
    followers: NotificationPreferenceChannel;
  };
  commerce: {
    productSold: NotificationPreferenceChannel & { email: boolean };
    paymentConfirm: NotificationPreferenceChannel & { email: boolean };
    orderUpdates: NotificationPreferenceChannel & { email: boolean };
  };
  messaging: {
    directMessages: NotificationPreferenceChannel;
    groupMessages: NotificationPreferenceChannel;
    mutedConversations: string[];
  };
  system: {
    disputes: NotificationPreferenceChannel & { email: boolean };
    announcements: NotificationPreferenceChannel;
  };
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: Notification[];
  pagination: NotificationPagination;
}

export interface NotificationCountResponse {
  success: boolean;
  count: number;
  categoryCounts: {
    _id: NotificationCategory;
    count: number;
  }[];
}

export interface NotificationPreferencesResponse {
  success: boolean;
  preferences: NotificationPreferences;
}

// Socket.IO event types
export interface SocketNotificationEvent {
  notification: Notification;
}

export interface SocketBadgeCountEvent {
  count: number;
}

export interface SocketNotificationReadEvent {
  notificationId: string;
}

export interface SocketNotificationDeletedEvent {
  notificationId: string;
}

export interface SocketNotificationCategoryReadEvent {
  category: NotificationCategory;
}

// Context types
export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;

  // Actions
  fetchNotifications: (page?: number, category?: NotificationCategory) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markCategoryAsRead: (category: NotificationCategory) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Preferences
  preferences: NotificationPreferences | null;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
  updateSpecificPreference: (
    category: string,
    type: string,
    channel: string,
    value: boolean
  ) => Promise<void>;

  // Socket connection
  socketRef: React.MutableRefObject<any>;
}

// Notification icon mapping
export type NotificationIconType =
  | 'wallet'
  | 'nft'
  | 'swap'
  | 'like'
  | 'comment'
  | 'follower'
  | 'lead'
  | 'message'
  | 'order'
  | 'payment'
  | 'dispute'
  | 'system';
