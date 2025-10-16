'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Image as ImageIcon,
  ArrowLeftRight,
  Heart,
  MessageCircle,
  UserPlus,
  Mail,
  ShoppingBag,
  CreditCard,
  Package,
  AlertTriangle,
  Bell,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/types/notification';
import { useNotifications } from '@/lib/context/NotificationContext';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

// Icon mapping for notification types
const getNotificationIcon = (type: NotificationType) => {
  const iconMap: Record<NotificationType, React.ReactNode> = {
    // Wallet
    token_received: <Wallet className="h-5 w-5 text-green-500" />,
    nft_received: <ImageIcon className="h-5 w-5 text-purple-500" />,
    token_sent: <Wallet className="h-5 w-5 text-blue-500" />,
    nft_sent: <ImageIcon className="h-5 w-5 text-blue-500" />,
    swap_completed: <ArrowLeftRight className="h-5 w-5 text-green-500" />,
    swap_failed: <ArrowLeftRight className="h-5 w-5 text-red-500" />,
    // Social
    lead_received: <Mail className="h-5 w-5 text-orange-500" />,
    like_received: <Heart className="h-5 w-5 text-pink-500" />,
    comment_received: <MessageCircle className="h-5 w-5 text-blue-500" />,
    follower_received: <UserPlus className="h-5 w-5 text-green-500" />,
    // Messaging
    message_received: <MessageCircle className="h-5 w-5 text-blue-500" />,
    group_message_received: <MessageCircle className="h-5 w-5 text-purple-500" />,
    // Commerce
    product_sold: <ShoppingBag className="h-5 w-5 text-green-500" />,
    payment_confirmed: <CreditCard className="h-5 w-5 text-green-500" />,
    payment_failed: <CreditCard className="h-5 w-5 text-red-500" />,
    order_created: <Package className="h-5 w-5 text-blue-500" />,
    order_confirmed: <Package className="h-5 w-5 text-blue-500" />,
    order_processing: <Package className="h-5 w-5 text-yellow-500" />,
    order_shipped: <Package className="h-5 w-5 text-blue-500" />,
    order_out_for_delivery: <Package className="h-5 w-5 text-purple-500" />,
    order_delivered: <Package className="h-5 w-5 text-green-500" />,
    order_cancelled: <Package className="h-5 w-5 text-gray-500" />,
    order_refunded: <Package className="h-5 w-5 text-orange-500" />,
    order_completed: <Package className="h-5 w-5 text-green-500" />,
    nft_minted: <ImageIcon className="h-5 w-5 text-purple-500" />,
    funds_released: <Wallet className="h-5 w-5 text-green-500" />,
    // Disputes
    dispute_created: <AlertTriangle className="h-5 w-5 text-red-500" />,
    dispute_resolved: <AlertTriangle className="h-5 w-5 text-green-500" />,
    challenge_received: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  };

  return iconMap[type] || <Bell className="h-5 w-5 text-gray-500" />;
};

export function NotificationItem({
  notification,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead, deleteNotification } = useNotifications();

  const handleClick = async () => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate to action URL if exists
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose?.();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notification._id);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-b-0',
        !notification.isRead && 'bg-accent/30'
      )}
      onClick={handleClick}
    >
      {/* Icon or Image */}
      <div className="flex-shrink-0 mt-1">
        {notification.imageUrl ? (
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.imageUrl} />
            <AvatarFallback>
              {getNotificationIcon(notification.type)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full bg-background border flex items-center justify-center">
            {getNotificationIcon(notification.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm font-medium leading-tight',
                !notification.isRead && 'font-semibold'
              )}
            >
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {notification.body}
            </p>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {!notification.isRead && (
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          )}
          {notification.priority === 'urgent' && (
            <span className="text-xs text-red-500 font-medium">Urgent</span>
          )}
        </div>
      </div>
    </div>
  );
}
