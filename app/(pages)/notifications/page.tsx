"use client";

import React, { useEffect } from "react";
import { Check, CheckCheck, Loader, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/lib/context/NotificationContext";
import { NotificationCategory } from "@/types/notification";
import { NotificationItem } from "@/components/notifications";

interface NotificationCenterProps {
  onClose?: () => void;
}

function NotificationPage({ onClose }: NotificationCenterProps) {
  const {
    notifications,
    isLoading,
    hasMore,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
    loadMore,
  } = useNotifications();

  const [activeTab, setActiveTab] = React.useState<
    "all" | NotificationCategory
  >("all");

  useEffect(() => {
    // Refresh notifications when opened
    if (activeTab === "all") {
      fetchNotifications(1);
    } else {
      fetchNotifications(1, activeTab as NotificationCategory);
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as "all" | NotificationCategory);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.category === activeTab);

  return (
    <div className="flex flex-col bg-white rounded-t-xl">
      {/* Header */}
      <div className="bg-white border-b sticky top-[97px] z-10 rounded-t-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-2xl text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  You have {unreadCount} unread notification
                  {unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-sm font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Tabs for categories */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full justify-start h-auto flex-wrap bg-gray-100 p-1 rounded-lg">
              <TabsTrigger
                value="all"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="wallet"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Wallet
              </TabsTrigger>
              <TabsTrigger
                value="commerce"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger
                value="messaging"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Messages
              </TabsTrigger>
              <TabsTrigger
                value="social"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Social
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                System
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1 px-4 py-2">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center flex items-center gap-2">
              <p className="text-gray-600 font-medium">Loading notifications</p>
              <Loader className="h-7 w-7 animate-spin" />
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <Check className="h-12 w-12 text-gray-400" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">All caught up!</h4>
            <p className="text-sm text-gray-500 max-w-xs">
              {` You don't have any notifications right now. When you get
              notifications, they'll appear here.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4 group">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onClose={onClose}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="pt-4">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="w-full bg-gray-100 py-2.5 text-sm font-medium rounded-xl flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      Loading more...
                      <Loader className="h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    "Load More Notifications"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {/* {notifications.length > 0 && (
        <div className="bg-white border-t">
          <div className="p-4">
            <Button
              variant="ghost"
              size="default"
              className="w-full text-sm font-medium hover:bg-gray-100 transition-colors"
              onClick={() => {
                window.location.href = "/notifications";
                onClose?.();
              }}
            >
              View All Notifications
            </Button>
          </div>
        </div>
      )} */}
    </div>
  );
}

export default NotificationPage;
