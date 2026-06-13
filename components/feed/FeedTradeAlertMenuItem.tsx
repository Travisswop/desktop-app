"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type FeedLike = {
  userId?: string | { _id?: string } | null;
  smartsiteId?: string | { _id?: string } | null;
  smartsiteDetails?: { _id?: string } | null;
  viewerFollowsAuthor?: boolean;
  viewerTradeNotificationsEnabled?: boolean;
  isFollowing?: boolean;
  tradeNotificationsEnabled?: boolean;
};

type FeedTradeAlertMenuItemProps = {
  feed: FeedLike;
  accessToken: string;
  onChange?: (enabled: boolean) => void;
};

const toIdString = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value) {
    return toIdString((value as { _id?: unknown })._id);
  }
  return "";
};

export const getFeedAuthorUserId = (feed?: FeedLike | null) =>
  toIdString(feed?.userId);

export const getFeedSmartsiteId = (feed?: FeedLike | null) =>
  toIdString(feed?.smartsiteDetails?._id || feed?.smartsiteId);

export const isFeedAuthorSelf = (
  feed?: FeedLike | null,
  userId?: string | null,
) => Boolean(userId && getFeedAuthorUserId(feed) === userId);

export const shouldShowTradeAlertMenuItem = (
  feed?: FeedLike | null,
  userId?: string | null,
  accessToken?: string | null,
) => {
  if (!feed || !userId || !accessToken || !API_URL) return false;
  if (isFeedAuthorSelf(feed, userId)) return false;
  if (!getFeedSmartsiteId(feed)) return false;
  return Boolean(feed.viewerFollowsAuthor ?? feed.isFollowing);
};

export default function FeedTradeAlertMenuItem({
  feed,
  accessToken,
  onChange,
}: FeedTradeAlertMenuItemProps) {
  const { toast } = useToast();
  const smartsiteId = useMemo(() => getFeedSmartsiteId(feed), [feed]);
  const [enabled, setEnabled] = useState(
    Boolean(
      feed.viewerTradeNotificationsEnabled ?? feed.tradeNotificationsEnabled,
    ),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEnabled(
      Boolean(
        feed.viewerTradeNotificationsEnabled ?? feed.tradeNotificationsEnabled,
      ),
    );
  }, [feed.viewerTradeNotificationsEnabled, feed.tradeNotificationsEnabled]);

  const handleToggle = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (!API_URL || !smartsiteId || loading) return;

      const nextEnabled = !enabled;
      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/v4/user/trade-notifications`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            smartsiteId,
            enabled: nextEnabled,
          }),
        });
        const json = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(json?.message || "Could not update trade alerts.");
        }

        const confirmedEnabled = Boolean(json?.enabled ?? nextEnabled);
        setEnabled(confirmedEnabled);
        onChange?.(confirmedEnabled);
        toast({
          title: confirmedEnabled ? "Trade alerts on" : "Trade alerts off",
          description: confirmedEnabled
            ? "You will be notified when this trader posts a trade."
            : "Trade alerts are off for this trader.",
        });
      } catch (error) {
        toast({
          title: "Could not update trade alerts",
          description:
            error instanceof Error
              ? error.message
              : "Please try again from the feed.",
        });
      } finally {
        setLoading(false);
      }
    },
    [accessToken, enabled, loading, onChange, smartsiteId, toast],
  );

  const Icon = enabled ? Bell : BellOff;

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-700"
      disabled={!smartsiteId || loading}
      aria-pressed={enabled}
      onClick={handleToggle}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {enabled ? "Turn off trade alerts" : "Turn on trade alerts"}
    </button>
  );
}
