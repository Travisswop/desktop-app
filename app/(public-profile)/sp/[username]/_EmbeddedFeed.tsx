"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useModalStore } from "@/zustandStore/modalstore";
import InfiniteScroll from "react-infinite-scroll-component";
// import { FeedMainComponentLoading } from "@/components/loading/TabSwitcherLoading";
import FeedLoading from "@/components/loading/FeedLoading";
import FeedItem from "@/components/feed/FeedItem";
import logger from "@/utils/logger";
// import logger from "@/utils/logger";
import { apiFetch } from "@/lib/api/apiFetch";
import {
  getFeedItemKey,
  mergeFreshFeedItems,
  mergeUniqueFeedItems,
} from "@/components/feed/feedPagination";

dayjs.extend(relativeTime);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EmbeddedFeed({
  accessToken,
  userId,
  micrositeId,
  isOrderPreview = false,
}: {
  accessToken: string;
  userId: string;
  initialFeedData?: any;
  micrositeId: string;
  isOrderPreview?: boolean;
}) {
  const feedRefetchTrigger = useModalStore((s) => s.feedRefetchTrigger);
  // logger.info("Feed feedRefetchTrigger", feedRefetchTrigger);

  const [feedData, setFeedData] = useState<any[]>([]);

  const [hasMore, setHasMore] = useState(true);
  logger.info("Feed component rendered with initial feedData:", feedData);
  // logger.info("Feed component rendered with initial hasMore:", hasMore);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchFeedData = useCallback(
    async (reset = false) => {
      // console.log("reset", reset);

      if (!micrositeId) {
        setFeedData([]);
        setHasMore(false);
        return;
      }
      if (!reset && !hasMoreRef.current) return;
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;

      try {
        const currentPage = reset ? 1 : pageRef.current;
        const query = new URLSearchParams({
          page: String(currentPage),
          limit: "10",
        });
        if (userId) query.set("userId", userId);

        const url = `${API_URL}/api/v2/feed/smartsite-feed/${micrositeId}?${query.toString()}`;
        logger.info("Fetching feed data from URL:", url);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (accessToken) {
          headers.authorization = `Bearer ${accessToken}`;
        }

        const response = await apiFetch(url, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        const data = await response.json();
        const feedItems = data?.data ?? [];

        if (reset) {
          setFeedData(mergeFreshFeedItems(feedItems, []));
          pageRef.current = 2;
          setHasMore(data?.pagination?.totalPages > 1);
        } else {
          setFeedData((prev) => mergeUniqueFeedItems(prev, feedItems));
          pageRef.current += 1;

          // ✅ safer logic
          setHasMore(pageRef.current <= data?.pagination?.totalPages);
        }
    } catch (error) {
      console.error(error);
      setHasMore(false);
    } finally {
      isFetchingRef.current = false;
    }
  },
    [accessToken, micrositeId, userId],
  );

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchFeedData(true);
  }, [fetchFeedData]);

  // refetch trigger
  useEffect(() => {
    if (feedRefetchTrigger === 0) return;

    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchFeedData(true);
  }, [feedRefetchTrigger, fetchFeedData]);

  const feedItems = isOrderPreview ? feedData.slice(0, 3) : feedData;
  const feedContent = feedItems.map((feed: any, index: number) => (
    <div
      key={`embedded-feed-item-${index}-${getFeedItemKey(feed) || "no-id"}`}
    >
      <FeedItem
        feed={feed}
        userId={userId}
        accessToken={accessToken}
        onRepostSuccess={() => {}}
        onDeleteSuccess={() => {
          pageRef.current = 1;
          hasMoreRef.current = true;
          setHasMore(true);
          fetchFeedData(true);
        }}
        onPostInteraction={() => {}}
      />
    </div>
  ));

  return (
    <div
      className={`w-full flex flex-col gap-4 bg-white rounded-lg p-4 ${
        isOrderPreview
          ? "max-h-[34rem] overflow-hidden"
          : "h-[40rem] overflow-auto hide-scrollbar"
      }`}
    >
      {isOrderPreview ? (
        <div className="flex flex-col gap-4">
          {feedItems.length > 0 ? feedContent : <FeedLoading />}
        </div>
      ) : (
        <InfiniteScroll
          dataLength={feedData.length}
          next={() => fetchFeedData(false)}
          hasMore={hasMore}
          loader={<FeedLoading />}
          endMessage={
            <p className="text-center text-sm text-gray-500">No more posts</p>
          }
          className=""
        >
          {feedContent}
        </InfiniteScroll>
      )}
    </div>
  );
}
