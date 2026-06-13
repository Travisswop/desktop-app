'use client';

import React, { useEffect } from 'react';
import { Check, CheckCheck, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNotifications } from '@/lib/context/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { NotificationCategory } from '@/types/notification';

interface NotificationCenterProps {
  onClose?: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const {
    notifications,
    isLoading,
    hasMore,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
    loadMore,
  } = useNotifications();

  const [activeTab, setActiveTab] = React.useState<'all' | NotificationCategory>('all');

  useEffect(() => {
    // Refresh notifications when opened
    if (activeTab === 'all') {
      fetchNotifications(1);
    } else {
      fetchNotifications(1, activeTab as NotificationCategory);
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'all' | NotificationCategory);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const filteredNotifications =
    activeTab === 'all'
      ? notifications
      : notifications.filter((n) => n.category === activeTab);

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Tabs for categories */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start h-auto flex-wrap">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs">
              Wallet
            </TabsTrigger>
            <TabsTrigger value="commerce" className="text-xs">
              Orders
            </TabsTrigger>
            <TabsTrigger value="messaging" className="text-xs">
              Messages
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs">
              Social
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs">
              System
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center p-4">
            <Check className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              When you get notifications, they'll show up here
            </p>
          </div>
        ) : (
          <div className="group">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onClose={onClose}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                window.location.href = '/notifications';
                onClose?.();
              }}
            >
              View All Notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
