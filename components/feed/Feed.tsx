"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FeedMainComponentLoading } from "../loading/TabSwitcherLoading";
import FeedLoading from "../loading/FeedLoading";
import FeedItem from "./FeedItem";
import { useModalStore } from "@/zustandStore/modalstore";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  FEED_PAGE_LIMIT,
  filterDuplicateLegacyPerpsItems,
  getFeedItemKey,
  mergeFreshFeedItems,
  mergeUniqueFeedItems,
  shouldFetchAnotherFeedPage,
} from "./feedPagination";
// import logger from "@/utils/logger";

dayjs.extend(relativeTime);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Feed({
  accessToken,
  userId,
  initialFeedData,
}: {
  accessToken: string;
  userId: string;
  initialFeedData?: any;
}) {
  const initialArray = filterDuplicateLegacyPerpsItems(
    Array.isArray(initialFeedData?.data) ? initialFeedData.data : [],
  );
  const initialTotalPages = initialFeedData?.pagination?.totalPages ?? 1;
  const initialHasMore =
    initialArray.length === 0 || initialTotalPages > 1;

  const feedRefetchTrigger = useModalStore((s) => s.feedRefetchTrigger);
  const createdFeedItem = useModalStore((s) => s.createdFeedItem);
  const clearCreatedFeedItem = useModalStore((s) => s.clearCreatedFeedItem);
  // logger.info("Feed feedRefetchTrigger", feedRefetchTrigger);

  const [feedData, setFeedData] = useState(initialArray);
  const [initialLoading, setInitialLoading] = useState(
    initialArray.length === 0,
  );

  const [hasMore, setHasMore] = useState(initialHasMore);
  // logger.info("Feed component rendered with initial feedData:", feedData);
  // logger.info("Feed component rendered with initial hasMore:", hasMore);

  const pageRef = useRef(initialArray.length > 0 ? 2 : 1);
  const hasMoreRef = useRef(initialHasMore);
  const isFetchingRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setHasMoreValue = useCallback((value: boolean) => {
    hasMoreRef.current = value;
    setHasMore(value);
  }, []);

  const fetchFeedData = useCallback(
    async (
      reset = false,
      options: { preserveLoadedItems?: boolean } = {},
    ) => {
      if (!userId || !accessToken) return;
      if (!reset && !hasMoreRef.current) return;
      if (isFetchingRef.current) {
        if (!reset) return;
        abortControllerRef.current?.abort();
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      isFetchingRef.current = true;

      try {
        const currentPage = reset ? 1 : pageRef.current;

        const url = `${API_URL}/api/v2/feed/user/connect/${userId}?page=${currentPage}&limit=${FEED_PAGE_LIMIT}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch feed page ${currentPage}`);
        }

        const data = await response.json();
        if (requestId !== requestIdRef.current) return;

        const feedItems = Array.isArray(data?.data)
          ? filterDuplicateLegacyPerpsItems(data.data)
          : [];
        const nextHasMore = shouldFetchAnotherFeedPage({
          requestedPage: currentPage,
          returnedCount: feedItems.length,
          pageSize: FEED_PAGE_LIMIT,
          totalPages: data?.pagination?.totalPages,
        });

        if (reset) {
          if (options.preserveLoadedItems) {
            setFeedData((prev: any[]) =>
              filterDuplicateLegacyPerpsItems(
                mergeFreshFeedItems(feedItems, prev),
              ),
            );
            pageRef.current = Math.max(pageRef.current, 2);
            setHasMoreValue(nextHasMore || hasMoreRef.current);
          } else {
            setFeedData(
              filterDuplicateLegacyPerpsItems(
                mergeUniqueFeedItems([], feedItems),
              ),
            );
            pageRef.current = 2;
            setHasMoreValue(nextHasMore);
          }
        } else {
          setFeedData((prev: any[]) =>
            filterDuplicateLegacyPerpsItems(
              mergeUniqueFeedItems(prev, feedItems),
            ),
          );
          pageRef.current = currentPage + 1;
          setHasMoreValue(nextHasMore);
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        console.error(error);
        setHasMoreValue(false);
      } finally {
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false;
          abortControllerRef.current = null;
          setInitialLoading(false);
        }
      }
    },
    [userId, accessToken, setHasMoreValue],
  );

  // initial load
  useEffect(() => {
    if (initialArray.length === 0) {
      fetchFeedData();
    }
  }, [fetchFeedData, initialArray.length]);

  // refetch trigger
  useEffect(() => {
    if (feedRefetchTrigger === 0) return;

    fetchFeedData(true, { preserveLoadedItems: true });
  }, [feedRefetchTrigger, fetchFeedData]);

  useEffect(() => {
    if (!createdFeedItem) return;

    setFeedData((prev: any[]) =>
      filterDuplicateLegacyPerpsItems(
        mergeFreshFeedItems([createdFeedItem], prev),
      ),
    );
    clearCreatedFeedItem();
  }, [createdFeedItem, clearCreatedFeedItem]);

  const handlePostInteraction = useCallback(
    (postId: string, updates: Record<string, unknown>) => {
      setFeedData((prev: any[]) =>
        prev.map((item) =>
          getFeedItemKey(item) === postId ? { ...item, ...updates } : item,
        ),
      );
    },
    [],
  );

  if (initialLoading) {
    return (
      <div className="w-full sm:w-[520px]">
        <FeedMainComponentLoading />
      </div>
    );
  }

  return (
    <div className="w-full flex gap-10">
      <div className="w-full flex flex-col gap-4">
        <InfiniteScroll
          dataLength={feedData.length}
          next={() => fetchFeedData(false)}
          hasMore={hasMore}
          scrollThreshold="160px"
          loader={<FeedLoading />}
          endMessage={
            <p className="text-center text-sm text-gray-500">No more posts</p>
          }
        >
          {feedData.map((feed: any, index: number) => {
            const feedKey =
              getFeedItemKey(feed) ||
              `${feed?.postType || "feed"}-${feed?.createdAt || index}`;

            return (
              <FeedItem
                key={feedKey}
                feed={feed}
                userId={userId}
                accessToken={accessToken}
                onRepostSuccess={() => {}}
                onDeleteSuccess={() => {
                  pageRef.current = 1;
                  setHasMoreValue(true);
                  fetchFeedData(true);
                }}
                onPostInteraction={handlePostInteraction}
              />
            );
          })}
        </InfiniteScroll>
      </div>
    </div>
  );
}
